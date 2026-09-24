import type { Offer } from "./types";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "./market";
import { displayYield, marketAmortInput, marketBondCalc, marketBondInput } from "./status";
import { bondCalc, btaCalc, tenorText } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtPrice } from "@/lib/format";
import type { TermKey } from "@/lib/glossary";

/**
 * What a rate card means, for *this* line: the number decomposed with the
 * line's own figures, what it leaves out, and where to learn more. The
 * definitions live in the glossary (desk-editable); the arithmetic stays here.
 */
export interface KpiExplanation {
  key: string;
  title: string;
  term?: TermKey; // glossary definition + lesson link
  lines: [string, string][]; // the working, label → value
  caveats: string[]; // what the figure does not include
}

const signed = (n: number) => `${n > 0 ? "+" : ""}${fmtPct(n, 2)}`;

export function explainKpis(o: Offer, now = new Date()): KpiExplanation[] {
  const dy = displayYield(o);
  const brut = "Brut : avant retenue à la source et avant frais éventuels.";
  if (o.kind === "OTA" || o.kind === "APE") {
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const served = Boolean(o.servedPricePct);
    const r = o.couponRate != null && o.maturityOn ? bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, o.nominal * 1000, price) : null;
    const yieldLines: [string, string][] = [
      ["Coupon annuel", `${fmtPct(o.couponRate ?? 0, 2)} du nominal`],
      [served ? "Prix servi" : "Prix Purpose", `${fmtPrice(price)} du nominal${price < 99.95 ? " (décote)" : price > 100.05 ? " (prime)" : " (au pair)"}`],
      ...(r && r.accruedDays ? ([["Coupon couru avancé", `${fmt(r.accrued)} FCFA pour 10 M (${r.accruedDays} j)`]] as [string, string][]) : []),
      ["Durée jusqu'à l'échéance", o.maturityOn ? tenorText(o.settleOn, o.maturityOn) : "—"],
      ...(r ? ([["Décaissement pour 10 M de nominal", `${fmt(r.outlay)} FCFA`], ["Reçu jusqu'à l'échéance", `${fmt(r.outlay + r.gain)} FCFA (coupons + capital)`]] as [string, string][]) : []),
      [dy.atPar ? "Taux nominal" : "Rendement actuariel", r ? fmtPct(r.irr, 2) : "—"],
    ];
    return [
      { key: "yield", title: dy.atPar ? "Taux nominal au pair" : `Rendement actuariel ${served ? "servi" : "visé"}`, term: dy.atPar ? "pair" : "rendement_actuariel", lines: yieldLines, caveats: [brut, served ? "Calculé au prix effectivement servi à l'adjudication." : "Si vous êtes servi au prix publié : le Trésor peut servir à un autre prix, en partie ou pas du tout.", "Suppose le titre gardé jusqu'à l'échéance ; cédé avant, le prix de cession décide."] },
      { key: "price", title: served ? "Prix servi" : "Prix Purpose", term: "prix_limite", lines: [["Prix", `${fmtPrice(price)} du nominal`], ["Pour un titre de", `${fmt(o.nominal)} FCFA`], ["Vous payez", `${fmt((o.nominal * price) / 100)} FCFA par titre${r && r.accruedPerTitle ? ` + ${fmt(Math.round(r.accruedPerTitle))} de coupon couru` : ""}`], ["Remboursé à l'échéance", `${fmt(o.nominal)} FCFA par titre`]], caveats: [served ? "Prix arrêté par l'adjudication." : "Prix que le desk propose de déposer pour vous ; l'adjudication tranche.", "Sous 100 %, la différence est un gain à l'échéance ; au-dessus, une perte à l'échéance."] },
      { key: "coupon", title: "Coupon annuel", term: "coupon", lines: [["Taux", `${fmtPct(o.couponRate ?? 0, 2)} du nominal`], ["Par titre et par an", `${fmt(((o.couponRate ?? 0) / 100) * o.nominal)} FCFA`], ["Pour 10 M de nominal", `${fmt(((o.couponRate ?? 0) / 100) * 10_000_000)} FCFA par an`], ...(o.maturityOn ? ([["Versé chaque année jusqu'au", fmtDate(o.maturityOn)]] as [string, string][]) : [])], caveats: ["Fixé à l'émission, il ne change pas avec le prix.", brut] },
    ];
  }
  if (o.kind === "BTA") {
    const r = o.precountRate != null && o.maturityOn ? btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, o.nominal, o.precountRate) : null;
    return [
      { key: "yield", title: "Rendement actuariel", term: "precompte", lines: [["Taux précompté", fmtPct(o.precountRate ?? 0, 2)], ["Durée", r ? `${r.days} jours` : "—"], ["Vous payez", r ? `${fmt(Math.round(r.pricePerBond))} FCFA par bon` : "—"], ["Vous recevez à l'échéance", `${fmt(o.nominal)} FCFA par bon`], ["Rendement actuariel", r ? fmtPct(r.yieldPct, 2) : "—"]], caveats: ["Le rendement dépasse le taux précompté parce que l'intérêt est calculé sur le nominal mais vous n'avancez que le prix.", brut, "Taux indicatif si l'adjudication n'a pas encore eu lieu."] },
      { key: "precount", title: "Taux précompté", term: "bta", lines: [["Taux", fmtPct(o.precountRate ?? 0, 2)], ["Intérêt déduit à l'achat", r ? `${fmt(o.nominal - Math.round(r.pricePerBond))} FCFA par bon` : "—"]], caveats: ["Compté d'avance : la différence entre le prix payé et le nominal est votre intérêt."] },
      { key: "days", title: "Durée", term: "decote_duree", lines: [["Règlement", fmtDate(o.settleOn)], ["Échéance", o.maturityOn ? fmtDate(o.maturityOn) : "—"], ["Jours", r ? String(r.days) : "—"]], caveats: ["Un bon se garde jusqu'au terme : il n'y a pas de marché secondaire actif."] },
    ];
  }
  if (o.kind === "ACTIONS") {
    const y = o.pricePerShare && o.dividendPerShare ? (o.dividendPerShare / o.pricePerShare) * 100 : null;
    return [
      { key: "divyield", title: "Rendement du dividende au prix", term: "rendement_dividende", lines: [["Dernier dividende brut", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA par action` : "—"], ["Prix de souscription", o.pricePerShare ? `${fmt(o.pricePerShare)} FCFA` : "—"], ["Rendement", y != null ? fmtPct(y, 2) : "—"]], caveats: ["Si le dividende est maintenu : il dépend des résultats et de l'assemblée.", brut, "Le cours après l'introduction peut monter ou descendre."] },
      { key: "dividend", title: "Dernier dividende brut", term: "dividende", lines: [["Par action", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"], ["Pour 100 actions", o.dividendPerShare ? `${fmt(o.dividendPerShare * 100)} FCFA` : "—"]], caveats: ["Décidé chaque année par l'assemblée sur les résultats de l'exercice."] },
      { key: "price_share", title: "Prix de souscription", term: "cours", lines: [["Par action", o.pricePerShare ? `${fmt(o.pricePerShare)} FCFA` : "—"], ["Minimum", o.minShares ? `${fmt(o.minShares)} actions = ${fmt(o.minShares * (o.pricePerShare ?? 0))} FCFA` : "—"]], caveats: ["Fixé dans le prospectus ; c'est le cours de bourse qui fera ensuite la valeur."] },
    ];
  }
  if (o.kind === "RACHAT") {
    return [
      { key: "buyback", title: "Prix de rachat", term: "pair", lines: [["Prix", "100 % du nominal"], ["Par titre", `${fmt(o.nominal)} FCFA + coupon couru`]], caveats: ["Céder maintenant, c'est renoncer aux coupons restants : à comparer avec un réemploi.", "Le Trésor peut retenir une partie seulement des titres présentés."] },
      { key: "maturity", title: "Échéance initiale", term: "lignes", lines: [["Échéance", o.maturityOn ? fmtDate(o.maturityOn) : "—"], ["Coupon", fmtPct(o.couponRate ?? 0, 2)]], caveats: ["La ligne continue de vivre pour ceux qui ne présentent pas leurs titres."] },
      { key: "volume", title: "Volume racheté", lines: [["Volume", o.sizeLabel ?? "—"]], caveats: ["Au-delà, les demandes sont réduites au prorata."] },
    ];
  }
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    return [
      { key: "perf", title: f.perf1yPct != null ? "Performance sur 12 mois" : "Depuis l'origine", term: "vl", lines: [["VL il y a 12 mois → aujourd'hui", f.perf1yPct != null ? signed(f.perf1yPct) : "—"], [`Depuis l'origine${f.inceptionDate ? ` (${fmtDate(f.inceptionDate)})` : ""}`, `${signed(f.perfSinceInceptionPct)} · VL d'origine ${fmt(f.navOrigin)}`], ["Dernière VL", `${fmt(f.nav)} FCFA le ${fmtDate(f.navDate)}`]], caveats: ["Performance passée, nette des frais de gestion prélevés dans la VL ; ne préjuge pas de l'avenir.", f.entryFeePct ? `Frais d'entrée du fonds : ${fmtPct(f.entryFeePct, 2)}.` : "Sans frais d'entrée."] },
      { key: "nav", title: "Valeur liquidative", term: "vl", lines: [["VL", `${fmt(f.nav)} FCFA par part`], ["Date", fmtDate(f.navDate)], ["Calculée", FUND_FREQUENCY_LABEL[f.frequency]], ["1 000 000 FCFA ≈", `${(1_000_000 / f.nav).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts`]], caveats: ["Une souscription s'exécute à la prochaine VL, pas à celle-ci."] },
      { key: "category", title: "Catégorie", term: "opcvm", lines: [["Catégorie", FUND_CATEGORY_LABEL[f.category]], ["Société de gestion", o.issuer], ["Dépositaire", f.depositary ?? "—"]], caveats: ["La catégorie dit où le fonds investit (monétaire : titres courts ; obligataire : dette ; diversifié : mélange)."] },
    ];
  }
  if (o.kind === "MARCHE") {
    const bond = o.instrument === "obligation";
    const price = o.ask ?? o.lastPrice;
    if (bond) {
      const inp = marketBondInput(o, now);
      // Le même moteur que la carte : l'échéancier exact quand le référentiel le porte.
      const r = price != null ? marketBondCalc(o, o.nominal * 1000, price, { now }) : null;
      const amorti = Boolean(marketAmortInput(o, now));
      return [
        { key: "yield", title: dy.atPar ? "Taux nominal au pair" : "Rendement actuariel au cours", term: dy.atPar ? "pair" : "rendement_cours", lines: [["Coupon facial", `${fmtPct(o.couponRate ?? 0, 2)} du nominal restant`], ["Cours retenu", price != null ? `${fmtPrice(price)}${o.ask ? " (vendeur)" : " (dernier)"}` : "—"], ["Nominal restant par titre", `${fmt(o.nominal)} FCFA`], ["Remboursement", amorti ? "par tranches, jusqu'à l'échéance" : "en une fois, à l'échéance"], ["Règlement", inp ? `${fmtDate(inp.settleOn)} (T+${o.settlementDays ?? 3})` : "—"], ["Échéance", o.maturityOn ? fmtDate(o.maturityOn) : "—"], ["Rendement", r ? `${dy.approx ? "≈ " : ""}${fmtPct(r.irr, 2)}` : "—"]], caveats: ["Au cours du jour : votre ordre s'exécute au prix du marché ou à votre limite.", brut, amorti ? "Le capital revient par tranches : la décote sur le cours se récupère plus vite, et le rendement annualisé dépasse le coupon." : "", dy.approx ? "Échéance connue à l'année près : rendement approximatif." : "Échéancier exact de la fiche signalétique."].filter(Boolean) },
        { key: "coupon", title: "Coupon facial", term: "coupon", lines: [["Taux", `${fmtPct(o.couponRate ?? 0, 2)} du nominal restant`], ["Par titre et par an", `${fmt(((o.couponRate ?? 0) / 100) * o.nominal)} FCFA`]], caveats: ["Sur une obligation amortissable, le nominal restant diminue à chaque remboursement partiel : le coupon en FCFA aussi."] },
        { key: "last", title: "Dernier cours", term: "cours", lines: [["Dernier cours", o.lastPrice != null ? `${fmtPrice(o.lastPrice)} du nominal` : "—"], ["Le", o.lastPriceOn ? fmtDate(o.lastPriceOn) : "—"], ["Acheteur / vendeur", `${o.bid != null ? fmtPrice(o.bid) : "—"} / ${o.ask != null ? fmtPrice(o.ask) : "—"}`]], caveats: ["Cours de clôture du Bulletin Officiel de la Cote, repris sans retraitement.", "Un marché étroit : un ordre peut rester non exécuté plusieurs séances."] },
      ];
    }
    const y = o.lastPrice && o.dividendPerShare ? (o.dividendPerShare / o.lastPrice) * 100 : null;
    return [
      { key: "divyield", title: "Rendement du dernier dividende", term: "rendement_dividende", lines: [["Dernier dividende brut", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"], ["Dernier cours", o.lastPrice != null ? `${fmt(o.lastPrice)} FCFA` : "—"], ["Rendement", y != null ? fmtPct(y, 2) : "—"]], caveats: ["Si le dividende est maintenu.", brut] },
      { key: "dividend", title: "Dernier dividende brut", term: "dividende", lines: [["Par action", o.dividendPerShare ? `${fmt(o.dividendPerShare)} FCFA` : "—"]], caveats: ["Décidé par l'assemblée sur les résultats de l'exercice."] },
      { key: "last", title: "Dernier cours", term: "cours", lines: [["Dernier cours", o.lastPrice != null ? `${fmt(o.lastPrice)} FCFA` : "—"], ["Le", o.lastPriceOn ? fmtDate(o.lastPriceOn) : "—"], ["Acheteur / vendeur", `${o.bid != null ? fmt(o.bid) : "—"} / ${o.ask != null ? fmt(o.ask) : "—"}`], ["Seuils de séance", "± 10 % autour de la référence"]], caveats: ["Cours de clôture de la BVMAC ; le prix d'exécution dépend du marché.", "Un marché étroit : comptez plusieurs séances."] },
    ];
  }
  return [];
}
