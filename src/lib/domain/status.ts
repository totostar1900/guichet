import type { DisplayStatus, Offer } from "./types";
import { bondCalc, btaCalc, parseDate, yearsBetween } from "../finance";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  quoted: "Cotée",
  upcoming: "À venir",
  open: "Ouverte",
  closing: "Clôture imminente",
  closed: "Clôturée",
  results: "Résultats",
  live: "En vie",
  matured: "Échue",
};

export const CLOSING_WINDOW_MS = 6 * 3600 * 1000;

/** What the client sees, derived from stored status + clock. */
export function displayStatus(o: Offer, now: Date = new Date()): DisplayStatus {
  if (o.kind === "MARCHE") return o.status === "withdrawn" ? "matured" : "quoted";
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
      if (o.instrument === "obligation" && o.couponRate != null && o.maturityOn && o.lastPrice != null) {
        return bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, o.nominal * 1000, o.ask ?? o.lastPrice).irr;
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
};

export const OPERATION_LABEL: Record<Offer["operation"], string> = {
  nouvelle_ligne: "Nouvelle ligne",
  abondement: "Abondement",
  rachat: "Rachat par le Trésor",
  ipo: "IPO",
  emprunt_ape: "Emprunt obligataire",
  secondaire: "Cotation",
};
