import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { OfferDraft } from "@/lib/domain/types";

/**
 * Reads a market-operation notice (Trésor communiqué, arrangeur teaser, a
 * forwarded photo of a screen…) into structured offer fields. The desk always
 * reviews the result: this is a draft, never a publication.
 */

const MODEL = "claude-opus-5";

const Conf = z.enum(["sure", "check", "missing"]);

const Extraction = z.object({
  kind: z.enum(["OTA", "BTA", "ACTIONS", "APE", "RACHAT"]).nullable().describe("Instrument. OTA = Obligations du Trésor Assimilables (coupon annuel). BTA = Bons du Trésor Assimilables (intérêts précomptés). ACTIONS = actions / IPO / augmentation de capital. APE = emprunt obligataire par appel public à l'épargne. RACHAT = rachat de titres par l'émetteur."),
  operation: z.enum(["nouvelle_ligne", "abondement", "rachat", "ipo", "emprunt_ape"]).nullable(),
  country: z.enum(["RCA", "Congo", "Cameroun", "Gabon", "Tchad", "Guinée éq."]).nullable(),
  countryName: z.string().nullable().describe("Ex. « République du Congo »"),
  issuer: z.string().nullable().describe("Ex. « Trésor public de la République du Congo » ou la société émettrice"),
  isin: z.string().nullable().describe("Code émission / ISIN, ex. CG2L00000012"),
  sourceRef: z.string().nullable().describe("Numéro et date du communiqué, ex. « n° 000473/MFBPP du 11 sept. 2026 »"),
  nominal: z.number().nullable().describe("Valeur nominale unitaire en FCFA (10 000 pour une OTA, 1 000 000 pour un BTA, prix par action pour une IPO)"),
  couponRate: z.number().nullable().describe("Taux du coupon annuel en % (OTA / APE)"),
  precountRate: z.number().nullable().describe("Taux précompté en % si indiqué (BTA) — souvent fixé à l'adjudication, alors null"),
  maturityOn: z.string().nullable().describe("Échéance, ISO YYYY-MM-DD"),
  lastCouponOn: z.string().nullable().describe("Date du dernier coupon versé pour un abondement (échéance moins N années), ISO YYYY-MM-DD ; null pour une ligne nouvelle"),
  opensAt: z.string().nullable().describe("Ouverture de la souscription, ISO datetime local (IPO / APE) ; null pour une adjudication"),
  deadlineAt: z.string().nullable().describe("Date limite de dépôt des offres, ISO datetime local YYYY-MM-DDTHH:MM ; si l'heure manque, 12:00 pour une adjudication"),
  resultsAt: z.string().nullable().describe("Annonce des résultats, ISO datetime local"),
  settleOn: z.string().nullable().describe("Date de règlement / valeur, ISO YYYY-MM-DD"),
  sizeLabel: z.string().nullable().describe("Volume recherché, en clair, ex. « 10 Mds FCFA » ou « 7,5 à 10 Mds FCFA »"),
  pricePerShare: z.number().nullable(),
  minShares: z.number().nullable(),
  sharesOffered: z.number().nullable(),
  dividendPerShare: z.number().nullable(),
  title: z.string().nullable().describe("Titre court pour la fiche, ex. « OTA 6,00 % · 31 mars 2028 » ou « BTA 52 semaines · 16 sept. 2027 »"),
  blurb: z.string().nullable().describe("Deux phrases neutres décrivant la ligne pour un client, sans prix ni recommandation"),
  official: z.boolean().describe("true si la source est un communiqué ou une note officielle (en-tête, numéro, signature) ; false pour une photo d'écran, un message transféré, une capture"),
  confidence: z.object({
    kind: Conf, operation: Conf, country: Conf, issuer: Conf, isin: Conf, nominal: Conf, couponRate: Conf, precountRate: Conf,
    maturityOn: Conf, lastCouponOn: Conf, opensAt: Conf, deadlineAt: Conf, resultsAt: Conf, settleOn: Conf, sizeLabel: Conf,
  }).describe("sure = lu tel quel dans la source ; check = déduit ou ambigu (à vérifier) ; missing = absent"),
  remarks: z.array(z.string()).describe("Points à signaler au desk : champs déduits, incohérences, heure limite absente, source non officielle…"),
});

const SYSTEM = `Tu lis des communiqués d'opérations de marché de la zone CEMAC (Trésors publics du Cameroun, Congo, Gabon, RCA, Tchad, Guinée équatoriale ; BVMAC ; arrangeurs) pour une société de bourse.
Extrais les caractéristiques de l'opération avec rigueur :
- Ne jamais inventer : si une information manque, mets null et confidence « missing ».
- Une valeur déduite (ex. dernier coupon = échéance − n années ; heure limite absente → 12:00) prend confidence « check » et une remarque.
- Les dates sont en ISO. Les heures sont locales (Afrique centrale).
- « Abondement » = réouverture d'une ligne existante (code émission déjà existant, durée résiduelle) ; « nouvelle ligne » = émission d'une ligne nouvelle ; un tableau « lignes à racheter » décrit des RACHAT (un par ligne).
- Si le document contient plusieurs lignes, extrais la ligne principale demandée dans la consigne, sinon la première ; signale les autres dans remarks.
- Ne propose jamais de prix ni de rendement : le desk les fixe.`;

export type ExtractionInput =
  | { kind: "text"; text: string; hint?: string }
  | { kind: "pdf"; base64: string; hint?: string }
  | { kind: "image"; base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; hint?: string };

export const extractionAvailable = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

/** Empty draft with every field flagged missing — what the desk gets without an API key. */
export function emptyDraft(official = false): OfferDraft {
  return { confidence: {}, official, remarks: extractionAvailable() ? [] : ["Extraction automatique désactivée (ANTHROPIC_API_KEY absente) : renseignez les champs à la main."] };
}

export async function extractOffer(input: ExtractionInput): Promise<{ draft: OfferDraft; seconds: number }> {
  const t0 = Date.now();
  const client = new Anthropic();
  const instruction = `Extrais l'opération décrite dans ce document.${input.hint ? ` Consigne du desk : ${input.hint}` : ""}`;
  const content: Anthropic.ContentBlockParam[] =
    input.kind === "text"
      ? [{ type: "text", text: `<document>\n${input.text}\n</document>\n\n${instruction}` }]
      : input.kind === "pdf"
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: input.base64 } }, { type: "text", text: instruction }]
        : [{ type: "image", source: { type: "base64", media_type: input.mediaType, data: input.base64 } }, { type: "text", text: instruction }];

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(Extraction) },
  });

  if (response.stop_reason === "refusal") throw new Error("Extraction refusée par le modèle.");
  const out = response.parsed_output;
  if (!out) throw new Error("Réponse d'extraction illisible.");

  const nn = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
  const draft: OfferDraft = {
    kind: nn(out.kind),
    operation: nn(out.operation),
    country: nn(out.country),
    countryName: nn(out.countryName),
    issuer: nn(out.issuer),
    isin: nn(out.isin),
    sourceRef: nn(out.sourceRef),
    nominal: nn(out.nominal),
    couponRate: nn(out.couponRate),
    precountRate: nn(out.precountRate),
    maturityOn: nn(out.maturityOn),
    lastCouponOn: out.lastCouponOn,
    opensAt: nn(out.opensAt),
    deadlineAt: nn(out.deadlineAt),
    resultsAt: nn(out.resultsAt),
    settleOn: nn(out.settleOn),
    sizeLabel: nn(out.sizeLabel),
    pricePerShare: nn(out.pricePerShare),
    minShares: nn(out.minShares),
    sharesOffered: nn(out.sharesOffered),
    dividendPerShare: nn(out.dividendPerShare),
    title: nn(out.title),
    blurb: nn(out.blurb),
    confidence: out.confidence,
    official: out.official,
    remarks: out.remarks,
  };
  return { draft, seconds: Math.round((Date.now() - t0) / 1000) };
}
