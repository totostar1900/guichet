import { bondCalc, btaAmountForBonds, btaCalc, daysBetween, type CashFlow } from "@/lib/finance";
import { fmt, fmtPct } from "@/lib/format";

/**
 * CE QUE LA CARTE « CE QUE CELA REPRÉSENTE » D'UNE SÉANCE CALCULE, pour un montant nominal (6 novembre 2026).
 *
 * Aucun calcul n'est refait ici : `bondCalc` et `btaCalc` (« finance.ts », la référence) font les comptes, ce fichier choisit lequel appeler et ce qu'il garde pour
 * la carte et l'échéancier. Un bon se prend en nombre entier de bons ; une obligation, en nombre entier de titres.
 */
export const MONTANT_PAR_DEFAUT = 10_000_000;

export type ParamsSeance =
  | { genre: "obligation"; nominal: number; couponRate: number; settleOn: string; maturityOn: string; lastCouponOn?: string | null; commissionPct?: number; prix: number; servi: boolean; minimum: number }
  | { genre: "bon"; nominal: number; settleOn: string; maturityOn: string; taux: number; minimum: number };

export interface Calcul {
  titres: number;
  paye: number;
  recu: number;
  rendement: number;
  detail: [string, string, string];
  graphe: { r?: ReturnType<typeof bondCalc>; outlay?: number; flows?: CashFlow[] };
  retient: number;
}

export function calculer(p: ParamsSeance, montant: number): Calcul {
  if (p.genre === "obligation") {
    const b = { nominal: p.nominal, couponRate: p.couponRate, settleOn: p.settleOn, maturityOn: p.maturityOn, lastCouponOn: p.lastCouponOn, commissionPct: p.commissionPct };
    const r = bondCalc(b, montant, p.prix);
    return {
      titres: r.titles,
      paye: r.outlay,
      recu: r.outlay + r.gain,
      rendement: r.irr,
      graphe: { r },
      retient: r.titles * p.nominal,
      detail: [fmt(r.titles), fmtPct(p.prix, Number.isInteger(p.prix) ? 0 : 3), r.accruedDays ? fmt(r.accrued) : "néant"],
    };
  }
  const b = { nominal: p.nominal, settleOn: p.settleOn, maturityOn: p.maturityOn };
  const n = Math.max(0, Math.floor(montant / p.nominal));
  const r = btaCalc(b, btaAmountForBonds(b, n, p.taux), p.taux);
  return {
    titres: r.n,
    paye: r.outlay,
    recu: r.redemption,
    rendement: r.yieldPct,
    graphe: { outlay: r.outlay, flows: [{ date: new Date(`${p.maturityOn}T00:00:00`), t: daysBetween(p.settleOn, p.maturityOn) / 365, amount: r.redemption, label: "Remboursement" }] },
    retient: r.n * p.nominal,
    detail: [fmt(r.n), fmt(r.pricePerBond), fmt(r.gain)],
  };
}
