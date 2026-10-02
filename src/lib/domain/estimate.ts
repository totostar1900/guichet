import type { IntentType, Offer } from "./types";
import { bondCalc, btaCalc } from "../finance";
import { marketBondCalc } from "./status";
import { fmt, fmtDate, fmtPct, fmtPrice } from "../format";

/**
 * One-line sizing of a client's amount at the published price : used in the
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
  if (o.kind === "MARCHE") {
    const isBond = o.instrument === "obligation";
    const ref = o.ask ?? o.lastPrice ?? 0;
    const unit = isBond ? (o.nominal * ref) / 100 : ref;
    const n = Math.floor(amount / Math.max(unit, 1));
    if (o.lotSize && n < o.lotSize) return { ok: false, text: `Quantité minimale ${o.lotSize} : soit ${fmt(o.lotSize * unit)} FCFA au cours actuel.` };
    // Le moteur de la carte, et la date de règlement du marché (T+n depuis aujourd'hui) :
    // « o.settleOn » est la date du primaire, elle n'a pas de sens sur une ligne cotée.
    const r = isBond ? (marketBondCalc(o, n * o.nominal, ref) ?? undefined) : undefined;
    return { ok: n > 0, titles: n, outlay: r ? r.outlay : n * unit, text: n > 0 ? `≈ ${fmt(n)} ${isBond ? "titres" : "actions"} au cours de référence ${isBond ? fmtPrice(ref) : fmt(ref) + " FCFA"} · ${fmt(r ? r.outlay : n * unit)} FCFA${r?.accruedDays ? ` dont ${fmt(r.accrued)} de coupon couru` : ""} · règlement T+${o.settlementDays ?? 3} · le prix d'exécution dépend du marché` : "Montant inférieur à une unité." };
  }
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    if (amount < f.minAmount) return { ok: false, text: `Souscription minimale ${fmt(f.minAmount)} FCFA.` };
    const net = amount / (1 + f.entryFeePct / 100);
    const units = f.nav > 0 ? Math.floor((net / f.nav) * 1000) / 1000 : 0;
    return { ok: units > 0, titles: units, outlay: amount, text: `≈ ${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts à la VL du ${fmtDate(f.navDate, false)} (${fmt(f.nav)} FCFA)${f.entryFeePct ? ` · droits d'entrée ${fmtPct(f.entryFeePct, 2)} inclus` : " · sans droits d'entrée"} · le nombre exact de parts dépend de la VL retenue à la centralisation` };
  }
  if (o.kind === "RACHAT") {
    const proceeds = amount * o.nominal;
    return { ok: true, titles: amount, outlay: -proceeds, text: `${fmt(amount)} titres · produit de cession ${fmt(proceeds)} FCFA à 100 %` };
  }
  return { ok: false, text: "" };
}

/**
 * L'ÉQUIVALENCE, SOUS LE CHAMP : le même montant dit dans l'autre unité.
 *
 * Elle existait déjà, dans `estimate`, mais le formulaire l'envoyait dans la
 * bulle « Le calcul » du bloc de totaux dès que le montant devenait valable :
 * il fallait la demander pour la voir. Or un client qui tape dix millions veut
 * savoir combien de parts, ou combien de bons, cela fait, et il le veut
 * pendant qu'il tape. Elle sort donc de la bulle et passe sous le champ, plus
 * courte, avec la date de la valeur sur laquelle elle est calculée : sans
 * cette date, une estimation se lit comme un prix.
 *
 * `rest` est la seconde moitié de la vérité et elle ne se disait nulle part :
 * un titre ne se coupe pas, donc une partie du montant demandé ne part pas
 * toujours. Sur un fonds il n'y a pas de reste, les parts ont trois décimales.
 *
 * Les lignes cotées ne passent pas par ici : leur conversion a son propre
 * champ et sa propre phrase, parce qu'on y saisit indifféremment des titres ou
 * des francs.
 */
export interface Equivalence {
  /** La phrase, en français, comme `text` : elle passe par t() telle quelle. */
  line: string;
  /** Ce que le montant demandé laisse de côté, ou rien. */
  rest: number;
  /** Pourquoi ce reste existe, quand il existe. */
  restLine: string;
}

export function equivalence(o: Offer, amount: number, type: IntentType): Equivalence | null {
  if (!amount || o.kind === "MARCHE") return null;

  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    const vl = `la VL du ${fmtDate(f.navDate, false)}, ${fmt(f.nav)} FCFA`;
    if (type === "rachat") return { line: `≈ ${fmt(Math.round(amount * f.nav))} FCFA à ${vl} · la VL de rachat arrêtera le montant`, rest: 0, restLine: "" };
    const net = amount / (1 + f.entryFeePct / 100);
    const units = f.nav > 0 ? Math.floor((net / f.nav) * 1000) / 1000 : 0;
    if (!units) return null;
    return { line: `≈ ${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts à ${vl} · le nombre exact sera celui de la VL d'exécution`, rest: 0, restLine: "" };
  }

  if (o.kind === "RACHAT") return { line: `≈ ${fmt(amount * o.nominal)} FCFA de produit de cession, au pair`, rest: 0, restLine: "" };

  const e = estimate(o, amount);
  if (!e.ok || !e.titles || e.outlay == null) return null;
  const unit = o.kind === "BTA" ? "bons" : o.kind === "ACTIONS" ? "actions" : "titres";
  // Sur une obligation du primaire le champ porte du nominal, et le décaissement
  // peut le dépasser : prix au-dessus du pair, coupon couru. Le reste s'y mesure
  // donc contre le nominal servi, et non contre la somme payée.
  const placed = o.kind === "OTA" || o.kind === "APE" ? e.titles * o.nominal : Math.round(e.outlay);
  const rest = Math.max(0, Math.round(amount) - placed);
  const each = Math.round(e.outlay / e.titles);
  const oneMore = unit === "bons" ? "un bon de plus" : unit === "actions" ? "une action de plus" : "un titre de plus";
  return {
    line: `≈ ${fmt(e.titles)} ${unit} · ${fmt(Math.round(e.outlay))} FCFA à décaisser`,
    rest,
    restLine: rest > 0 ? `${fmt(rest)} FCFA ne sont pas placés : ${oneMore} coûterait ${fmt(Math.max(0, each - rest))} FCFA de trop.` : "",
  };
}
