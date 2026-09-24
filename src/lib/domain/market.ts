/**
 * Market data ingested from the BVMAC « Bulletin Officiel de la Cote » (BOC).
 * One bulletin per trading session; one quote per listed line per session;
 * one NAV row per fund per valuation date. Nothing here is typed by the desk.
 */

export interface MarketBulletin {
  id: string; // = session date YYYY-MM-DD
  number: number; // BOC n°
  sessionDate: string; // YYYY-MM-DD
  sourceUrl?: string;
  fileKey?: string; // stored PDF (audit trail)
  ingestedAt: string; // ISO
  ingestedBy: "cron" | "desk";
  status: "ok" | "partiel" | "echec";
  indexValue?: number;
  indexVariationPct?: number;
  counts: { equities: number; bonds: number; funds: number };
  warnings: string[]; // parser: what could not be read
  anomalies: string[]; // validation: what was read but looks wrong
  notices: string[]; // avis (amortissements, paiements d'intérêts, résultats d'APE…)
}

/**
 * Une séance où la ligne s'est réellement échangée.
 *
 * Le bulletin donne des volumes pour les actions et rien pour les
 * obligations : pour celles-ci le code de séance est la seule preuve, et
 * « NC » est celui qui dit qu'aucun prix ne s'est formé. C'est une preuve
 * plus faible que des titres comptés, et le texte l'assume : une obligation
 * annonce une « dernière séance cotée », une action une « dernière
 * transaction » avec ses titres.
 *
 * La distinction compte parce que le BOC imprime une clôture pour chaque
 * ligne à chaque séance, échangée ou non. « Cours 97,00 % du 9 sept. » se lit
 * comme « elle a traité le 9 septembre » alors qu'elle peut n'avoir rien
 * traité depuis mai.
 */
export const tradedSession = (q: Pick<Quote, "volumeTraded" | "trades" | "status">): boolean => q.volumeTraded > 0 || q.trades > 0 || (q.status !== "" && q.status !== "NC");

export interface Quote {
  isin: string;
  sessionDate: string; // YYYY-MM-DD
  bulletinNo: number;
  instrument: "action" | "obligation";
  mnemo: string;
  issuer: string;
  designation: string; // title as printed in the bulletin
  segment?: "etats" | "regionales" | "privees";
  previousClose: number; // FCFA (actions) or % of nominal (obligations)
  previousDate: string;
  open: number;
  close: number;
  thresholdHigh: number;
  thresholdLow: number;
  variationPct: number;
  referenceNext: number; // FCFA
  volumeTraded: number;
  valueTraded: number;
  trades: number;
  status: string; // NC, PEq…
  nominalRemaining?: number; // obligations, FCFA per bond at J+3
  accruedCoupon?: number; // obligations, FCFA per bond at J+3
  ytdVariationPct?: number | null;
  // equities : from the bulletin's capitalisation table
  sharesFloat?: number;
  sharesTotal?: number;
  lastDividend?: number; // FCFA gross per share
  dividendYear?: number;
  dividendDate?: string;
  liquidity3mPct?: number;
  eps?: number;
  marketCapFloat?: number;
  marketCapTotal?: number;
}

export interface FundNav {
  fundKey: string; // slug of the name, stable across bulletins
  name: string;
  manager: string;
  depositary: string;
  category: "M" | "O" | "D" | "A" | "?";
  frequency: "quotidienne" | "hebdomadaire" | "mensuelle" | "trimestrielle" | "?";
  navDate: string; // YYYY-MM-DD
  nav: number;
  previousNav?: number;
  previousDate?: string;
  navOrigin: number;
  inceptionDate: string;
  perfSinceInceptionPct: number;
  variationPct?: number;
  variationMonthlyPct?: number;
  variationQuarterlyPct?: number;
  bulletinNo: number;
  sessionDate: string;
}

/** A document published by a listed company on the BVMAC site, and our archived copy. */
export interface IssuerDocument {
  id?: string;
  mnemo: string;
  kind: string;
  year?: number;
  title: string;
  sourceUrl: string;
  fileKey?: string;
  bytes?: number;
  hasText?: boolean;
  collectedAt: string;
}

export const FUND_CATEGORY_LABEL: Record<FundNav["category"], string> = { M: "Monétaire", O: "Obligataire", D: "Diversifié", A: "Actions", "?": "—" };
export const FUND_FREQUENCY_LABEL: Record<FundNav["frequency"], string> = { quotidienne: "VL quotidienne", hebdomadaire: "VL hebdomadaire", mensuelle: "VL mensuelle", trimestrielle: "VL trimestrielle", "?": "" };
export const SEGMENT_LABEL: Record<NonNullable<Quote["segment"]>, string> = { etats: "Obligations d'État", regionales: "Institutions régionales", privees: "Obligations privées" };

/** Stable key for a fund from its printed name ("FCP ASCA LIQUIDITÉS" → "fcp-asca-liquidites"). */
export const fundKey = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
