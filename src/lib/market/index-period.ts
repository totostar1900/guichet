import "server-only";
import { fmtPct } from "@/lib/format";
import { floatRotation } from "@/lib/market/index";
import type { IndexPageData } from "@/lib/market/index-data";
import type { QuarterLine } from "@/lib/market/index-quarter";
import { activiteDeLaPeriode, seriesDeLaPeriode, type ActiviteDeSeance, type ComparaisonBase100 } from "@/lib/market/index-series";
import { loadCompanies } from "@/lib/reference";

/**
 * LA LECTURE D'UNE PÉRIODE, UNE SEULE FOIS (8 novembre 2026, option A de « l'indice et la note »).
 *
 * La note trimestrielle et la page de l'indice lisent la même chose sur des périodes différentes : un trimestre clos pour l'une, la période choisie pour l'autre. Les sociétés de la
 * période (variation, contribution, négoce, séries à la base 100), la répartition par secteur et par pays, les statistiques de séance et la comparaison à 100 se calculent donc ici,
 * pour n'importe quelle période, et la note en tire les siennes.
 */

/** Les sociétés de la période : cours de début et de fin, poids, contribution, négoce, courbe à 100. */
/**
 * LE POINT DE DÉPART D'UNE PÉRIODE, ET LE POIDS QU'ON Y LIT (8 novembre 2026, « ce que chaque société a apporté » ne retombait pas sur la vue Contributions du graphe).
 *
 * La contribution d'une société est son poids EN DÉBUT DE PÉRIODE multiplié par la variation de son cours : c'est ce que la légende dit, et ce que la vue Contributions du graphe calcule
 * (cours du début × dernier nombre de titres lu, rapporté à la somme des sept). Le bloc écrivait pourtant le poids d'AUJOURD'HUI, et partait du dernier cours AVANT la période là où la vue
 * part du cours de la première séance. Deux départs, deux poids : deux séries de chiffres pour la même période. Il n'y en a plus qu'un.
 *
 * `base` : « avant » part du dernier cours précédant la période (la variation « du trimestre » d'une note, qui compte la première séance) ; « premiere » part du cours de la première
 * séance de la période, comme le graphe de la page de l'indice.
 */
export type BaseDePeriode = "avant" | "premiere";

export async function lignesDeLaPeriode(d: IndexPageData, from: string, to: string, base: BaseDePeriode = "avant"): Promise<{ lines: QuarterLine[]; compare?: ComparaisonBase100 }> {
  const dans = d.stats.points.filter((p) => p.date >= from && p.date <= to);
  const perShare = new Map<string, { amount: number; trades: number; titles: number }>();
  for (const p of dans) {
    const s = d.trading.get(p.date);
    if (!s) continue;
    for (const [m, v] of Object.entries(s.shares)) {
      const cur = perShare.get(m) ?? { amount: 0, trades: 0, titles: 0 };
      cur.amount += v.amount;
      cur.trades += v.trades;
      cur.titles += v.titles;
      perShare.set(m, cur);
    }
  }
  const companies = await loadCompanies().catch(() => []);
  const series = seriesDeLaPeriode(d, from, to);
  const premiere = dans[0]?.date ?? from;
  const departDe = (quotes: IndexPageData["histories"][number]["quotes"]) =>
    base === "premiere"
      ? (quotes.filter((q) => q.sessionDate <= premiere).pop() ?? quotes.find((q) => q.sessionDate > premiere))
      : (quotes.filter((q) => q.sessionDate < from).pop() ?? quotes.find((q) => q.sessionDate >= from));
  const titres = (quotes: IndexPageData["histories"][number]["quotes"]) => [...quotes].reverse().find((q) => (q.sharesTotal ?? 0) > 0)?.sharesTotal ?? 0;
  const capDeDepart = new Map(d.histories.map(({ w, quotes }) => [w.mnemo, (departDe(quotes)?.close ?? 0) * titres(quotes)]));
  const capTotaleDeDepart = [...capDeDepart.values()].reduce((a, b) => a + b, 0);
  const lines: QuarterLine[] = d.histories
    .map(({ w, quotes }) => {
      const start = departDe(quotes);
      const poidsDeDepart = capTotaleDeDepart ? ((capDeDepart.get(w.mnemo) ?? 0) / capTotaleDeDepart) * 100 : w.weightTotal;
      const end = quotes.filter((q) => q.sessionDate <= to).pop();
      const move = start && end && start.close > 0 ? (end.close / start.close - 1) * 100 : 0;
      const t = perShare.get(w.mnemo) ?? { amount: 0, trades: 0, titles: 0 };
      const c = companies.find((x) => x.mnemo === w.mnemo);
      const core = c?.coreShareholders?.[0];
      const rot = floatRotation(quotes);
      const price = end?.close ?? w.close;
      const dividend = end?.lastDividend ?? w.lastDividend;
      return {
        mnemo: w.mnemo,
        name: c?.shortName ?? d.nameOf(w.mnemo),
        sector: c?.sector ?? "—",
        country: c?.country ?? "—",
        activity: c?.activity ?? "",
        holder: core ? `${core.name} ${fmtPct(core.pct, 1)}` : undefined,
        holderPct: core?.pct,
        price,
        dividend,
        yield: dividend && price ? (dividend / price) * 100 : undefined,
        weight: w.weightTotal,
        weightFloat: w.weightFloat,
        floatShare: w.capTotal ? (w.capFloat / w.capTotal) * 100 : 0,
        move,
        weightStart: poidsDeDepart,
        points: (poidsDeDepart / 100) * move,
        amount: t.amount,
        trades: t.trades,
        rotation: rot?.pct,
        serie: series.parSociete[w.mnemo] ?? [],
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return { lines, compare: series.comparaison };
}

/** La répartition du poids par secteur ou par pays. */
export function repartition(lines: QuarterLine[], pick: (l: QuarterLine) => string, poids: (l: QuarterLine) => number = (l) => l.weight): { label: string; pct: number }[] {
  const by = new Map<string, number>();
  for (const l of lines) by.set(pick(l), (by.get(pick(l)) ?? 0) + poids(l));
  return [...by.entries()].map(([label, pct]) => ({ label, pct })).sort((a, b) => b.pct - a.pct);
}

/** Secteur ou pays : le poids au début et à la fin de la période, pour que la répartition suive les dates choisies. */
export interface RepartitionDeLaPeriode {
  label: string;
  debut: number;
  fin: number;
}
export function repartitionDebutFin(societes: SocieteCompare[], pick: (s: SocieteCompare) => string): RepartitionDeLaPeriode[] {
  const by = new Map<string, { debut: number; fin: number }>();
  for (const s of societes) {
    const cur = by.get(pick(s)) ?? { debut: 0, fin: 0 };
    cur.debut += s.poidsDebut;
    cur.fin += s.poidsFin;
    by.set(pick(s), cur);
  }
  return [...by.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.fin - a.fin);
}

/** Part des secteurs financiers dans la capitalisation. */
export function partDeLaFinance(lines: QuarterLine[], poids: (l: QuarterLine) => number = (l) => l.weight): number {
  const FINANCE = /banqu|banca|assur|réassur|reassur|financ|holding/i;
  return lines.filter((l) => FINANCE.test(l.sector) || FINANCE.test(l.activity)).reduce((x, l) => x + poids(l), 0);
}

export interface StatsDeSeance {
  avg: number;
  sd: number;
  volAll?: number;
  volMoved?: number;
  drawdown: number;
  drawdownFrom?: string;
  drawdownTo?: string;
}

/** Ce que les séances disent du risque : deux variabilités, parce que l'une d'elles est un artefact, et le repli le plus profond. */
export function statsDeSeance(inQ: { date: string; value: number; variationPct?: number }[]): StatsDeSeance {
  const moved = inQ.filter((p) => (p.variationPct ?? 0) !== 0);
  const vars = inQ.map((p) => p.variationPct ?? 0);
  const avg = vars.reduce((x, y) => x + y, 0) / Math.max(1, vars.length);
  const sd = Math.sqrt(vars.reduce((x, v) => x + (v - avg) ** 2, 0) / Math.max(1, vars.length - 1)) || 0;
  const movedVars = moved.map((p) => p.variationPct ?? 0);
  const movedAvg = movedVars.reduce((x, y) => x + y, 0) / Math.max(1, movedVars.length);
  const movedSd = movedVars.length > 1 ? Math.sqrt(movedVars.reduce((x, v) => x + (v - movedAvg) ** 2, 0) / (movedVars.length - 1)) : 0;
  /* L'annualisation suit la durée RÉELLE de la période : des séances par an, et non quatre fois le nombre de séances (qui ne vaut que pour un trimestre). */
  const jours = Math.max(1, (new Date(`${inQ[inQ.length - 1].date}T12:00:00Z`).getTime() - new Date(`${inQ[0].date}T12:00:00Z`).getTime()) / 86400e3 + 1);
  const perYear = (inQ.length * 365) / jours;
  return {
    avg,
    sd,
    volAll: sd ? sd * Math.sqrt(perYear) : undefined,
    volMoved: movedSd ? movedSd * Math.sqrt((Math.max(1, moved.length) * 365) / jours) : undefined,
    ...(() => {
      let peakV = inQ[0].value;
      let peakD = inQ[0].date;
      let dd = 0;
      let from: string | undefined;
      let to: string | undefined;
      for (const p of inQ) {
        if (p.value > peakV) {
          peakV = p.value;
          peakD = p.date;
        }
        const fall = peakV > 0 ? (p.value / peakV - 1) * 100 : 0;
        if (fall < dd) {
          dd = fall;
          from = peakD;
          to = p.date;
        }
      }
      return { drawdown: dd, drawdownFrom: from, drawdownTo: to };
    })(),
  };
}

/**
 * LES SOCIÉTÉS COMPARÉES SUR LA PÉRIODE (8 novembre 2026, planche « Sociétés de la cote », 4A).
 *
 * Quatre questions de client, une grandeur chacune : qui pèse (poids début → fin, et ce qui se négocie : le flottant), qui a bougé (le cours, et son écart avec l'indice), qui
 * s'échange (la part des échanges, à lire contre le poids) et à quelle profondeur (le montant moyen d'une transaction). Tout part de la première séance de la période, avec le dernier
 * nombre de titres lu, comme la vue Contributions du graphe : le poids de début n'est donc pas celui d'aujourd'hui.
 */
export interface SocieteCompare {
  mnemo: string;
  name: string;
  /** Ce que disaient les deux anciens tableaux, et que le tableau « Voir les chiffres » garde : activité, pays, cours de fin, rendement, capital global et flottant coté (FCFA), liquidité sur 3 mois, dernier dividende. */
  activity: string;
  sector: string;
  country: string;
  price: number;
  /** Dernier dividende (FCFA par titre) et rendement (dernier dividende / cours de fin, en %). */
  dividend?: number;
  yield?: number;
  /** Liquidité sur trois mois, telle que lue au bulletin (valeur courante, pas de la période). */
  liquidity3mPct?: number;
  capFin: number;
  capFlottantFin: number;
  poidsDebut: number;
  poidsFin: number;
  /** Poids sur le flottant coté, en fin de période : ce qui peut vraiment s'acheter. */
  poidsFlottantFin: number;
  move: number;
  /** Écart avec la variation de l'indice, en points de pourcentage. */
  ecart: number;
  amount: number;
  trades: number;
  /** Part de la valeur échangée sur la période, en %. */
  part: number;
  /** Montant moyen d'une transaction, en FCFA (0 sans transaction). */
  moyen: number;
  /** Séances où la société a traité, et séances de la période. */
  seancesAvecEchange: number;
}

export function comparaisonDesSocietes(d: IndexPageData, from: string, to: string, infos: Map<string, { name: string; sector: string; country: string; activity: string }>): { societes: SocieteCompare[]; rotation?: number; capFin: number; capFlottantFin: number } {
  const dans = d.stats.points.filter((p) => p.date >= from && p.date <= to);
  const premiere = dans[0]?.date ?? from;
  const derniere = dans[dans.length - 1]?.date ?? to;
  const indice = dans.length > 1 && dans[0].value > 0 ? (dans[dans.length - 1].value / dans[0].value - 1) * 100 : 0;
  const lire = (quotes: IndexPageData["histories"][number]["quotes"], date: string) => quotes.filter((q) => q.sessionDate <= date).pop() ?? quotes.find((q) => q.sessionDate > date);
  const titres = (quotes: IndexPageData["histories"][number]["quotes"], k: "sharesTotal" | "sharesFloat") => [...quotes].reverse().find((q) => (q[k] ?? 0) > 0)?.[k] ?? 0;
  const lignes = d.histories.map(({ w, quotes }) => {
    const c0 = lire(quotes, premiere)?.close ?? 0;
    const c1 = lire(quotes, derniere)?.close ?? 0;
    const st = titres(quotes, "sharesTotal");
    const sf = titres(quotes, "sharesFloat");
    let amount = 0;
    let trades = 0;
    let seances = 0;
    for (const p of dans) {
      const s = d.trading.get(p.date)?.shares[w.mnemo];
      if (!s) continue;
      amount += s.amount;
      trades += s.trades;
      if (s.trades > 0) seances++;
    }
    return { w, c0, c1, capDebut: c0 * st, capFin: c1 * st, capFlottantFin: c1 * sf, amount, trades, seances };
  });
  const somme = (k: "capDebut" | "capFin" | "capFlottantFin" | "amount") => lignes.reduce((a, l) => a + l[k], 0);
  const [sD, sF, sFl, sA] = [somme("capDebut"), somme("capFin"), somme("capFlottantFin"), somme("amount")];
  const societes = lignes
    .map((l) => {
      const move = l.c0 > 0 ? (l.c1 / l.c0 - 1) * 100 : 0;
      return {
        mnemo: l.w.mnemo,
        name: infos.get(l.w.mnemo)?.name ?? l.w.mnemo,
        activity: infos.get(l.w.mnemo)?.activity ?? "",
        sector: infos.get(l.w.mnemo)?.sector ?? "—",
        country: infos.get(l.w.mnemo)?.country ?? "—",
        price: l.c1,
        dividend: l.w.lastDividend,
        yield: l.w.lastDividend && l.c1 ? (l.w.lastDividend / l.c1) * 100 : undefined,
        liquidity3mPct: l.w.liquidity3mPct,
        capFin: l.capFin,
        capFlottantFin: l.capFlottantFin,
        poidsDebut: sD ? (l.capDebut / sD) * 100 : 0,
        poidsFin: sF ? (l.capFin / sF) * 100 : 0,
        poidsFlottantFin: sFl ? (l.capFlottantFin / sFl) * 100 : 0,
        move,
        ecart: move - indice,
        amount: l.amount,
        trades: l.trades,
        part: sA ? (l.amount / sA) * 100 : 0,
        moyen: l.trades ? l.amount / l.trades : 0,
        seancesAvecEchange: l.seances,
      };
    })
    .sort((a, b) => b.poidsFin - a.poidsFin);
  /* La rotation SUR LA PÉRIODE : la valeur échangée rapportée au flottant coté de la fin. */
  return { societes, rotation: sFl ? (sA / sFl) * 100 : undefined, capFin: sF, capFlottantFin: sFl };
}

/** Tout ce que la page de l'indice montre d'une période. */
export interface VueDePeriode {
  from: string;
  to: string;
  sessions: number;
  moved: number;
  ret: number;
  lines: QuarterLine[];
  compare?: ComparaisonBase100;
  bySector: RepartitionDeLaPeriode[];
  byCountry: RepartitionDeLaPeriode[];
  financePct: number;
  /** La part de la finance au début de la période. */
  financeDebut: number;
  stats: StatsDeSeance;
  /** La rotation du flottant SUR LA PÉRIODE (valeur échangée / flottant coté de la fin), et non sur douze mois fixes. */
  rotation?: number;
  societes: SocieteCompare[];
  /** Capital global et flottant coté de la cote, en fin de période (FCFA) : la ligne « Ensemble » du tableau. */
  capFin: number;
  capFlottantFin: number;
  activity: ActiviteDeSeance[];
}

export async function vueDePeriode(d: IndexPageData, from: string, to: string): Promise<VueDePeriode | undefined> {
  const pts = d.stats.points;
  const inQ = pts.filter((p) => p.date >= from && p.date <= to);
  if (inQ.length < 2) return undefined;
  /* Comme le graphe : la période part de sa première séance. */
  const before = inQ[0];
  const last = inQ[inQ.length - 1];
  const { lines, compare } = await lignesDeLaPeriode(d, from, to, "premiere");
  const infos = new Map(lines.map((l) => [l.mnemo, { name: l.name, sector: l.sector, country: l.country, activity: l.activity }]));
  const { societes, rotation, capFin, capFlottantFin } = comparaisonDesSocietes(d, from, to, infos);
  /* Secteurs, pays et finance se lisent au poids de FIN de période : ils suivent la sélection. */
  const poidsFin = (l: QuarterLine) => societes.find((s) => s.mnemo === l.mnemo)?.poidsFin ?? l.weight;
  return {
    from,
    to,
    sessions: inQ.length,
    moved: inQ.filter((p) => (p.variationPct ?? 0) !== 0).length,
    ret: before.value > 0 ? (last.value / before.value - 1) * 100 : 0,
    lines,
    compare,
    bySector: repartitionDebutFin(societes, (s) => s.sector),
    byCountry: repartitionDebutFin(societes, (s) => s.country),
    financePct: partDeLaFinance(lines, poidsFin),
    financeDebut: partDeLaFinance(lines, (l) => societes.find((s) => s.mnemo === l.mnemo)?.poidsDebut ?? l.weight),
    stats: statsDeSeance(inQ),
    rotation,
    societes,
    capFin,
    capFlottantFin,
    activity: activiteDeLaPeriode(d, from, to),
  };
}
