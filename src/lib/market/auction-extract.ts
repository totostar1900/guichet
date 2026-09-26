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

const MODEL = "claude-opus-5";

const SYSTEM = `Tu lis des communiqués de résultats d'adjudication de titres publics de la CEMAC (BEAC, Trésors du Cameroun, Congo, Gabon, Guinée équatoriale, RCA, Tchad).

Ce sont des documents scannés. Tu recopies ce qui est imprimé, tu ne calcules rien et tu ne déduis rien.

Règles :
- Un champ qui n'est pas imprimé reste null. Ne remplis jamais un blanc par une déduction, une moyenne ou un ordre de grandeur.
- Les montants : donne le nombre tel qu'il est imprimé dans le tableau, et indique séparément l'unité annoncée par le document (« en millions de FCFA » en tête de tableau, le plus souvent). Ne convertis pas.
- BTA : des taux, en pourcentage, précomptés. OTA : des prix, en pourcentage du nominal. Un document ne porte que l'une des deux familles ; laisse l'autre entièrement à null.
- Le taux (ou prix) « limite » est celui auquel le Trésor a arrêté l'adjudication ; le « moyen pondéré » est la moyenne des soumissions servies. Ne confonds pas les deux, et ne recopie pas l'un dans l'autre s'il en manque un.
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

export const auctionReadingAvailable = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export interface AuctionReading {
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
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: `Lis les résultats de cette séance.${hint ? ` Consigne du desk : ${hint}` : ""}` },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Lecture) },
  });

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
      rateMin: nn(out.rateMin),
      rateMax: nn(out.rateMax),
      rateLimit: nn(out.rateLimit),
      rateAvg: nn(out.rateAvg),
      priceMin: nn(out.priceMin),
      priceMax: nn(out.priceMax),
      priceLimit: nn(out.priceLimit),
      priceAvg: nn(out.priceAvg),
      coverage: nn(out.coverage),
    },
    remarks,
    seconds: Math.round((Date.now() - t0) / 100) / 10,
  };
}
