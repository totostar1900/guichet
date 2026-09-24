import type { Intent, Offer } from "@/lib/domain/types";
import { bondCalc, btaCalc, type CashFlow } from "@/lib/finance";
import { marketBondCalc } from "@/lib/domain/status";

/**
 * The money lines every document prints for one intent on one offer.
 * One computation, reused by bulletin, appel de fonds, avis and bordereau.
 */
export interface Position {
  label: string; // "2 500 titres", "10 bons", "100 actions"
  units: number;
  unitWord: string;
  pricePct?: number; // % of nominal (bonds, buybacks)
  priceLabel: string; // "94,000 %" / "5,50 % précompté" / "80 000 FCFA"
  nominalAmount: number; // units × nominal
  principal: number; // units × price
  accrued: number;
  accruedDays: number;
  commission: number;
  total: number; // to settle (client pays) : negative for a cession (client receives)
  irr?: number;
  schedule: CashFlow[]; // coupons / redemption for the position
}

const pct3 = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} %`;

export function positionFor(intent: Intent, offer: Offer, opts: { pricePct?: number; unitsOverride?: number } = {}): Position {
  const amount = intent.amount ?? 0;
  const com = offer.commissionPct / 100;

  if ((offer.kind === "OTA" || offer.kind === "APE") && offer.couponRate != null && offer.maturityOn) {
    const price = opts.pricePct ?? offer.servedPricePct ?? offer.pricePct ?? 100;
    const b = { nominal: offer.nominal, couponRate: offer.couponRate, settleOn: offer.settleOn, maturityOn: offer.maturityOn, lastCouponOn: offer.lastCouponOn, commissionPct: offer.commissionPct };
    const r = bondCalc(b, opts.unitsOverride != null ? opts.unitsOverride * offer.nominal : amount, price);
    return {
      label: `${r.titles.toLocaleString("fr-FR")} titres`,
      units: r.titles,
      unitWord: "titres",
      pricePct: price,
      priceLabel: pct3(price),
      nominalAmount: r.titles * offer.nominal,
      principal: r.titles * r.pricePerTitle,
      accrued: r.accrued,
      accruedDays: r.accruedDays,
      commission: r.outlay * com,
      total: r.outlay * (1 + com),
      irr: r.irr,
      schedule: r.flows,
    };
  }
  if (offer.kind === "BTA" && offer.precountRate != null && offer.maturityOn) {
    const r = btaCalc({ nominal: offer.nominal, settleOn: offer.settleOn, maturityOn: offer.maturityOn }, opts.unitsOverride != null ? opts.unitsOverride * offer.nominal : amount, offer.precountRate);
    return {
      label: `${r.n} bons`,
      units: r.n,
      unitWord: "bons",
      priceLabel: `${offer.precountRate.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} % précompté`,
      nominalAmount: r.n * offer.nominal,
      principal: r.outlay,
      accrued: 0,
      accruedDays: 0,
      commission: r.outlay * com,
      total: r.outlay * (1 + com),
      irr: r.yieldPct,
      schedule: [{ date: new Date(`${offer.maturityOn}T00:00:00`), t: r.days / 365, amount: r.redemption, label: "Remboursement" }],
    };
  }
  if (offer.kind === "ACTIONS" && offer.pricePerShare) {
    const n = opts.unitsOverride ?? Math.floor(amount / offer.pricePerShare);
    const principal = n * offer.pricePerShare;
    return {
      label: `${n.toLocaleString("fr-FR")} actions`,
      units: n,
      unitWord: "actions",
      priceLabel: `${offer.pricePerShare.toLocaleString("fr-FR")} FCFA`,
      nominalAmount: principal,
      principal,
      accrued: 0,
      accruedDays: 0,
      commission: principal * com,
      total: principal * (1 + com),
      schedule: [],
    };
  }
  if (offer.kind === "MARCHE") {
    // Secondary market: amount = quantity; price = executed, else limit, else ask/bid/last.
    const isBond = offer.instrument === "obligation";
    const sell = intent.type === "vente";
    const ref = intent.executedPrice ?? intent.limitPrice ?? (sell ? (offer.bid ?? offer.lastPrice ?? 0) : (offer.ask ?? offer.lastPrice ?? 0));
    const n = opts.unitsOverride ?? amount;
    const settleOn = (() => {
      const d = new Date(intent.createdAt);
      d.setDate(d.getDate() + (offer.settlementDays ?? 3));
      return d.toISOString().slice(0, 10);
    })();
    // Le même moteur que la fiche, au règlement de cet ordre : un relevé qui
    // compte une obligation amortissable comme une « in fine » annonce un
    // rendement que le client ne touchera pas.
    const marketR = isBond ? marketBondCalc(offer, n * offer.nominal, ref, { settleOn }) : null;
    if (marketR) {
      const r = marketR;
      const gross = r.outlay;
      return { label: `${n.toLocaleString("fr-FR")} titres`, units: n, unitWord: "titres", pricePct: ref, priceLabel: pct3(ref), nominalAmount: n * offer.nominal, principal: n * r.pricePerTitle, accrued: r.accrued, accruedDays: r.accruedDays, commission: gross * com, total: sell ? -(gross * (1 - com)) : gross * (1 + com), irr: r.irr, schedule: r.flows };
    }
    if (isBond) {
      // Une ligne arrivée à échéance n'a plus de flux devant elle : le principal
      // seul, et surtout pas l'habit d'une action, que la branche suivante donne.
      const p = n * ((offer.nominal * ref) / 100);
      return { label: `${n.toLocaleString("fr-FR")} titres`, units: n, unitWord: "titres", pricePct: ref, priceLabel: pct3(ref), nominalAmount: n * offer.nominal, principal: p, accrued: 0, accruedDays: 0, commission: p * com, total: sell ? -(p * (1 - com)) : p * (1 + com), schedule: [] };
    }
    const principal = n * ref;
    return { label: `${n.toLocaleString("fr-FR")} actions`, units: n, unitWord: "actions", priceLabel: `${ref.toLocaleString("fr-FR")} FCFA`, nominalAmount: principal, principal, accrued: 0, accruedDays: 0, commission: principal * com, total: sell ? -(principal * (1 - com)) : principal * (1 + com), schedule: [] };
  }
  if (offer.kind === "FONDS" && offer.fund) {
    // Subscription: amount is FCFA, units = net of entry fee / NAV. Redemption: amount is units, proceeds net of exit fee.
    const f = offer.fund;
    const nav = intent.executedPrice ?? f.nav;
    const navLabel = `VL ${nav.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} FCFA`;
    if (intent.type === "rachat") {
      const units = opts.unitsOverride ?? amount;
      const gross = units * nav;
      const fee = gross * (f.exitFeePct / 100);
      return { label: `${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts`, units, unitWord: "parts", priceLabel: navLabel, nominalAmount: gross, principal: gross, accrued: 0, accruedDays: 0, commission: fee, total: -(gross - fee), schedule: [] };
    }
    const units = opts.unitsOverride ?? (intent.servedUnits ?? (nav > 0 ? Math.floor((amount / (1 + f.entryFeePct / 100) / nav) * 1000) / 1000 : 0));
    const principal = units * nav;
    const fee = principal * (f.entryFeePct / 100);
    return { label: `${units.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts`, units, unitWord: "parts", priceLabel: navLabel, nominalAmount: principal, principal, accrued: 0, accruedDays: 0, commission: fee, total: opts.unitsOverride != null ? principal + fee : amount, schedule: [] };
  }
  // RACHAT : the client sells `amount` titles at par and receives the proceeds.
  const n = opts.unitsOverride ?? amount;
  const proceeds = n * offer.nominal;
  return {
    label: `${n.toLocaleString("fr-FR")} titres`,
    units: n,
    unitWord: "titres",
    pricePct: 100,
    priceLabel: "100,000 %",
    nominalAmount: proceeds,
    principal: proceeds,
    accrued: 0,
    accruedDays: 0,
    commission: proceeds * com,
    total: -(proceeds * (1 - com)),
    schedule: [],
  };
}
