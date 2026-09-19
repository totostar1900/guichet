import type { Offer } from "./types";
import { displayYield, marketAmortInput, marketBondInput } from "./status";
import { typeOf } from "@/lib/registry";
import { amortCalc, bondCalc, type BondResult, btaCalc, btaAmountForBonds } from "../finance";
import { fmt, fmtDate, fmtPct, fmtPrice } from "../format";

/**
 * The reference calculation and the cautions of a line, shared by the fiche
 * page and the PDF sheet so the two never disagree.
 */
export interface OfferReference {
  title: string;
  rows: [string, string][];
  flows?: BondResult;
  settleOn?: string;
}

export function offerReference(o: Offer, now = new Date()): OfferReference | undefined {
  if ((o.kind === "OTA" || o.kind === "APE") && o.couponRate != null && o.maturityOn) {
    const price = o.servedPricePct ?? o.pricePct ?? 100;
    const r = bondCalc({ nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn }, 10_000_000, price);
    const dy = displayYield(o);
    return {
      title: `Pour 10 000 000 FCFA de nominal, au prix ${o.servedPricePct ? "servi" : "Purpose"}`,
      rows: [
        [`Titres (nominal ${fmt(o.nominal)})`, fmt(r.titles)],
        [`Prix ${fmtPrice(price)}`, fmt(r.titles * r.pricePerTitle)],
        [`Coupon couru (${r.accruedDays} jours)`, r.accruedDays ? fmt(r.accrued) : "néant, ligne nouvelle"],
        [`Décaissement le ${fmtDate(o.settleOn, false)}`, `${fmt(r.outlay)} FCFA`],
        ["Gain brut jusqu'au terme", fmt(r.gain)],
        [dy.atPar ? "Taux nominal (au pair)" : "Rendement actuariel annuel brut", fmtPct(dy.atPar ? (o.couponRate ?? r.irr) : r.irr, 2)],
      ],
      flows: r,
      settleOn: o.settleOn,
    };
  }
  if (o.kind === "BTA" && o.precountRate != null && o.maturityOn) {
    const bta = { nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn };
    const r = btaCalc(bta, btaAmountForBonds(bta, 10, o.precountRate), o.precountRate);
    return {
      title: `Pour ${fmt(r.n)} bons de ${fmt(o.nominal)} FCFA`,
      rows: [
        [`Prix d'achat par bon (${fmtPct(o.precountRate, 2)} précompté sur ${r.days} jours)`, fmt(r.pricePerBond)],
        [`Décaissement le ${fmtDate(o.settleOn, false)}`, `${fmt(r.outlay)} FCFA`],
        [`Remboursé le ${fmtDate(o.maturityOn, false)}`, fmt(r.redemption)],
        ["Intérêt (précompté)", fmt(r.gain)],
        ["Rendement actuariel", fmtPct(r.yieldPct, 2)],
      ],
    };
  }
  if (o.kind === "FONDS" && o.fund) {
    const f = o.fund;
    const amount = Math.max(f.minAmount, 1_000_000);
    const net = amount / (1 + f.entryFeePct / 100);
    const units = f.nav > 0 ? Math.floor((net / f.nav) * 1000) / 1000 : 0;
    return {
      title: `Pour ${fmt(amount)} FCFA à la dernière VL`,
      rows: [
        ...(f.entryFeePct > 0 ? ([[`Frais du fonds à l'entrée ${fmtPct(f.entryFeePct, 2)}`, fmt(amount - net)]] as [string, string][]) : []),
        ["Investi dans le fonds", fmt(net)],
        [`Parts (VL ${fmt(f.nav)} du ${fmtDate(f.navDate, false)})`, `≈ ${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}`],
        ...(f.exitFeePct > 0 ? ([["Frais du fonds à la sortie", fmtPct(f.exitFeePct, 2)]] as [string, string][]) : []),
      ],
    };
  }
  if (o.kind === "MARCHE") {
    const isBond = o.instrument === "obligation";
    const ref = o.ask ?? o.lastPrice ?? 0;
    const n = isBond ? 1000 : 100;
    const ai = isBond ? marketAmortInput(o, now) : null;
    const bi = isBond ? marketBondInput(o, now) : null;
    if ((ai && ai.maturityOn > ai.settleOn) || (bi && bi.maturityOn > bi.settleOn)) {
      const r = ai && ai.maturityOn > ai.settleOn ? amortCalc(ai, n * o.nominal, ref) : bondCalc(bi!, n * o.nominal, ref);
      const settleOn = ai && ai.maturityOn > ai.settleOn ? ai.settleOn : bi!.settleOn;
      const dy = displayYield(o);
      return {
        title: `Pour ${fmt(n)} titres au cours vendeur`,
        rows: [
          [`Prix ${fmtPrice(ref)}`, fmt(r.titles * r.pricePerTitle)],
          [`Coupon couru (${r.accruedDays} jours)`, fmt(r.accrued)],
          [`Décaissement (règlement T+${o.settlementDays ?? 3})`, `${fmt(r.outlay)} FCFA`],
          [dy.atPar ? "Taux nominal (au pair)" : "Rendement actuariel annuel brut à ce cours", fmtPct(dy.atPar ? (o.couponRate ?? r.irr) : r.irr, 2)],
        ],
        flows: r,
        settleOn,
      };
    }
    if (!isBond) {
      return {
        title: `Pour ${n} actions au cours vendeur`,
        rows: [
          ["Cours vendeur", `${fmt(ref)} FCFA`],
          ["Montant", `${fmt(n * ref)} FCFA`],
          ...(o.dividendPerShare ? ([["Dividende annuel attendu", fmt(n * o.dividendPerShare)]] as [string, string][]) : []),
          ["Total à décaisser", `${fmt(n * ref)} FCFA`],
        ],
      };
    }
    return undefined;
  }
  if (o.kind === "RACHAT" && o.maturityOn) {
    const n = 100;
    const proceeds = n * o.nominal;
    return {
      title: `Pour ${n} titres cédés au Trésor`,
      rows: [
        ["Produit de cession à 100 %", `${fmt(proceeds)} FCFA`],
        ["Coupon couru", "réglé par le Trésor"],
        [`Encaissement le ${fmtDate(o.settleOn, false)}`, fmt(proceeds)],
      ],
    };
  }
  return undefined;
}

export function offerRisks(o: Offer): [string, string][] {
  return typeOf(o).cautions;
}
