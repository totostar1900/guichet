import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { millions } from "./auction-results";
import type { NewEmissionNotice } from "./emission-notices";

/**
 * Lire un avis d'annonce, pour savoir comment le titre se rembourse.
 *
 * Le communiqué de résultats dit qui a acheté quoi et à quel prix. L'avis
 * d'annonce, publié une semaine avant la séance, dit ce qu'est le titre :
 * l'échéance, le taux facial, la valeur nominale, le volume émis, et surtout la
 * mention « Remboursement », qui décide de la façon dont un prix s'actualise.
 *
 * C'est un document beaucoup plus simple que le communiqué de résultats : une
 * liste de champs, sans tableau de soumissions, sans colonnes inversées, sans
 * la moitié des pièges qui ont demandé tant de règles à l'autre extracteur. La
 * consigne est donc courte, et ce qui reste vaut la peine d'être dit.
 *
 * Deux choses à ne pas laisser faire au modèle.
 *
 *   Le Trésor imprime le taux facial sous le libellé « Rendement », ce qu'il
 *   n'est pas : 6,20 % du nominal est un coupon, et le rendement d'un titre
 *   acheté à 90 sera tout autre. Un lecteur qui prend le mot au pied de la
 *   lettre remplit la mauvaise colonne, et l'erreur est invisible en aval
 *   puisque les deux sont des pourcentages plausibles.
 *
 *   La mention de remboursement se recopie mot pour mot. « In fine » tient en
 *   deux mots, mais un amortissement s'écrit en une phrase, et résumer cette
 *   phrase en un mot-clef jetterait précisément ce dont le desk a besoin pour
 *   comprendre l'échéancier.
 */

const MODEL = process.env.AUCTION_READ_MODEL || "claude-opus-5";

const SYSTEM = `Tu lis des communiqués d'annonce d'émission de titres publics de la CEMAC (Trésors du Cameroun, Congo, Gabon, Guinée équatoriale, RCA, Tchad).

Ce sont des documents scannés. Tu recopies ce qui est imprimé, tu ne calcules rien et tu ne déduis rien.

Règles :
- Un champ qui n'est pas imprimé reste null. Ne remplis jamais un blanc par une déduction.
- « Rendement : 6,20 % du nominal » est le TAUX FACIAL de l'emprunt, c'est-à-dire le coupon, et non un rendement de marché. Mets-le dans couponRate. Le mot « rendement » sur ces avis ne désigne jamais autre chose.
- « Remboursement » se recopie mot pour mot, dans la langue du document : « In fine », ou la phrase entière quand le Trésor décrit un amortissement par tranches, avec son éventuel différé. Ne résume pas, ne traduis pas, ne remplace pas par un mot-clef.
- Le code d'émission ressemble à CG2K00000187, CM1200002465, GQ2J00000081. Il est souvent suivi de la désignation, du taux et de l'échéance sur la même ligne : « CG2K00000187 OTA 4 ans 6,20% - 01 FEVR 2028 ».
- Les dates se recopient en ISO AAAA-MM-JJ.
- Les montants : donne le nombre tel qu'il est imprimé, et indique séparément l'unité annoncée par le document. « Volume d'émission (en millions de FCFA) : 15 000 » donne issueVolume 15000 et amountsUnit « millions ». Ne convertis pas.
- La valeur nominale unitaire est presque toujours imprimée en francs (10 000) et non en millions : c'est un champ à part, nominalUnit, et son unité est le franc.
- La durée s'écrit « 13 semaines », « 26 semaines », « 52 semaines », « 2 ans », « 3 ans »… au pluriel sauf « mois ».
- Signale dans remarks tout ce qui gênerait une relecture : champ illisible, tampon, mention de remboursement absente, plusieurs lignes dans le même avis, date incohérente.`;

const Lecture = z.object({
  codeEmission: z.string().nullable().describe("Code émission du Trésor, ex. CG2K00000187"),
  instrument: z.enum(["BTA", "OTA"]).nullable(),
  tenor: z.string().nullable().describe("Durée normalisée, ex. « 26 semaines » ou « 4 ans »"),
  maturityOn: z.string().nullable().describe("Échéance, ISO AAAA-MM-JJ"),
  couponRate: z.number().nullable().describe("Le taux facial en % annuel, imprimé sous « Rendement : X % du nominal ». C'est un coupon, pas un rendement de marché."),
  redemption: z.string().nullable().describe("La mention « Remboursement » recopiée mot pour mot : « In fine », ou la phrase décrivant l'amortissement. Jamais résumée."),
  nominalUnit: z.number().nullable().describe("Valeur nominale unitaire en FCFA, ex. 10000. En francs, jamais en millions."),
  issueVolume: z.number().nullable().describe("Volume d'émission, tel qu'imprimé, sans conversion"),
  amountsUnit: z.enum(["millions", "milliers", "francs"]).nullable().describe("Unité dans laquelle le volume d'émission est libellé, telle que le document l'annonce"),
  settleOn: z.string().nullable().describe("Date de règlement, ISO AAAA-MM-JJ"),
  abondement: z.boolean().nullable().describe("true si l'avis dit que l'émission se fait par abondement (réouverture d'une ligne existante)"),
  remarks: z.array(z.string()).describe("Ce qui gênerait une relecture"),
});

export interface NoticeReading {
  model: string;
  proposal: Partial<NewEmissionNotice>;
  remarks: string[];
  seconds: number;
}

const nn = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const toFrancs = (v: number | null, unit: "millions" | "milliers" | "francs" | null): number | undefined =>
  v == null ? undefined : unit === "millions" ? millions(v) : unit === "milliers" ? v * 1_000 : v;

/** Une date ISO, ou rien. Une chaîne qui n'est pas une date ne doit pas atteindre une colonne date. */
const isoDate = (v: string | null): string | undefined => (v && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) && !Number.isNaN(Date.parse(v)) ? v.trim() : undefined);

export async function readEmissionNotice(pdfBase64: string, hint?: string, modele?: string): Promise<NoticeReading> {
  const t0 = Date.now();
  const client = new Anthropic();
  const choisi = modele ?? MODEL;
  const requete = (reflechi: boolean) => ({
    model: choisi,
    max_tokens: 4000,
    ...(reflechi ? { thinking: { type: "adaptive" as const } } : {}),
    system: SYSTEM,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: pdfBase64 } },
          { type: "text" as const, text: `Lis les modalités de cet emprunt.${hint ? ` Consigne du desk : ${hint}` : ""}` },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(Lecture) },
  });

  // Même repli que pour les résultats : la réflexion adaptative est refusée
  // d'emblée par les modèles économiques, et ce refus précis, et lui seul, fait
  // recommencer sans elle.
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

  /**
   * Un coupon de la zone vit entre un et vingt pour cent.
   *
   * Le libellé « Rendement » de ces avis invite à y ranger autre chose, et une
   * valeur aberrante traverserait toute la chaîne sans surprendre : elle est
   * bien un nombre, bien dans la bonne colonne, et elle deviendrait un
   * rendement de courbe. Le nombre n'est pas perdu, il part en remarque.
   */
  let couponRate = nn(out.couponRate);
  if (couponRate != null && (couponRate < 1 || couponRate > 20)) {
    remarks.unshift(`Le taux facial lu vaut ${couponRate}, hors de toute échelle pour la zone : le champ reste vide en attendant votre lecture.`);
    couponRate = undefined;
  }

  /**
   * La valeur nominale dépend de l'instrument, et de lui seul.
   *
   * Les six Trésors de la zone émettent leurs bons à un million de francs
   * l'unité et leurs obligations à dix mille, sans exception relevée à ce jour.
   * Une première version attendait dix mille partout et posait une remarque sur
   * quatre-vingt-cinq bons parfaitement ordinaires : un signal qu'on ne peut pas
   * éteindre cesse d'être lu.
   *
   * Ce qui reste signalé est un écart à l'usage de son propre instrument, parce
   * que toute conversion d'un prix imprimé en francs repose sur ce nombre.
   */
  const attendu = out.instrument === "BTA" ? 1_000_000 : out.instrument === "OTA" ? 10_000 : undefined;
  const nominalUnit = nn(out.nominalUnit);
  if (nominalUnit != null && attendu != null && nominalUnit !== attendu) {
    remarks.unshift(
      `Valeur nominale unitaire de ${nominalUnit.toLocaleString("fr-FR")} F, là où un ${out.instrument} de la zone s'émet à ${attendu.toLocaleString("fr-FR")} F : à vérifier sur la pièce, la conversion des prix en dépend.`,
    );
  }

  if (out.redemption == null) remarks.unshift("Aucune mention de remboursement lue sur l'avis : c'est pourtant ce que ce document est seul à porter.");

  return {
    model: choisi,
    proposal: {
      codeEmission: nn(out.codeEmission)?.trim(),
      instrument: nn(out.instrument) ?? undefined,
      tenor: nn(out.tenor) ?? undefined,
      maturityOn: isoDate(out.maturityOn),
      couponRate,
      redemption: nn(out.redemption)?.trim(),
      nominalUnit,
      issueVolume: toFrancs(out.issueVolume, out.amountsUnit),
      settleOn: isoDate(out.settleOn),
      abondement: nn(out.abondement) ?? undefined,
    },
    remarks,
    seconds: Math.round((Date.now() - t0) / 100) / 10,
  };
}
