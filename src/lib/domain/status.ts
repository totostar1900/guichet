import type { DisplayStatus, Offer } from "./types";
import { amortCalc, type AmortInput, bondCalc, type BondInput, btaCalc, parseDate, yearsBetween } from "../finance";
import { localIso } from "../format";
import { enabledTypes, getRegistry, typeOf, type MarketSegment, type ProductType } from "@/lib/registry";
export type { MarketSegment } from "@/lib/registry";

/** Bond schedule on file for an ISIN (desk-editable reference data). */
export const bondTerms = (isin: string) => getRegistry().bondTerms.get(isin);

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  quoted: "Cotée",
  on_request: "Sur demande",
  upcoming: "À venir",
  open: "Ouverte",
  closing: "Clôture imminente",
  closed: "Clôturée",
  results: "Résultats publiés",
  live: "En vie",
  matured: "Échue",
};

/** Pill text: a distributed fund is « ouvert à la souscription », not « coté ». */
export function statusLabel(o: Offer, s: DisplayStatus): string {
  if (o.kind === "FONDS" && s === "quoted") return "Souscription ouverte";
  if (s === "results" && !o.resultLine && !o.servedPricePct) return "Clôturée";
  return STATUS_LABEL[s];
}

export const CLOSING_WINDOW_MS = 6 * 3600 * 1000;

/** What the client sees, derived from stored status + clock. */
export function displayStatus(o: Offer, now: Date = new Date()): DisplayStatus {
  if (o.kind === "MARCHE") return o.status === "withdrawn" ? "matured" : "quoted";
  if (o.kind === "FONDS") return o.status === "withdrawn" ? "matured" : o.fund?.distributed && !o.hidden ? "quoted" : "on_request";
  if (o.status === "live") return "live";
  if (o.status === "matured") return "matured";
  if (o.status === "results") return "results";
  const opens = parseDate(o.opensAt);
  const deadline = parseDate(o.deadlineAt);
  if (opens > now) return "upcoming";
  if (deadline <= now) {
    return o.resultsAt && parseDate(o.resultsAt) <= now ? "results" : "closed";
  }
  if (deadline.getTime() - now.getTime() < CLOSING_WINDOW_MS) return "closing";
  return "open";
}

export const PAST_STATUSES: DisplayStatus[] = ["closed", "results", "live", "matured"];
export function isPast(s: DisplayStatus): boolean {
  return PAST_STATUSES.includes(s);
}
export function isActionable(s: DisplayStatus): boolean {
  return s === "open" || s === "closing" || s === "upcoming" || s === "quoted";
}

/** "2 h 30", "1 j 4 h", or "clôturée". */
export function countdown(toIso: string, now: Date = new Date()): string {
  const ms = parseDate(toIso).getTime() - now.getTime();
  if (ms <= 0) return "clôturée";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h < 24) return `${h} h ${String(m).padStart(2, "0")}`;
  const d = Math.floor(h / 24);
  return `${d} j ${h % 24} h`;
}

/** Remaining life in years (0 for equities). */
export function tenorYears(o: Offer): number {
  if (!o.maturityOn) return 0;
  return yearsBetween(o.settleOn, o.maturityOn);
}

/**
 * A listed bond bought today: settlement T+3, and : the BOC prints clean prices
 * the buyer pays the coupon accrued since the last anniversary of the maturity
 * date. Without this a bond at par would show a yield far above its coupon.
 */
/** Repayment schedule of a listed bond when its fiche signalétique is on file; settlement T+3 from today. */
export function marketAmortInput(o: Offer, now = new Date()): AmortInput | null {
  const t = bondTerms(o.isin);
  if (!t || o.instrument !== "obligation" || o.couponRate == null) return null;
  const settle = new Date(now);
  settle.setDate(settle.getDate() + (o.settlementDays ?? 3));
  return { nominal: o.nominal, couponRate: o.couponRate, settleOn: localIso(settle), maturityOn: t.maturityOn, periodsPerYear: t.periodsPerYear, graceUntil: t.graceUntil, commissionPct: o.commissionPct };
}

/** True when the BOC's year is all we know about the maturity (no fiche on file). */
export const maturityIsGuess = (o: Offer): boolean => o.kind === "MARCHE" && o.instrument === "obligation" && !bondTerms(o.isin) && o.priceSource !== "desk" && Boolean(o.maturityOn?.endsWith("-12-31"));

export function marketBondInput(o: Offer, now = new Date()): BondInput | null {
  if (o.instrument !== "obligation" || o.couponRate == null || !o.maturityOn) return null;
  const settle = new Date(now);
  settle.setDate(settle.getDate() + (o.settlementDays ?? 3));
  const settleOn = localIso(settle);
  let last = o.lastCouponOn ?? undefined;
  if (!last) {
    const d = parseDate(o.maturityOn);
    while (localIso(d) > settleOn) d.setFullYear(d.getFullYear() - 1);
    last = localIso(d);
  }
  return { nominal: o.nominal, couponRate: o.couponRate, settleOn, maturityOn: o.maturityOn, lastCouponOn: last, commissionPct: o.commissionPct };
}

/**
 * What the Guichet prints as « rendement ». For a bond bought at par (±0,05 %)
 * the nominal rate: the actuarial yield would differ by a few basis points of
 * pure day-count convention and read as a second, contradictory number next to
 * the coupon in the instrument's name. Away from par, the actuarial yield is
 * the only honest figure. `approx` flags a maturity known by its year only.
 */
export function displayYield(o: Offer): { pct: number | null; atPar: boolean; approx: boolean } {
  const isBond = o.kind === "OTA" || o.kind === "APE" || (o.kind === "MARCHE" && o.instrument === "obligation");
  // A listed bond past its maturity is still printed by the BOC for a while: nothing to earn.
  if (o.kind === "MARCHE" && isBond && o.maturityOn && o.maturityOn < localIso(new Date())) return { pct: null, atPar: false, approx: false };
  if (isBond && o.couponRate != null) {
    const price = o.kind === "MARCHE" ? (o.ask ?? o.lastPrice) : (o.servedPricePct ?? o.pricePct);
    if (price != null && Math.abs(price - 100) <= 0.05) return { pct: o.couponRate, atPar: true, approx: false };
  }
  return { pct: headlineYield(o), atPar: false, approx: maturityIsGuess(o) };
}

/** The single number on the card. Null when nothing sensible exists (buybacks). */
export function headlineYield(o: Offer): number | null {
  switch (o.kind) {
    case "OTA":
    case "APE": {
      if (o.couponRate == null || !o.maturityOn) return null;
      const price = o.servedPricePct ?? o.pricePct ?? 100;
      return bondCalc(
        { nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn },
        o.nominal * 1000,
        price,
      ).irr;
    }
    case "BTA": {
      if (o.precountRate == null || !o.maturityOn) return null;
      return btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, o.nominal, o.precountRate).yieldPct;
    }
    case "ACTIONS":
      if (!o.dividendPerShare || !o.pricePerShare) return null;
      return (o.dividendPerShare / o.pricePerShare) * 100;
    case "MARCHE": {
      if (o.instrument === "obligation" && o.lastPrice != null) {
        const a = marketAmortInput(o);
        if (a) return a.maturityOn > a.settleOn ? amortCalc(a, o.nominal * 1000, o.ask ?? o.lastPrice).irr : null;
        const b = marketBondInput(o);
        if (!b || b.maturityOn <= b.settleOn) return null;
        // Only the year of maturity is printed in the BOC: with less than a year left the
        // guess (31/12) swings the yield by tens of points : better no figure than a wrong one.
        if (maturityIsGuess(o) && yearsBetween(b.settleOn, b.maturityOn) < 1) return null;
        return bondCalc(b, o.nominal * 1000, o.ask ?? o.lastPrice).irr;
      }
      if (o.instrument === "action" && o.dividendPerShare && o.lastPrice) return (o.dividendPerShare / o.lastPrice) * 100;
      return null;
    }
    default:
      return null;
  }
}

export const KIND_LABEL: Record<Offer["kind"], string> = {
  OTA: "OTA",
  BTA: "BTA",
  ACTIONS: "Actions",
  APE: "Obligations APE",
  RACHAT: "Rachat",
  MARCHE: "Marché secondaire",
  FONDS: "OPCVM",
};

/**
 * What the client actually buys, finer than `kind`: a listed share and a listed
 * bond are both MARCHE offers but read very differently. Each family belongs to
 * one market segment : primary (new paper), secondary (already listed) or funds.
 */
export type OfferFamily = string; // a product-type key
export const offerFamily = (o: Pick<Offer, "kind" | "instrument" | "typeKey">): OfferFamily => typeOf(o).key;
export const familyType = (key: string): ProductType => typeOf({ kind: "OTA", typeKey: key });
export const familyLabel = (key: string): string => familyType(key).label;
export const familyShort = (key: string): string => familyType(key).short;
export const familySegment = (key: string): MarketSegment => familyType(key).segment;
export const FAMILIES = (): string[] => enabledTypes().map((x) => x.key);
export const SEGMENT_LABEL: Record<MarketSegment, string> = { primaire: "Marché primaire", secondaire: "Marché secondaire", fonds: "Gestion collective" };
export const SEGMENT_HINT: Record<MarketSegment, string> = {
  primaire: "Titres neufs : vous souscrivez auprès de l'émetteur (Trésor, entreprise) pendant une fenêtre, à un prix fixé par adjudication ou par le desk.",
  secondaire: "Titres déjà cotés à la BVMAC : vous achetez ou vendez à un autre investisseur, au cours du jour, en séance.",
  fonds: "Parts de fonds communs de placement : vous souscrivez ou rachetez à la prochaine valeur liquidative.",
};

export const OPERATION_LABEL: Record<Offer["operation"], string> = {
  nouvelle_ligne: "Nouvelle ligne",
  abondement: "Abondement",
  rachat: "Rachat par le Trésor",
  ipo: "IPO",
  emprunt_ape: "Emprunt obligataire",
  secondaire: "Cotation",
  opcvm: "Fonds commun de placement",
};
