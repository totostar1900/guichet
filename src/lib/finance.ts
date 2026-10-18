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

/** "2 ans 11 mois" : la même durée sans la conjonction, pour une colonne étroite. */
export function tenorCourt(from: string, to: string): string {
  return tenorText(from, to).replace(" et ", " ");
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

/**
 * LE CHEMIN INVERSE : QUEL PRIX DONNE CE RENDEMENT ?
 *
 * `bondCalc` va du prix au rendement. Le desk, lui, pense dans l'autre sens :
 * il arrête « je sers à 7,28 % », et le prix client en découle. Il n'existe pas
 * de formule fermée pour remonter, il faut chercher.
 *
 * ON BISSECTE SUR LE PRIX EN RÉEMPLOYANT `bondCalc`, plutôt que d'écrire une
 * seconde formule d'actualisation. Les deux divergeraient : une maquette l'a
 * montré le 18 octobre 2026, un modèle à coupon annuel donnant 98,36 là où la
 * fiche affichait 96,50 pour le même rendement, presque deux points d'écart.
 * Le prix rendu ici est donc, par construction, celui que la fiche affichera.
 *
 * LA FONCTION EST MONOTONE DÉCROISSANTE : un prix plus haut rend moins. La
 * bissection s'appuie dessus, et c'est la seule chose qu'elle suppose.
 *
 * Elle rend `undefined` plutôt qu'un nombre approché quand la cible est hors
 * d'atteinte dans l'intervalle fouillé : un prix de dernier recours entrerait
 * dans un champ sans se distinguer d'un prix calculé.
 */
export function prixPourRendement(b: BondInput, rendementPct: number, nominalAmount = 10_000_000): number | undefined {
  if (!Number.isFinite(rendementPct)) return undefined;
  const y = (prix: number) => bondCalc(b, nominalAmount, prix).irr;

  /* Les bornes couvrent tout ce qu'un Trésor de la zone a jamais servi, de la
     décote profonde à la prime, sans prétendre couvrir l'impossible. */
  let bas = 1;
  let haut = 300;
  const yBas = y(bas);
  const yHaut = y(haut);
  if (!Number.isFinite(yBas) || !Number.isFinite(yHaut)) return undefined;
  if (rendementPct > yBas || rendementPct < yHaut) return undefined;

  for (let i = 0; i < 100; i++) {
    const m = (bas + haut) / 2;
    if (y(m) > rendementPct) bas = m;
    else haut = m;
  }
  const prix = (bas + haut) / 2;
  return Number.isFinite(prix) ? prix : undefined;
}

/**
 * Le taux précompté qui donne ce rendement, pour un bon.
 *
 * Un bon ne se cote pas en prix mais en taux précompté, et le lien entre les
 * deux est fermé : rendement = (1/p − 1) × 365 / jours, avec p = 1 − r × d/360.
 * On pourrait l'inverser à la main ; on bissecte quand même sur `btaCalc`, pour
 * la même raison que ci-dessus : une seconde écriture de la même formule finit
 * par diverger de la première, et c'est toujours le jour où personne ne regarde.
 */
export function tauxPrecompteForRendement(b: BtaInput, rendementPct: number, nominalAmount = 10_000_000): number | undefined {
  if (!Number.isFinite(rendementPct)) return undefined;
  const y = (taux: number) => btaCalc(b, nominalAmount, taux).yieldPct;
  let bas = 0.001;
  let haut = 60;
  if (!Number.isFinite(y(bas)) || !Number.isFinite(y(haut))) return undefined;
  if (rendementPct < y(bas) || rendementPct > y(haut)) return undefined;
  for (let i = 0; i < 100; i++) {
    const m = (bas + haut) / 2;
    if (y(m) > rendementPct) haut = m;
    else bas = m;
  }
  const taux = (bas + haut) / 2;
  return Number.isFinite(taux) ? taux : undefined;
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

/**
 * Le règlement se compte en jours ouvrés, pas en jours de calendrier.
 *
 * T+3 sur un ordre passé jeudi règle le mardi suivant, pas le dimanche. Compté
 * en jours de calendrier, la date de règlement se trompait d'un ou deux jours
 * sur toute la fin de semaine, et avec elle le coupon couru facturé au client,
 * qui court jusqu'au règlement et non jusqu'à la négociation.
 *
 * Les jours fériés ne sont pas connus ici : ils diffèrent d'un État de la zone
 * à l'autre et demanderaient un calendrier tenu quelque part. Le week-end seul
 * corrige déjà l'essentiel de l'écart.
 */
export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from.getTime());
  /* ELLE RECULE AUSSI, depuis le 10 octobre 2026 : « il y a cinq jours
     ouvrés » est la même question que « dans cinq jours ouvrés », et deux
     fonctions pour un même calendrier finiraient par ne pas dire pareil. */
  const pas = n < 0 ? -1 : 1;
  let left = Math.abs(n);
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + pas);
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5) left--;
  }
  return d;
}
