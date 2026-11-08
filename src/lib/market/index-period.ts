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
export function repartition(lines: QuarterLine[], pick: (l: QuarterLine) => string): { label: string; pct: number }[] {
  const by = new Map<string, number>();
  for (const l of lines) by.set(pick(l), (by.get(pick(l)) ?? 0) + l.weight);
  return [...by.entries()].map(([label, pct]) => ({ label, pct })).sort((a, b) => b.pct - a.pct);
}

/** Part des secteurs financiers dans la capitalisation. */
export function partDeLaFinance(lines: QuarterLine[]): number {
  const FINANCE = /banqu|banca|assur|réassur|reassur|financ|holding/i;
  return lines.filter((l) => FINANCE.test(l.sector) || FINANCE.test(l.activity)).reduce((x, l) => x + l.weight, 0);
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
  const perYear = inQ.length * 4;
  return {
    avg,
    sd,
    volAll: sd ? sd * Math.sqrt(perYear) : undefined,
    volMoved: movedSd ? movedSd * Math.sqrt(Math.max(1, moved.length) * 4) : undefined,
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

/** Tout ce que la page de l'indice montre d'une période. */
export interface VueDePeriode {
  from: string;
  to: string;
  sessions: number;
  moved: number;
  ret: number;
  lines: QuarterLine[];
  compare?: ComparaisonBase100;
  bySector: { label: string; pct: number }[];
  byCountry: { label: string; pct: number }[];
  financePct: number;
  stats: StatsDeSeance;
  rotation?: number;
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
  const capFloat = d.weights.reduce((s, w) => s + w.capFloat, 0);
  const rotation = capFloat ? (d.histories.reduce((s, h) => s + (floatRotation(h.quotes)?.amount ?? 0), 0) / capFloat) * 100 : undefined;
  return {
    from,
    to,
    sessions: inQ.length,
    moved: inQ.filter((p) => (p.variationPct ?? 0) !== 0).length,
    ret: before.value > 0 ? (last.value / before.value - 1) * 100 : 0,
    lines,
    compare,
    bySector: repartition(lines, (l) => l.sector),
    byCountry: repartition(lines, (l) => l.country),
    financePct: partDeLaFinance(lines),
    stats: statsDeSeance(inQ),
    rotation,
    activity: activiteDeLaPeriode(d, from, to),
  };
}
