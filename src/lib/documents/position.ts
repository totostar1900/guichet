import type { Intent, Offer } from "@/lib/domain/types";
import { bondCalc, btaCalc, type CashFlow } from "@/lib/finance";

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
  total: number; // to settle (client pays) — negative for a cession (client receives)
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
  // RACHAT — the client sells `amount` titles at par and receives the proceeds.
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
