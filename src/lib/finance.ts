/**
 * Fixed-income and equity arithmetic used across the Guichet.
 * Conventions: Exact/Exact for OTA/APE (annual coupon, in fine),
 * 360-day precount for BTA. Pure functions, no I/O.
 */

const DAY = 86_400_000;

export function parseDate(s: string): Date {
  // Accept YYYY-MM-DD or full ISO; treat date-only as local midnight.
  return s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY);
}

export function yearsBetween(from: string, to: string): number {
  return daysBetween(from, to) / 365;
}

/** "2 ans et 11 mois", "1 an et 5 mois", "182 jours". */
export function tenorText(from: string, to: string): string {
  const a = parseDate(from);
  const b = parseDate(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months--;
  // round to the nearest month, as in the client note ("2 ans et 11 mois" for 2y 10m 27d)
  const anchor = new Date(a);
  anchor.setMonth(anchor.getMonth() + months);
  if ((b.getTime() - anchor.getTime()) / DAY >= 15) months++;
  if (months < 1) return `${daysBetween(from, to)} jours`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} an${y > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} mois`);
  return parts.join(" et ");
}

export interface CashFlow {
  date: Date;
  t: number; // years from settlement
  amount: number;
  label: "Coupon" | "Coupon + capital" | "Remboursement";
}

export interface BondInput {
  nominal: number;
  couponRate: number; // % p.a.
  settleOn: string;
  maturityOn: string;
  lastCouponOn?: string | null;
  commissionPct?: number;
}

export interface BondResult {
  titles: number;
  accruedDays: number;
  accruedPerTitle: number;
  accrued: number;
  pricePerTitle: number;
  outlay: number; // titles × (price + accrued)
  commission: number;
  gain: number; // total inflows − outlay, before commission
  irr: number; // % p.a., gross
  flows: CashFlow[];
}

/** Anniversary coupon dates strictly after settlement, ending at maturity. */
export function couponDates(settleOn: string, maturityOn: string): Date[] {
  const settle = parseDate(settleOn);
  const dates: Date[] = [];
  const d = parseDate(maturityOn);
  while (d > settle) {
    dates.unshift(new Date(d));
    d.setFullYear(d.getFullYear() - 1);
  }
  return dates;
}

export function firstCouponDate(settleOn: string, maturityOn: string): Date | undefined {
  return couponDates(settleOn, maturityOn)[0];
}

/** Bisection on the annual rate that discounts the flows to the outlay. */
export function solveIrr(outlay: number, flows: { t: number; amount: number }[]): number {
  if (outlay <= 0 || flows.length === 0) return 0;
  let lo = -0.5;
  let hi = 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const pv = flows.reduce((s, f) => s + f.amount / Math.pow(1 + mid, f.t), 0);
    if (pv > outlay) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** Outlay, accrued interest, flows and gross actuarial yield for a coupon bond bought at `pricePct`. */
export function bondCalc(b: BondInput, nominalAmount: number, pricePct: number): BondResult {
  const titles = Math.max(0, Math.floor(nominalAmount / b.nominal));
  const coupon = (b.couponRate / 100) * b.nominal;
  const accruedDays = b.lastCouponOn ? daysBetween(b.lastCouponOn, b.settleOn) : 0;
  const accruedPerTitle = (coupon * accruedDays) / 365;
  const pricePerTitle = (b.nominal * pricePct) / 100;
  const outlay = titles * (pricePerTitle + accruedPerTitle);
  const settle = parseDate(b.settleOn);
  const dates = couponDates(b.settleOn, b.maturityOn);
  // Exact/Exact (ICMA): the stub to the first coupon is a fraction of that
  // coupon period; every later flow is one full year further. At par, a new
  // line then yields exactly its coupon.
  let stub = 1;
  if (dates.length) {
    const first = dates[0];
    const prev = new Date(first);
    prev.setFullYear(prev.getFullYear() - 1);
    stub = (first.getTime() - settle.getTime()) / (first.getTime() - prev.getTime());
  }
  const flows: CashFlow[] = dates.map((date, i) => {
    const last = i === dates.length - 1;
    return {
      date,
      t: stub + i,
      amount: titles * (coupon + (last ? b.nominal : 0)),
      label: last ? "Coupon + capital" : "Coupon",
    };
  });
  const irr = solveIrr(outlay, flows);
  const gain = flows.reduce((s, f) => s + f.amount, 0) - outlay;
  return {
    titles,
    accruedDays,
    accruedPerTitle,
    accrued: titles * accruedPerTitle,
    pricePerTitle,
    outlay,
    commission: (outlay * (b.commissionPct ?? 0)) / 100,
    gain,
    irr,
    flows,
  };
}

export interface BtaInput {
  nominal: number;
  settleOn: string;
  maturityOn: string;
}

export interface BtaResult {
  n: number;
  days: number;
  pricePerBond: number;
  outlay: number;
  redemption: number;
  gain: number;
  yieldPct: number; // actuarial, 365-day
}

/** Treasury bill with precounted interest: price = N × (1 − r × d/360). */
export function btaCalc(b: BtaInput, amount: number, precountRatePct: number): BtaResult {
  const days = daysBetween(b.settleOn, b.maturityOn);
  const p = 1 - (precountRatePct / 100) * (days / 360);
  const pricePerBond = b.nominal * p;
  const n = Math.max(0, Math.floor(amount / pricePerBond));
  return {
    n,
    days,
    pricePerBond,
    outlay: n * pricePerBond,
    redemption: n * b.nominal,
    gain: n * b.nominal * (1 - p),
    yieldPct: ((1 / p - 1) * 365 * 100) / days,
  };
}

/** Number of BTA bonds whose price sums to at most `amount`… used for reference blocks. */
export function btaAmountForBonds(b: BtaInput, n: number, precountRatePct: number): number {
  const days = daysBetween(b.settleOn, b.maturityOn);
  const p = 1 - (precountRatePct / 100) * (days / 360);
  return n * b.nominal * p + 1;
}

export interface AmortInput {
  nominal: number; // remaining nominal per title
  couponRate: number; // % p.a. on the outstanding nominal
  settleOn: string;
  maturityOn: string;
  periodsPerYear: 1 | 2 | 4;
  graceUntil?: string; // payment dates up to this one repay no capital
  commissionPct?: number;
}

/** Payment dates strictly after settlement, stepping back from maturity by the period. */
export function paymentDates(settleOn: string, maturityOn: string, periodsPerYear: number): Date[] {
  const settle = parseDate(settleOn);
  const out: Date[] = [];
  const d = parseDate(maturityOn);
  const step = 12 / periodsPerYear;
  while (d > settle) {
    out.unshift(new Date(d));
    d.setMonth(d.getMonth() - step);
  }
  return out;
}

/**
 * A listed bond repaid in equal capital instalments on each payment date after
 * its grace period (the schedule of every BVMAC fiche signalétique), bought at a
 * clean price plus the interest accrued since the last payment. Yield is the
 * annual rate that discounts every flow (actual/365) to the outlay.
 */
export function amortCalc(b: AmortInput, nominalAmount: number, pricePct: number): BondResult {
  const titles = Math.max(0, Math.floor(nominalAmount / b.nominal));
  const dates = paymentDates(b.settleOn, b.maturityOn, b.periodsPerYear);
  const settle = parseDate(b.settleOn);
  const periodRate = b.couponRate / 100 / b.periodsPerYear;
  const amortising = dates.filter((d) => !b.graceUntil || d > parseDate(b.graceUntil));
  const instalment = amortising.length ? b.nominal / amortising.length : 0;
  // Accrued interest: the fraction of the current period already elapsed at settlement.
  const prev = dates.length ? new Date(dates[0]) : settle;
  if (dates.length) prev.setMonth(prev.getMonth() - 12 / b.periodsPerYear);
  const periodDays = dates.length ? (dates[0].getTime() - prev.getTime()) / DAY : 1;
  const accruedDays = dates.length ? Math.max(0, Math.round((settle.getTime() - prev.getTime()) / DAY)) : 0;
  const accruedPerTitle = periodRate * b.nominal * (accruedDays / periodDays);
  const pricePerTitle = (b.nominal * pricePct) / 100;
  const outlay = titles * (pricePerTitle + accruedPerTitle);
  let outstanding = b.nominal;
  const flows: CashFlow[] = dates.map((date, i) => {
    const interest = periodRate * outstanding;
    const capital = amortising.includes(date) ? Math.min(instalment, outstanding) : 0;
    outstanding -= capital;
    const last = i === dates.length - 1;
    return { date, t: (date.getTime() - settle.getTime()) / DAY / 365, amount: titles * (interest + (last ? capital + outstanding : capital)), label: capital > 0 ? "Coupon + capital" : "Coupon" };
  });
  const irr = solveIrr(outlay, flows);
  const gain = flows.reduce((s, f) => s + f.amount, 0) - outlay;
  return { titles, accruedDays, accruedPerTitle, accrued: titles * accruedPerTitle, pricePerTitle, outlay, commission: (outlay * (b.commissionPct ?? 0)) / 100, gain, irr, flows };
}
