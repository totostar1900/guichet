import type { Offer } from "./types";
import { displayYield, offerFamily, familyLabel } from "./status";
import { offerReference } from "./sheet";
import { btaAmountForBonds, btaCalc, daysBetween } from "../finance";
import { fmtPrice, fmtPct, localIso } from "../format";

/**
 * What the compare page draws for one line: the return with its nature
 * (a promise, a past, a price), the cash-flow calendar of a debt security
 * for a reference nominal, the NAV history of a fund. Pure, serialisable.
 */
export type ReturnNature = "promesse" | "passe" | "cours" | "aucune";

export interface FlowItem {
  date: string; // YYYY-MM-DD
  amount: number; // FCFA, negative = paid out
  kind: "sortie" | "coupon" | "capital" | "dividende" | "cession";
  sure: boolean; // a dividend is expected, not promised
}

export interface CompareLine {
  id: string;
  title: string;
  family: string;
  ret: { pct: number | null; nature: ReturnNature; note: string };
  flows?: { title: string; items: FlowItem[]; outlay: number; back: number };
  navs?: { date: string; nav: number; bulletinNo: number }[];
}

export const REF_NOMINAL = 10_000_000;

const isDebt = (o: Offer) => o.kind === "OTA" || o.kind === "APE" || o.kind === "BTA" || (o.kind === "MARCHE" && o.instrument === "obligation");

export function compareLine(o: Offer, navs: { navDate: string; nav: number; bulletinNo: number }[], now = new Date()): CompareLine {
  const dy = displayYield(o);
  const fam = offerFamily(o);
  const line: CompareLine = { id: o.id, title: o.title, family: familyLabel(fam), ret: { pct: dy.pct, nature: "aucune", note: "" } };

  // The nature of the figure: what it rests on.
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    const years = daysBetween(f.inceptionDate, localIso(now)) / 365;
    if (f.perf1yPct != null) line.ret = { pct: f.perf1yPct, nature: "passe", note: "sur les 12 derniers mois" };
    else if (years > 0.5 && f.perfSinceInceptionPct != null) line.ret = { pct: (Math.pow(1 + f.perfSinceInceptionPct / 100, 1 / years) - 1) * 100, nature: "passe", note: "par an depuis l'origine" };
    else line.ret = { pct: null, nature: "aucune", note: "moins de six mois d'historique" };
    line.navs = [...navs].sort((p, q) => p.navDate.localeCompare(q.navDate)).map((n) => ({ date: n.navDate, nav: n.nav, bulletinNo: n.bulletinNo }));
    return line;
  }
  if (isDebt(o)) {
    const price = o.kind === "MARCHE" ? (o.ask ?? o.lastPrice) : (o.servedPricePct ?? o.pricePct);
    const note = o.kind === "BTA" ? (o.precountRate != null ? `à ${fmtPct(o.precountRate, 2)} précompté` : "taux à fixer") : dy.atPar ? (o.servedPricePct != null ? "servi au pair" : "si servi au pair") : o.servedPricePct != null ? `servi à ${fmtPrice(o.servedPricePct)}` : price != null ? `${o.kind === "MARCHE" ? "au cours de" : "si servi à"} ${fmtPrice(price)}` : "prix à fixer";
    line.ret = { pct: dy.pct, nature: "promesse", note };
    // The calendar: what goes out, what comes back, on which date — for a reference nominal.
    if (o.kind === "BTA" && o.precountRate != null && o.maturityOn) {
      const bta = { nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn };
      const r = btaCalc(bta, btaAmountForBonds(bta, Math.max(1, Math.round(REF_NOMINAL / o.nominal)), o.precountRate), o.precountRate);
      line.flows = { title: `Pour ${r.n} bons de ${o.nominal.toLocaleString("fr-FR")} FCFA`, outlay: r.outlay, back: r.redemption, items: [{ date: o.settleOn, amount: -r.outlay, kind: "sortie", sure: true }, { date: o.maturityOn, amount: r.redemption, kind: "capital", sure: true }] };
    } else {
      const ref = offerReference(o, now);
      if (ref?.flows && ref.settleOn) {
        const r = ref.flows;
        line.flows = {
          title: ref.title,
          outlay: r.outlay,
          back: r.flows.reduce((s, f) => s + f.amount, 0),
          items: [{ date: ref.settleOn, amount: -r.outlay, kind: "sortie", sure: true }, ...r.flows.map((f) => ({ date: localIso(f.date), amount: f.amount, kind: (f.label === "Coupon" ? "coupon" : "capital") as FlowItem["kind"], sure: true }))],
        };
      }
    }
    return line;
  }
  if (o.kind === "RACHAT" && o.maturityOn) {
    line.ret = { pct: null, nature: "aucune", note: "rachat au pair : pas de rendement, un encaissement" };
    const n = Math.max(1, Math.round(REF_NOMINAL / o.nominal));
    line.flows = { title: `Pour ${n} titres cédés au Trésor`, outlay: 0, back: n * o.nominal, items: [{ date: o.settleOn, amount: n * o.nominal, kind: "cession", sure: true }] };
    return line;
  }
  // Shares: an IPO or a listed share — a price today, a dividend expected, not promised.
  const price = o.kind === "MARCHE" ? (o.ask ?? o.lastPrice) : o.pricePerShare;
  const div = o.dividendPerShare;
  line.ret = { pct: dy.pct, nature: dy.pct != null ? "cours" : "aucune", note: dy.pct != null && price ? `dividende ${div?.toLocaleString("fr-FR") ?? "—"} au cours de ${price.toLocaleString("fr-FR")}` : "pas de dividende connu" };
  if (price) {
    const n = Math.max(1, Math.round(REF_NOMINAL / price));
    const items: FlowItem[] = [{ date: o.settleOn, amount: -n * price, kind: "sortie", sure: true }];
    if (div) {
      const d = new Date(o.settleOn + "T00:00:00Z");
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      items.push({ date: d.toISOString().slice(0, 10), amount: n * div, kind: "dividende", sure: false });
    }
    line.flows = { title: `Pour ${n.toLocaleString("fr-FR")} actions au cours`, outlay: n * price, back: div ? n * div : 0, items };
  }
  return line;
}
