import type { DisplayStatus, IntentType, Offer } from "./types";
import { countdown, displayStatus, FAMILY_SEGMENT, FAMILY_SHORT, headlineYield, isPast, KIND_LABEL, type MarketSegment, type OfferFamily, offerFamily, statusLabel } from "./status";
import { parseDate, tenorText } from "../finance";
import { fmt, fmtDate, fmtDateTime, fmtPct, fmtPrice, fmtTime, localIso } from "../format";

/**
 * What a listing row says about an offer, whatever the instrument — computed once
 * and shared by the table, the list and the cards so the three views never disagree.
 */
export interface OfferSummary {
  st: DisplayStatus;
  status: string; // pill text
  statusClass: string; // pill modifier
  kind: string; // "OTA", "Action", "Obligation", "OPCVM"
  family: OfferFamily;
  segment: MarketSegment; // primaire · secondaire · fonds
  title: string;
  subtitle: string; // issuer · code · operation
  hero: string; // the one number
  heroSub: string; // its condition
  gold: boolean; // hero is a yield the client can act on
  yieldPct: number | null;
  deadline: string; // "Auj. 12 h 00", "continue", "mercredi 12 h"
  deadlineAt?: string; // ISO for sorting
  countdown?: string; // "2 h 10" when closing soon
  coupon: string;
  tenor: string; // duration as text ("2 ans et 11 mois") — from settlement for new paper, from today for listed bonds
  maturity: string; // exact repayment date when known, the year alone when only the year is printed
  minimum: string; // the smallest ticket in FCFA
  minimumSub: string; // what that buys ("100 titres de 10 000")
  commission: string;
  primary: { label: string; intent: IntentType } | null;
  secondary?: { label: string; intent: IntentType };
  facts: [string, string][]; // three facts for the card
  past: boolean;
}

const OP: Record<Offer["operation"], string> = { nouvelle_ligne: "nouvelle ligne", abondement: "abondement", rachat: "rachat par le Trésor", ipo: "introduction", emprunt_ape: "emprunt obligataire", secondaire: "cotation", opcvm: "fonds" };

/** BOC bonds carry only the year of maturity ("NET 2024-2029"): we store 31/12 and say so. */
const yearOnly = (o: Offer): boolean => o.kind === "MARCHE" && Boolean(o.maturityOn?.endsWith("-12-31")) && o.priceSource !== "desk";
/** Time left from today; "échue" once the date has passed. */
const left = (now: Date, to: string): string => (to < localIso(now) ? "échue" : tenorText(localIso(now), to));
const maturityText = (o: Offer): string => (!o.maturityOn ? "—" : yearOnly(o) ? `${o.maturityOn.slice(0, 4)} (année)` : fmtDate(o.maturityOn));

export function summarize(o: Offer, now: Date): OfferSummary {
  const st = displayStatus(o, now);
  const past = isPast(st);
  const y = headlineYield(o);
  const tenor = o.maturityOn ? tenorText(o.settleOn, o.maturityOn) : "—";
  const com = fmtPct(o.commissionPct, 2);
  const base = {
    st,
    status: statusLabel(o, st),
    statusClass: st,
    kind: FAMILY_SHORT[offerFamily(o)],
    family: offerFamily(o),
    segment: FAMILY_SEGMENT[offerFamily(o)],
    title: o.title,
    subtitle: `${o.issuer} · ${o.isin}${o.kind !== "MARCHE" && o.kind !== "FONDS" ? ` · ${OP[o.operation]}` : ""}`,
    yieldPct: y,
    past,
    commission: com,
  };
  const dl = (iso: string) => (parseDate(iso).toDateString() === now.toDateString() ? `Auj. ${fmtTime(iso)}` : fmtDateTime(iso));
  const closing = st === "closing" ? countdown(o.deadlineAt, now) : undefined;

  if (o.kind === "OTA" || o.kind === "APE") {
    const price = o.servedPricePct ?? o.pricePct;
    const pending = price == null || Boolean(o.priceNote);
    return {
      ...base,
      hero: y != null ? fmtPct(y, 2) : "—",
      heroSub: o.servedPricePct != null ? `servi à ${fmtPrice(o.servedPricePct)}` : price != null ? `si servi à ${fmtPrice(price)}${pending ? " (indicatif)" : ""}` : "prix à fixer par le desk",
      gold: !past,
      deadline: dl(o.deadlineAt),
      deadlineAt: o.deadlineAt,
      countdown: closing,
      coupon: fmtPct(o.couponRate ?? 0, 2),
      tenor,
      maturity: maturityText(o),
      minimum: `${fmt((o.minTitles ?? 1) * o.nominal)} FCFA`,
      minimumSub: o.minTitles ? `${fmt(o.minTitles)} titres de ${fmt(o.nominal)}` : "1 titre",
      primary: past ? null : st === "upcoming" ? { label: "Me réserver", intent: "appetit" } : { label: "Prise ferme", intent: "ferme" },
      secondary: past ? { label: "Question", intent: "info" } : { label: "Appétit", intent: "appetit" },
      facts: [
        ["Coupon", fmtPct(o.couponRate ?? 0, 2)],
        ["Échéance", o.maturityOn ? `${fmtDate(o.maturityOn)} · ${tenor}` : tenor],
        ["Ticket min.", `${fmt((o.minTitles ?? 1) * o.nominal)} FCFA`],
      ],
    };
  }
  if (o.kind === "BTA") {
    return {
      ...base,
      hero: y != null ? fmtPct(y, 2) : "—",
      heroSub: o.precountRate != null ? `à ${fmtPct(o.precountRate, 2)} précompté${o.rateNote ? " (indicatif)" : ""}` : "taux à fixer par le desk",
      gold: !past,
      deadline: dl(o.deadlineAt),
      deadlineAt: o.deadlineAt,
      countdown: closing,
      coupon: "—",
      tenor,
      maturity: maturityText(o),
      minimum: `${fmt(o.nominal)} FCFA`,
      minimumSub: "1 bon, intérêts précomptés",
      primary: past ? null : st === "upcoming" ? { label: "Me réserver", intent: "appetit" } : { label: "Prise ferme", intent: "ferme" },
      secondary: past ? { label: "Question", intent: "info" } : { label: "Appétit", intent: "appetit" },
      facts: [
        ["Remboursé", o.maturityOn ? `${fmtDate(o.maturityOn)} · ${tenor}` : "—"],
        ["Ticket min.", `${fmt(o.nominal)} FCFA`],
        ["Commission", com],
      ],
    };
  }
  if (o.kind === "ACTIONS") {
    return {
      ...base,
      hero: fmt(o.pricePerShare ?? 0),
      heroSub: "FCFA par action",
      gold: false,
      deadline: dl(o.deadlineAt),
      deadlineAt: o.deadlineAt,
      countdown: closing,
      coupon: y != null ? `${fmtPct(y, 2)} div.` : "—",
      tenor: "—",
      maturity: "—",
      minimum: `${fmt((o.minShares ?? 1) * (o.pricePerShare ?? 0))} FCFA`,
      minimumSub: `${o.minShares ?? 1} action${(o.minShares ?? 1) > 1 ? "s" : ""} à ${fmt(o.pricePerShare ?? 0)}`,
      primary: past ? null : { label: "Souscrire", intent: "ferme" },
      secondary: { label: "Question", intent: "info" },
      facts: [
        ["Dividende", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"],
        ["Minimum", `${o.minShares ?? 1} actions`],
        ["Commission", com],
      ],
    };
  }
  if (o.kind === "RACHAT") {
    return {
      ...base,
      hero: "100 %",
      heroSub: "du nominal, rachat au pair",
      gold: false,
      deadline: dl(o.deadlineAt),
      deadlineAt: o.deadlineAt,
      countdown: closing,
      coupon: "—",
      tenor: o.maturityOn ? left(now, o.maturityOn) : "—",
      maturity: o.maturityOn ? fmtDate(o.maturityOn) : "—",
      minimum: "—",
      minimumSub: "au pair, sans minimum",
      primary: past ? null : { label: "Céder", intent: "cession" },
      secondary: { label: "Question", intent: "info" },
      facts: [
        ["Échéance initiale", o.maturityOn ? fmtDate(o.maturityOn) : "—"],
        ["Volume", o.sizeLabel ?? "—"],
        ["Commission", com],
      ],
    };
  }
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    const open = st === "quoted";
    const v = f.variationPct;
    return {
      ...base,
      subtitle: `${o.issuer} · ${f.depositary}`,
      hero: fmt(f.nav),
      heroSub: `FCFA · VL du ${fmtDate(f.navDate, false)}${f.perfSinceInceptionPct ? ` · ${f.perfSinceInceptionPct > 0 ? "+" : ""}${fmtPct(f.perfSinceInceptionPct, 1)} depuis l'origine` : ""}`,
      gold: false,
      deadline: open ? (f.cutoff ?? "prochaine VL") : "sur demande",
      coupon: v != null ? `${v > 0 ? "+" : ""}${fmtPct(v, 2)}` : "—",
      tenor: "—",
      maturity: "—",
      minimum: open ? `${fmt(f.minAmount)} FCFA` : "—",
      minimumSub: open ? `≈ ${(f.minAmount / f.nav).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} parts à la dernière VL` : "sur demande",
      commission: open ? `${fmtPct(f.entryFeePct, 2)} entrée` : "—",
      primary: open ? { label: "Souscrire", intent: "souscription" } : { label: "Sur demande", intent: "info" },
      secondary: open ? { label: "Racheter", intent: "rachat" } : undefined,
      facts: [
        ["Variation", v != null ? `${v > 0 ? "+" : ""}${fmtPct(v, 2)}` : "—"],
        ["Depuis l'origine", `${f.perfSinceInceptionPct > 0 ? "+" : ""}${fmtPct(f.perfSinceInceptionPct, 1)}`],
        [open ? "Droits d'entrée" : "Minimum", open ? fmtPct(f.entryFeePct, 2) : "sur demande"],
      ],
    };
  }
  // MARCHE
  const isBond = o.instrument === "obligation";
  const lot = o.lotSize ?? 1;
  return {
    ...base,
    subtitle: `${o.market} · ${o.isin} · cotation continue`,
    hero: o.lastPrice != null ? (isBond ? fmtPrice(o.lastPrice) : fmt(o.lastPrice)) : "—",
    heroSub: `${isBond ? "du nominal" : "FCFA"}${o.lastPriceOn ? ` · clôture ${fmtDate(o.lastPriceOn, false)}` : ""}${o.priceSource === "desk" ? " · saisi par le desk" : ""}`,
    gold: false,
    deadline: "continue",
    coupon: isBond ? fmtPct(o.couponRate ?? 0, 2) : y != null ? `${fmtPct(y, 2)} div.` : "—",
    tenor: isBond && o.maturityOn ? `${yearOnly(o) ? "≈ " : ""}${left(now, o.maturityOn)}` : "—",
    maturity: maturityText(o),
    minimum: o.lastPrice != null ? `${fmt(lot * (isBond ? (o.nominal * o.lastPrice) / 100 : o.lastPrice))} FCFA` : "—",
    minimumSub: `${lot} ${isBond ? "titre" : "action"}${lot > 1 ? "s" : ""} au cours${isBond ? ` · nominal ${fmt(o.nominal)}` : ""}`,
    primary: st === "quoted" ? { label: "Acheter", intent: "achat" } : null,
    secondary: st === "quoted" ? { label: "Vendre", intent: "vente" } : { label: "Question", intent: "info" },
    facts: [
      [isBond ? "Coupon" : "Rendement du dividende", isBond ? fmtPct(o.couponRate ?? 0, 2) : y != null ? fmtPct(y, 2) : "—"],
      ["Acheteur / vendeur", o.bid != null && o.ask != null ? `${isBond ? fmtPrice(o.bid) : fmt(o.bid)} / ${isBond ? fmtPrice(o.ask) : fmt(o.ask)}` : "—"],
      ["Commission", com],
    ],
  };
}

export const KIND_FILTER_LABEL = KIND_LABEL;

/** Two-letter chip for the country column (ISO where it exists, RCA as the market says it). */
export const COUNTRY_CODE: Record<Offer["country"], string> = { RCA: "RCA", Congo: "CG", Cameroun: "CM", Gabon: "GA", Tchad: "TD", "Guinée éq.": "GQ" };
