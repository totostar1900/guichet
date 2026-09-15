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
  subtitle: string; // issuer · operation (the ISIN has its own line)
  hero: string; // the one number
  heroSub: string; // its condition
  heroUnit?: string; // table: the unit alone ("du nominal", "FCFA"); the condition stays in a hover
  gold: boolean; // hero is a yield the client can act on
  yieldPct: number | null;
  deadline: string; // "Auj. 12 h 00", "continue", "mercredi 12 h"
  deadlineParts?: [string, string]; // table: day on one line, hour underneath
  deadlineAt?: string; // ISO for sorting
  countdown?: string; // "2 h 10" when closing soon
  coupon: string;
  tenor: string; // duration as text ("2 ans et 11 mois") — from settlement for new paper, from today for listed bonds
  maturity: string; // exact repayment date when known, the year alone when only the year is printed
  maturityNote?: string; // "année" when only the year is known
  minimum: string; // the smallest ticket in FCFA
  minimumSub: string; // what that buys ("100 titres de 10 000")
  commission: string;
  primary: { label: string; intent: IntentType } | null;
  secondary?: { label: string; intent: IntentType };
  facts: [string, string][]; // three facts for the card
  ledger: [string, string, string?][]; // four labelled figures for the list: label, value, note
  past: boolean;
}

const OP: Record<Offer["operation"], string> = { nouvelle_ligne: "nouvelle ligne", abondement: "abondement", rachat: "rachat par le Trésor", ipo: "introduction", emprunt_ape: "emprunt obligataire", secondaire: "cotation", opcvm: "fonds" };

/** BOC bonds carry only the year of maturity ("NET 2024-2029"): we store 31/12 and say so. */
const yearOnly = (o: Offer): boolean => o.kind === "MARCHE" && Boolean(o.maturityOn?.endsWith("-12-31")) && o.priceSource !== "desk";
/** Time left from today; "échue" once the date has passed. */
const left = (now: Date, to: string): string => (to < localIso(now) ? "échue" : tenorText(localIso(now), to));
const maturityText = (o: Offer): string => (!o.maturityOn ? "—" : yearOnly(o) ? o.maturityOn.slice(0, 4) : fmtDate(o.maturityOn));
const maturityNote = (o: Offer): string | undefined => (o.maturityOn && yearOnly(o) ? "année seule au BOC" : undefined);

/** Annualised performance since inception — the only return a fund line can show from the BOC alone. */
const fundAnnualPct = (f: NonNullable<Offer["fund"]>, now: Date): number | null => {
  const years = (parseDate(localIso(now)).getTime() - parseDate(f.inceptionDate).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (!(years > 0.5) || f.perfSinceInceptionPct == null) return null;
  return (Math.pow(1 + f.perfSinceInceptionPct / 100, 1 / years) - 1) * 100;
};
const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;

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
    subtitle: `${o.issuer}${o.kind !== "MARCHE" && o.kind !== "FONDS" ? ` · ${OP[o.operation]}` : ""}`,
    yieldPct: y,
    past,
    commission: com,
  };
  const dl = (iso: string) => (parseDate(iso).toDateString() === now.toDateString() ? `Auj. ${fmtTime(iso)}` : fmtDateTime(iso));
  const dlParts = (iso: string): [string, string] => (parseDate(iso).toDateString() === now.toDateString() ? ["Aujourd'hui", fmtTime(iso)] : [fmtDate(iso, false), fmtTime(iso).replace(":", " h ")]);
  const closing = st === "closing" ? countdown(o.deadlineAt, now) : undefined;

  if (o.kind === "OTA" || o.kind === "APE") {
    const price = o.servedPricePct ?? o.pricePct;
    const pending = price == null || Boolean(o.priceNote);
    return {
      ...base,
      hero: y != null ? fmtPct(y, 2) : "—",
      heroSub: o.servedPricePct != null ? `servi à ${fmtPrice(o.servedPricePct)}` : price != null ? `si servi à ${fmtPrice(price)}${pending ? " (indicatif)" : ""}` : "prix à fixer par le desk",
      heroUnit: o.servedPricePct != null ? `servi à ${fmtPrice(o.servedPricePct)}` : price != null ? `si servi à ${fmtPrice(price)}` : "prix à fixer",
      gold: !past,
      deadline: dl(o.deadlineAt),
      deadlineParts: dlParts(o.deadlineAt),
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
      ledger: [
        ["Rendement", y != null ? fmtPct(y, 2) : "—", o.servedPricePct != null ? `servi à ${fmtPrice(o.servedPricePct)}` : price != null ? `si servi à ${fmtPrice(price)}` : "prix à fixer"],
        ["Clôture", dl(o.deadlineAt)],
        ["Échéance", o.maturityOn ? fmtDate(o.maturityOn) : "—", tenor],
        ["Ticket", `${fmt((o.minTitles ?? 1) * o.nominal)} FCFA`, o.minTitles ? `${fmt(o.minTitles)} titres` : undefined],
      ],
    };
  }
  if (o.kind === "BTA") {
    return {
      ...base,
      hero: y != null ? fmtPct(y, 2) : "—",
      heroSub: o.precountRate != null ? `à ${fmtPct(o.precountRate, 2)} précompté${o.rateNote ? " (indicatif)" : ""}` : "taux à fixer par le desk",
      heroUnit: o.precountRate != null ? `à ${fmtPct(o.precountRate, 2)} précompté` : "taux à fixer",
      gold: !past,
      deadline: dl(o.deadlineAt),
      deadlineParts: dlParts(o.deadlineAt),
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
      ledger: [
        ["Rendement", y != null ? fmtPct(y, 2) : "—", o.precountRate != null ? `à ${fmtPct(o.precountRate, 2)} précompté` : "taux à fixer"],
        ["Clôture", dl(o.deadlineAt)],
        ["Remboursé", o.maturityOn ? fmtDate(o.maturityOn) : "—", tenor],
        ["Ticket", `${fmt(o.nominal)} FCFA`, "1 bon"],
      ],
    };
  }
  if (o.kind === "ACTIONS") {
    return {
      ...base,
      hero: y != null ? fmtPct(y, 2) : "—",
      heroSub: y != null ? `dividende ${fmt(o.dividendPerShare ?? 0)} · ${fmt(o.pricePerShare ?? 0)} FCFA / action` : `${fmt(o.pricePerShare ?? 0)} FCFA / action · pas de dividende connu`,
      heroUnit: y != null ? `au prix de ${fmt(o.pricePerShare ?? 0)}` : `${fmt(o.pricePerShare ?? 0)} FCFA / action`,
      gold: !past && y != null,
      deadline: dl(o.deadlineAt),
      deadlineParts: dlParts(o.deadlineAt),
      deadlineAt: o.deadlineAt,
      countdown: closing,
      coupon: o.dividendPerShare ? `${fmt(o.dividendPerShare)} div.` : "—",
      tenor: "—",
      maturity: "—",
      minimum: `${fmt((o.minShares ?? 1) * (o.pricePerShare ?? 0))} FCFA`,
      minimumSub: `${o.minShares ?? 1} action${(o.minShares ?? 1) > 1 ? "s" : ""} à ${fmt(o.pricePerShare ?? 0)}`,
      primary: past ? null : { label: "Souscrire", intent: "ferme" },
      secondary: { label: "Question", intent: "info" },
      facts: [
        ["Dividende", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"],
        ["Ticket min.", `${fmt((o.minShares ?? 1) * (o.pricePerShare ?? 0))} FCFA`],
        ["Actions offertes", o.sharesOffered ? fmt(o.sharesOffered) : "—"],
      ],
      ledger: [
        ["Rendement du dividende", y != null ? fmtPct(y, 2) : "—", `au prix de ${fmt(o.pricePerShare ?? 0)} FCFA`],
        ["Clôture", dl(o.deadlineAt)],
        ["Dividende", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—", "brut, dernier exercice"],
        ["Ticket", `${fmt((o.minShares ?? 1) * (o.pricePerShare ?? 0))} FCFA`, `${o.minShares ?? 1} action${(o.minShares ?? 1) > 1 ? "s" : ""}`],
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
      deadlineParts: dlParts(o.deadlineAt),
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
      ledger: [
        ["Prix", "100 %", "du nominal, au pair"],
        ["Clôture", dl(o.deadlineAt)],
        ["Échéance initiale", o.maturityOn ? fmtDate(o.maturityOn) : "—"],
        ["Volume", o.sizeLabel ?? "—"],
      ],
    };
  }
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    const open = st === "quoted";
    const v = f.variationPct;
    const annual = fundAnnualPct(f, now);
    return {
      ...base,
      subtitle: `${o.issuer} · ${f.depositary}`,
      hero: annual != null ? signed(annual) : v != null ? signed(v) : "—",
      heroSub: `${annual != null ? "par an depuis l'origine" : "sur la période"} · VL ${fmt(f.nav)} FCFA du ${fmtDate(f.navDate, false)}`,
      heroUnit: annual != null ? "par an depuis l'origine" : "sur la période",
      gold: annual != null,
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
      ledger: [
        ["Performance", annual != null ? signed(annual) : "—", annual != null ? `par an · ${signed(f.perfSinceInceptionPct, 1)} depuis l'origine` : "moins de six mois d'historique"],
        ["VL", fmt(f.nav), `FCFA · ${fmtDate(f.navDate, false)}`],
        ["Variation", v != null ? signed(v) : "—", "dernière VL"],
        ["Ticket", open ? `${fmt(f.minAmount)} FCFA` : "sur demande"],
      ],
    };
  }
  // MARCHE
  const isBond = o.instrument === "obligation";
  const lot = o.lotSize ?? 1;
  const priceTxt = o.lastPrice != null ? (isBond ? fmtPrice(o.lastPrice) : `${fmt(o.lastPrice)} FCFA`) : "—";
  return {
    ...base,
    subtitle: `${o.market} · cotation continue`,
    hero: y != null ? `${isBond && yearOnly(o) ? "≈ " : ""}${fmtPct(y, 2)}` : "—",
    heroSub:
      y != null
        ? `${isBond ? "actuariel brut au cours" : "dividende brut au cours"} ${priceTxt}${o.lastPriceOn ? ` du ${fmtDate(o.lastPriceOn, false)}` : ""}${isBond ? ` · coupon ${fmtPct(o.couponRate ?? 0, 2)}` : ` · ${fmt(o.dividendPerShare ?? 0)} FCFA / action`}`
        : `cours ${priceTxt}${o.lastPriceOn ? ` du ${fmtDate(o.lastPriceOn, false)}` : ""} · ${isBond ? "échéance à préciser" : "pas de dividende connu"}`,
    heroUnit: `au cours ${priceTxt}`,
    gold: y != null && st === "quoted",
    deadline: "continue",
    coupon: isBond ? fmtPct(o.couponRate ?? 0, 2) : o.dividendPerShare ? `${fmt(o.dividendPerShare)} div.` : "—",
    tenor: isBond && o.maturityOn ? `${yearOnly(o) ? "≈ " : ""}${left(now, o.maturityOn)}` : "—",
    maturity: maturityText(o),
    maturityNote: maturityNote(o),
    minimum: o.lastPrice != null ? `${fmt(lot * (isBond ? (o.nominal * o.lastPrice) / 100 : o.lastPrice))} FCFA` : "—",
    minimumSub: `${lot} ${isBond ? "titre" : "action"}${lot > 1 ? "s" : ""} au cours${isBond ? ` · nominal ${fmt(o.nominal)}` : ""}`,
    primary: st === "quoted" ? { label: "Acheter", intent: "achat" } : null,
    secondary: st === "quoted" ? { label: "Vendre", intent: "vente" } : { label: "Question", intent: "info" },
    facts: [
      [isBond ? "Coupon" : "Dividende", isBond ? fmtPct(o.couponRate ?? 0, 2) : o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"],
      isBond ? ["Échéance", o.maturityOn ? `${maturityText(o)}${yearOnly(o) ? " ≈" : ""}` : "—"] : ["Acheteur / vendeur", o.bid != null && o.ask != null ? `${fmt(o.bid)} / ${fmt(o.ask)}` : "—"],
      ["Ticket min.", o.lastPrice != null ? `${fmt(lot * (isBond ? (o.nominal * o.lastPrice) / 100 : o.lastPrice))} FCFA` : "—"],
    ],
    ledger: [
      [isBond ? "Rendement actuariel" : "Rendement du dividende", y != null ? `${isBond && yearOnly(o) ? "≈ " : ""}${fmtPct(y, 2)}` : "—", `brut, au cours ${priceTxt}${o.lastPriceOn ? ` du ${fmtDate(o.lastPriceOn, false)}` : ""}`],
      isBond ? ["Coupon", fmtPct(o.couponRate ?? 0, 2), "taux facial"] : ["Dividende", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—", "brut, dernier exercice"],
      isBond ? ["Échéance", maturityText(o), o.maturityOn ? `${yearOnly(o) ? "≈ " : ""}${left(now, o.maturityOn)}` : undefined] : ["Acheteur / vendeur", o.bid != null && o.ask != null ? `${fmt(o.bid)} / ${fmt(o.ask)}` : "—"],
      ["Ticket", o.lastPrice != null ? `${fmt(lot * (isBond ? (o.nominal * o.lastPrice) / 100 : o.lastPrice))} FCFA` : "—", `${lot} ${isBond ? "titre" : "action"}${lot > 1 ? "s" : ""}`],
    ],
  };
}

export const KIND_FILTER_LABEL = KIND_LABEL;

/** Two-letter chip for the country column (ISO where it exists, RCA as the market says it). */
export const COUNTRY_CODE: Record<Offer["country"], string> = { RCA: "RCA", Congo: "CG", Cameroun: "CM", Gabon: "GA", Tchad: "TD", "Guinée éq.": "GQ" };
