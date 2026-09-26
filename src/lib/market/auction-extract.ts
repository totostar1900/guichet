import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { millions, type NewAuctionResult } from "./auction-results";

/**
 * Lire un communiqué de résultats, pour que quelqu'un n'ait plus qu'à vérifier.
 *
 * Deux cent cinquante-trois séances dorment dans l'index de la BEAC, sur sept
 * ans et six Trésors. Chacune est un scan : rien n'y est sélectionnable, le taux
 * se lit en petits caractères, parfois de travers, parfois sous un tampon. À
 * deux ou trois minutes la pièce, reprendre l'historique à la main coûte une
 * dizaine d'heures de desk, et un desk de deux personnes ne les a pas. Sans
 * lecture assistée, la table restera à dix lignes et toute analyse restera une
 * intention.
 *
 * La machine propose donc, et une personne arrête. Cette distinction n'est pas
 * une formule : ce qui sort d'ici n'est écrit nulle part. C'est une proposition
 * affichée dans les champs, que le desk compare à la pièce ouverte à côté, et
 * rien n'entre en base avant qu'il n'enregistre, ni ne fait référence avant
 * qu'il ne confirme. Un chiffre lu de travers qui deviendrait la référence se
 * propagerait sans bruit à toutes les offres suivantes ; c'est le seul risque
 * qui compte ici, et c'est contre lui que l'écran est construit.
 *
 * Deux choix de méthode.
 *
 *   Les montants sont recopiés tels qu'imprimés, avec l'unité lue à côté, et la
 *   conversion se fait dans le code. Demander « donne-moi des francs » ferait
 *   faire une multiplication à un lecteur, et une multiplication fausse ne se
 *   voit pas en relisant la pièce : le chiffre aurait l'air juste.
 *
 *   Ce qui n'est pas imprimé reste vide. Tous les Trésors ne publient pas les
 *   mêmes colonnes, et un blanc se voit alors qu'une valeur déduite se confond
 *   avec une valeur lue.
 */

/**
 * Le modèle qui lit, et pourquoi il se choisit de l'extérieur.
 *
 * Deux cent cinquante-trois communiqués à reprendre : à ce volume, le choix du
 * modèle cesse d'être un détail de mise en œuvre pour devenir une ligne de
 * dépense. Or la tâche d'ici est étroite. Recopier les nombres d'un tableau
 * imprimé n'a pas grand-chose à voir avec lire un communiqué entier pour en
 * tirer une offre, qui demande de comprendre un instrument, un calendrier et un
 * barème, et c'est de cet extracteur-là que le réglage a été hérité.
 *
 * On ne tranche pas à l'avance : le modèle se pose par « AUCTION_READ_MODEL »,
 * la même pièce se lit avec l'un puis avec l'autre, et les deux lectures se
 * comparent à une transcription faite à la main. Ce qui compte n'est pas le
 * nombre de champs justes mais la nature des écarts : un taux limite pris pour
 * un taux moyen pondéré coûte plus cher que tout ce qu'on aurait économisé.
 *
 * Sans la variable, le modèle ne bouge pas : une valeur par défaut ne se change
 * pas sur une intuition de coût.
 */
const MODEL = process.env.AUCTION_READ_MODEL || "claude-opus-5";

const SYSTEM = `Tu lis des communiqués de résultats d'adjudication de titres publics de la CEMAC (BEAC, Trésors du Cameroun, Congo, Gabon, Guinée équatoriale, RCA, Tchad).

Ce sont des documents scannés. Tu recopies ce qui est imprimé, tu ne calcules rien et tu ne déduis rien.

Règles :
- Un champ qui n'est pas imprimé reste null. Ne remplis jamais un blanc par une déduction, une moyenne ou un ordre de grandeur.
- Les montants : donne le nombre tel qu'il est imprimé dans le tableau, et indique séparément l'unité annoncée par le document (« en millions de FCFA » en tête de tableau, le plus souvent). Ne convertis pas.
- BTA : des taux, en pourcentage, précomptés. OTA : des prix, en pourcentage du nominal. Un document ne porte que l'une des deux familles ; laisse l'autre entièrement à null.
- Le taux (ou prix) « limite » est celui auquel le Trésor a arrêté l'adjudication ; le « moyen pondéré » est la moyenne des soumissions servies. Ne confonds pas les deux, et ne recopie pas l'un dans l'autre s'il en manque un.
- Les libellés « minimum » et « maximum » sont parfois inversés par le Trésor lui-même : un « prix maximum proposé » de 90,00 % au-dessus d'un « prix minimum proposé » de 97,00 % arrive. Recopie chaque nombre dans le champ où il est imprimé, sans le corriger ni les échanger : la remise en ordre se fait ailleurs, et ta fidélité à la pièce est ce qui permet de la faire.
- La durée s'écrit « 13 semaines », « 26 semaines », « 52 semaines », « 2 ans », « 3 ans »… au pluriel sauf « mois ».
- Le code d'émission ressemble à CG1300001480, CM1200002465, GQ2J00000081.
- Si le document couvre plusieurs lignes, lis celle que la consigne désigne, et signale les autres dans remarks.
- Signale dans remarks tout ce qui gênerait une relecture : chiffre illisible, tampon, colonne absente, unité inhabituelle, incohérence entre deux chiffres du document.`;

const Amount = z.number().nullable();
const Pct = z.number().nullable();

const Lecture = z.object({
  codeEmission: z.string().nullable().describe("Code émission du Trésor, ex. CG1300001480"),
  country: z.enum(["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."]).nullable(),
  instrument: z.enum(["BTA", "OTA"]).nullable(),
  tenor: z.string().nullable().describe("Durée normalisée, ex. « 26 semaines » ou « 3 ans »"),
  sessionOn: z.string().nullable().describe("Date de la séance d'adjudication, ISO YYYY-MM-DD"),
  abondement: z.boolean().nullable().describe("true si le document dit qu'il s'agit d'un abondement (réouverture d'une ligne existante)"),
  amountsUnit: z.enum(["millions", "milliers", "francs"]).nullable().describe("Unité dans laquelle le tableau des montants est libellé, telle que le document l'annonce"),
  announced: Amount.describe("Montant annoncé par le Trésor, tel qu'imprimé"),
  bid: Amount.describe("Total des soumissions reçues, tel qu'imprimé"),
  served: Amount.describe("Total servi / retenu, tel qu'imprimé"),
  networkSize: z.number().nullable().describe("Nombre de SVT du réseau"),
  bidders: z.number().nullable().describe("Nombre de SVT ayant soumissionné"),
  rateMin: Pct,
  rateMax: Pct,
  rateLimit: Pct.describe("Taux limite (BTA)"),
  rateAvg: Pct.describe("Taux moyen pondéré (BTA)"),
  priceMin: Pct,
  priceMax: Pct,
  priceLimit: Pct.describe("Prix limite en % du nominal (OTA)"),
  priceAvg: Pct.describe("Prix moyen pondéré en % du nominal (OTA)"),
  coverage: Pct.describe("Taux de couverture en %, tel qu'imprimé ; null s'il n'est pas imprimé"),
  remarks: z.array(z.string()).describe("Ce qui gênerait une relecture : chiffre illisible, colonne absente, unité inhabituelle, plusieurs lignes dans le document"),
});

/**
 * Deux bornes remises dans leur ordre, et le dire.
 *
 * Le Trésor congolais imprime « Prix maximum proposé 90,00 % » et « Prix
 * minimum proposé 97,00 % » : ses deux libellés sont inversés par rapport aux
 * nombres, systématiquement, sur toute sa série d'obligations. Vérifié sur les
 * pièces du 21 juillet 2026 : le 4 ans porte max 90 / min 93, le 3 ans max 90 /
 * min 97, et dans les deux cas la fourchette réelle des soumissions va du plus
 * petit au plus grand des deux.
 *
 * La lecture reste littérale : les deux nombres sont ceux de la pièce, aucun
 * n'est corrigé. Ce qui change est la case où ils tombent, et ces cases sont
 * les nôtres : « priceMin » doit contenir le plus petit prix, sans quoi notre
 * propre colonne ment et toute fourchette tracée dessus part à l'envers.
 *
 * La remarque garde la trace de l'écart, parce que le desk relit la pièce à
 * côté de l'écran et doit comprendre pourquoi les deux ne se ressemblent pas.
 */
export const ordonner = (min: number | undefined, max: number | undefined, quoi: string, remarks: string[]): [number | undefined, number | undefined] => {
  if (min == null || max == null || min <= max) return [min, max];
  remarks.unshift(`La pièce annonce un ${quoi} « minimum » de ${min} supérieur à son « maximum » de ${max} : ses deux libellés sont inversés, et les deux bornes ont été remises dans leur ordre.`);
  return [max, min];
};
export const auctionReadingAvailable = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export interface AuctionReading {
  /** Le modèle qui a lu : sans lui, comparer deux lectures ne veut rien dire. */
  model: string;
  /** Ce qui est proposé aux champs. Rien n'est écrit : c'est le desk qui enregistre. */
  proposal: Partial<NewAuctionResult>;
  remarks: string[];
  seconds: number;
}

/**
 * Les montants imprimés, ramenés en francs une fois, dans le code.
 *
 * Le communiqué annonce son unité en tête de tableau, presque toujours
 * « en millions de FCFA ». On recopie le nombre tel qu il est imprimé et on
 * multiplie ici : demander la conversion au lecteur lui ferait faire une
 * multiplication, et une multiplication fausse ne se voit pas en relisant la
 * pièce, puisque le chiffre aurait l air juste.
 */
export const toFrancs = (v: number | null, unit: "millions" | "milliers" | "francs" | null): number | undefined => {
  if (v == null) return undefined;
  if (unit === "millions") return millions(v);
  if (unit === "milliers") return v * 1_000;
  return v;
};

const nn = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

export async function readAuctionResult(pdfBase64: string, hint?: string): Promise<AuctionReading> {
  const t0 = Date.now();
  const client = new Anthropic();
  const requete = (reflechi: boolean) => ({
    model: MODEL,
    max_tokens: 8000,
    ...(reflechi ? { thinking: { type: "adaptive" as const } } : {}),
    system: SYSTEM,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: pdfBase64 } },
          { type: "text" as const, text: `Lis les résultats de cette séance.${hint ? ` Consigne du desk : ${hint}` : ""}` },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Lecture) },
  });

  /**
   * La réflexion adaptative, quand le modèle la prend.
   *
   * Le réglage vient de l'extracteur de communiqués, qui tourne sur un modèle
   * qui l'accepte. Posé sur un modèle économique, l'appel est refusé d'emblée :
   * « adaptive thinking is not supported on this model ». Tenir une liste des
   * modèles qui l'acceptent vieillirait mal ; on essaie donc, et ce refus précis,
   * et lui seul, fait recommencer sans elle. Toute autre erreur remonte.
   */
  let response;
  try {
    response = await client.messages.parse(requete(true));
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (!/adaptive thinking is not supported/i.test(m)) throw e;
    response = await client.messages.parse(requete(false));
  }

  if (response.stop_reason === "refusal") throw new Error("Lecture refusée par le modèle.");
  const out = response.parsed_output;
  if (!out) throw new Error("Réponse de lecture illisible.");

  const remarks = [...out.remarks];
  if (out.amountsUnit && out.amountsUnit !== "millions" && (out.announced != null || out.bid != null || out.served != null)) {
    remarks.unshift(`Montants libellés en ${out.amountsUnit} sur la pièce, et non en millions : vérifiez l'ordre de grandeur.`);
  }
  if (out.amountsUnit == null && (out.announced != null || out.bid != null || out.served != null)) {
    remarks.unshift("Unité des montants non lue sur la pièce : ils sont repris tels quels, vérifiez l'ordre de grandeur.");
  }

  const [priceMin, priceMax] = ordonner(nn(out.priceMin), nn(out.priceMax), "prix", remarks);
  const [rateMin, rateMax] = ordonner(nn(out.rateMin), nn(out.rateMax), "taux", remarks);

  return {
    proposal: {
      codeEmission: nn(out.codeEmission),
      country: nn(out.country),
      instrument: nn(out.instrument),
      tenor: nn(out.tenor),
      sessionOn: nn(out.sessionOn),
      abondement: out.abondement ?? undefined,
      announced: toFrancs(out.announced, out.amountsUnit),
      bid: toFrancs(out.bid, out.amountsUnit),
      served: toFrancs(out.served, out.amountsUnit),
      networkSize: nn(out.networkSize),
      bidders: nn(out.bidders),
      rateMin,
      rateMax,
      rateLimit: nn(out.rateLimit),
      rateAvg: nn(out.rateAvg),
      priceMin,
      priceMax,
      priceLimit: nn(out.priceLimit),
      priceAvg: nn(out.priceAvg),
      coverage: nn(out.coverage),
    },
    remarks,
    model: MODEL,
    seconds: Math.round((Date.now() - t0) / 100) / 10,
  };
}

/**
 * Ce qui a empêché la lecture, dit au desk plutôt qu'au développeur.
 *
 * Les pannes d'ici ne se ressemblent pas et n'appellent pas la même chose : un
 * compte sans crédit se recharge, une clef refusée se remplace, un service
 * encombré s'attend. Dans les trois cas la conduite à tenir est la même pour la
 * séance en cours, et c'est elle qu'il faut dire : les chiffres se saisissent à
 * la main, la relecture n'est pas bloquée.
 */
export function readingTrouble(brut: string): string {
  const s = brut.toLowerCase();
  const main = "Les chiffres se saisissent à la main en attendant.";
  if (s.includes("credit balance") || s.includes("billing")) return `Le compte Anthropic n'a plus de crédit : la lecture automatique est suspendue. ${main}`;
  if (s.includes("401") || s.includes("authentication") || s.includes("invalid x-api-key")) return `La clef Anthropic n'est pas acceptée. ${main}`;
  if (s.includes("429") || s.includes("rate_limit")) return "Trop de lectures à la fois : réessayez dans un instant.";
  if (s.includes("overloaded") || s.includes("529") || s.includes("503")) return "Le service de lecture ne répond pas pour le moment : réessayez dans un instant.";
  if (s.includes("refusée par le modèle")) return `Le modèle a refusé de lire cette pièce. ${main}`;
  return `La lecture n'a pas abouti. ${main} Le détail est au journal.`;
}
