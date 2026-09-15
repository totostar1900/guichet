import type { DisplayStatus, Offer } from "./types";
import { bondCalc, type BondInput, btaCalc, parseDate, yearsBetween } from "../finance";
import { localIso } from "../format";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  quoted: "Cotée",
  on_request: "Sur demande",
  upcoming: "À venir",
  open: "Ouverte",
  closing: "Clôture imminente",
  closed: "Clôturée",
  results: "Résultats",
  live: "En vie",
  matured: "Échue",
};

/** Pill text: a distributed fund is « ouvert à la souscription », not « coté ». */
export function statusLabel(o: Offer, s: DisplayStatus): string {
  if (o.kind === "FONDS" && s === "quoted") return "Souscription ouverte";
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
 * A listed bond bought today: settlement T+3, and — the BOC prints clean prices —
 * the buyer pays the coupon accrued since the last anniversary of the maturity
 * date. Without this a bond at par would show a yield far above its coupon.
 */
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
        const b = marketBondInput(o);
        if (!b || b.maturityOn <= b.settleOn) return null;
        // Only the year of maturity is printed in the BOC: with less than a year left the
        // guess (31/12) swings the yield by tens of points — better no figure than a wrong one.
        if (o.priceSource !== "desk" && o.maturityOn!.endsWith("-12-31") && yearsBetween(b.settleOn, b.maturityOn) < 1) return null;
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
 * one market segment — primary (new paper), secondary (already listed) or funds.
 */
export type OfferFamily = "OTA" | "BTA" | "APE" | "IPO" | "RACHAT" | "ACTION_COTEE" | "OBLIGATION_COTEE" | "OPCVM";
export type MarketSegment = "primaire" | "secondaire" | "fonds";

export function offerFamily(o: Pick<Offer, "kind" | "instrument">): OfferFamily {
  switch (o.kind) {
    case "OTA":
    case "BTA":
    case "APE":
    case "RACHAT":
      return o.kind;
    case "ACTIONS":
      return "IPO";
    case "FONDS":
      return "OPCVM";
    default:
      return o.instrument === "obligation" ? "OBLIGATION_COTEE" : "ACTION_COTEE";
  }
}

export const FAMILY_LABEL: Record<OfferFamily, string> = {
  OTA: "OTA — Obligations du Trésor",
  BTA: "BTA — Bons du Trésor",
  APE: "Emprunts obligataires (APE)",
  IPO: "Introductions en bourse",
  RACHAT: "Rachats par le Trésor",
  ACTION_COTEE: "Actions cotées",
  OBLIGATION_COTEE: "Obligations cotées",
  OPCVM: "Fonds (OPCVM)",
};
/** Short badge for a row. */
export const FAMILY_SHORT: Record<OfferFamily, string> = { OTA: "OTA", BTA: "BTA", APE: "APE", IPO: "IPO", RACHAT: "Rachat", ACTION_COTEE: "Action", OBLIGATION_COTEE: "Obligation", OPCVM: "OPCVM" };
export const FAMILY_SEGMENT: Record<OfferFamily, MarketSegment> = { OTA: "primaire", BTA: "primaire", APE: "primaire", IPO: "primaire", RACHAT: "primaire", ACTION_COTEE: "secondaire", OBLIGATION_COTEE: "secondaire", OPCVM: "fonds" };
export const SEGMENT_LABEL: Record<MarketSegment, string> = { primaire: "Marché primaire", secondaire: "Marché secondaire", fonds: "Gestion collective" };
export const SEGMENT_HINT: Record<MarketSegment, string> = {
  primaire: "Titres neufs : vous souscrivez auprès de l'émetteur (Trésor, entreprise) pendant une fenêtre, à un prix fixé par adjudication ou par le desk.",
  secondaire: "Titres déjà cotés à la BVMAC : vous achetez ou vendez à un autre investisseur, au cours du jour, en séance.",
  fonds: "Parts de fonds communs de placement : vous souscrivez ou rachetez à la prochaine valeur liquidative.",
};
export const FAMILIES: OfferFamily[] = ["OTA", "BTA", "APE", "IPO", "RACHAT", "ACTION_COTEE", "OBLIGATION_COTEE", "OPCVM"];

export const OPERATION_LABEL: Record<Offer["operation"], string> = {
  nouvelle_ligne: "Nouvelle ligne",
  abondement: "Abondement",
  rachat: "Rachat par le Trésor",
  ipo: "IPO",
  emprunt_ape: "Emprunt obligataire",
  secondaire: "Cotation",
  opcvm: "Fonds commun de placement",
};
