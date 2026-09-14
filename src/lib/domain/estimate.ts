import type { Offer } from "./types";
import { bondCalc, btaCalc } from "../finance";
import { fmt, fmtDate, fmtPct, fmtPrice } from "../format";

/**
 * One-line sizing of a client's amount at the published price — used in the
 * intent form (client) and in the desk's confirmation. Returns plain segments
 * so both React and text channels (WhatsApp) can render it.
 */
export interface Estimate {
  ok: boolean;
  text: string;
  titles?: number;
  outlay?: number;
}

export function estimate(o: Offer, amount: number): Estimate {
  if (!amount) return { ok: false, text: "Indiquez un montant pour voir le décaissement estimé au prix publié." };

  if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn) {
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, amount, price);
    if (!r.titles) return { ok: false, text: `Montant inférieur à un titre (${fmt(o.nominal)} FCFA).` };
    if (o.minTitles && r.titles < o.minTitles) return { ok: false, text: `Minimum ${fmt(o.minTitles)} titres, soit ${fmt(o.minTitles * o.nominal)} FCFA de nominal.` };
    const accrued = r.accruedDays ? ` (dont ${fmt(r.accrued)} de coupon couru)` : "";
    return {
      ok: true,
      titles: r.titles,
      outlay: r.outlay,
      text: `≈ ${fmt(r.titles)} titres · décaissement ${fmt(r.outlay)} FCFA le ${fmtDate(o.settleOn, false)}${accrued} · rendement ${fmtPct(r.irr)} si servi à ${fmtPrice(price)}`,
    };
  }
  if (o.kind === "BTA" && o.precountRate != null && o.maturityOn) {
    const r = btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, amount, o.precountRate);
    if (!r.n) return { ok: false, text: `Montant inférieur à un bon (≈ ${fmt(r.pricePerBond)} FCFA).` };
    return { ok: true, titles: r.n, outlay: r.outlay, text: `≈ ${fmt(r.n)} bons · décaissement ${fmt(r.outlay)} FCFA · remboursé ${fmt(r.redemption)} le ${fmtDate(o.maturityOn, false)}` };
  }
  if (o.kind === "ACTIONS" && o.pricePerShare) {
    const n = Math.floor(amount / o.pricePerShare);
    const min = o.minShares ?? 1;
    if (n < min) return { ok: false, text: `Minimum ${min} actions, soit ${fmt(min * o.pricePerShare)} FCFA.` };
    const div = o.dividendPerShare ? ` · dividende attendu ${fmt(n * o.dividendPerShare)}` : "";
    return { ok: true, titles: n, outlay: n * o.pricePerShare, text: `≈ ${fmt(n)} actions · à libérer ${fmt(n * o.pricePerShare)} FCFA${div}` };
  }
  if (o.kind === "RACHAT") {
    const proceeds = amount * o.nominal;
    return { ok: true, titles: amount, outlay: -proceeds, text: `${fmt(amount)} titres · produit de cession ${fmt(proceeds)} FCFA à 100 %, commission déduite ${fmt(proceeds * (1 - o.commissionPct / 100))}` };
  }
  return { ok: false, text: "" };
}
