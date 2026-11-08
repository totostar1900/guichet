import "server-only";
import { fmt, fmtPct, money } from "@/lib/format";
import { floatRotation } from "@/lib/market/index";
import { indexPageData, type IndexPageData } from "@/lib/market/index-data";
import { activiteDeLaPeriode, type ActiviteDeSeance, type ComparaisonBase100 } from "@/lib/market/index-series";
import { lignesDeLaPeriode, partDeLaFinance, repartition, statsDeSeance } from "@/lib/market/index-period";

/**
 * The quarterly note on the index, written for a client: what the quarter did,
 * which company carried it, the seven companies behind the number, what the
 * index measures and what it does not. Everything is computed from the sessions
 * of that quarter only, so a published quarter never changes afterwards.
 */
/**
 * A sentence the note writes: the French text is the dictionary key, the
 * figures are its values. The page and the desk pass it through t(); the PDF,
 * which is a French document, fills it with `fill`.
 */
export interface Sentence {
  key: string;
  vars?: Record<string, string | number>;
}

/** The French reading of a sentence: the key with its values put in. */
export const fill = (s: Sentence): string => s.key.replace(/\{(\w+)\}/g, (m, k) => String(s.vars?.[k] ?? m));
export const fillAll = (ss: Sentence[]): string => ss.map(fill).join(" ");

export interface QuarterKey {
  /** « 2026-T3 ». */
  key: string;
  label: string;
  year: number;
  q: number;
  from: string;
  to: string;
}

export interface QuarterLine {
  mnemo: string;
  name: string;
  sector: string;
  country: string;
  activity: string;
  holder?: string;
  /** Share of the first core shareholder, so a sentence can cite only the ones that carry it. */
  holderPct?: number;
  price: number;
  dividend?: number;
  yield?: number;
  weight: number;
  weightFloat: number;
  floatShare: number;
  move: number;
  points: number;
  amount: number;
  trades: number;
  rotation?: number;
  /** Le cours sur le trimestre, à la base 100 de son début, une valeur par séance de la courbe. */
  serie: number[];
}

export interface QuarterNote {
  quarter: QuarterKey;
  number: string;
  level: number;
  levelBefore: number;
  ret: number;
  year?: number;
  sessions: number;
  moved: number;
  up: number;
  down: number;
  missing: number;
  high: { date: string; value: number };
  low: { date: string; value: number };
  amount: number;
  trades: number;
  titles: number;
  capTotal: number;
  capFloat: number;
  rotation?: number;
  lines: QuarterLine[];
  /** L'indice, la société la plus lourde et le reste de la cote, à la base 100 du début du trimestre. */
  compare?: ComparaisonBase100;
  /** Level at the end of each month of the quarter, for the figure. */
  monthly: { label: string; value: number; ret: number }[];
  /** Sessions of the quarter that moved, most recent first, with what traded. */
  movedSessions: { date: string; variationPct: number; movers: string }[];
  bySector: { label: string; pct: number }[];
  byCountry: { label: string; pct: number }[];
  /** The sentences the note leads with, written from the figures. */
  headline: Sentence[];
  reading: Sentence[];
  caution: Sentence[];
  /** Every session of the quarter, for the curve. */
  points: { date: string; value: number; variationPct: number }[];
  /** The same sessions with what traded and the listed capitalisation, for the volume and capitalisation panels. */
  activity: ActiviteDeSeance[];
  /** The session that moved the index most, for the annotation on the curve. */
  peak?: { date: string; variationPct: number; movers: string };
  /** Session statistics: what an honest reading of the risk looks like on this market. */
  stats: {
    avg: number;
    sd: number;
    /** Annualised on every session read, then on the sessions that actually moved. */
    volAll?: number;
    volMoved?: number;
    /** Deepest fall from a high inside the quarter, in %. */
    drawdown: number;
    drawdownFrom?: string;
    drawdownTo?: string;
  };
  /** Weight of the financial sectors: the index is, for the most part, a banking reading. */
  financePct: number;
  /** True when a session's published change is not reconstituted by the prices read: said in one line, never detailed to a client. */
  methodOpen: boolean;
}

const QLABEL = (y: number, q: number) => `${q}${q === 1 ? "er" : "e"} trimestre ${y}`;
const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** The quarters the series covers, most recent first, and only those already closed. */
export function quarters(d: IndexPageData, includeCurrent = false): QuarterKey[] {
  const pts = d.stats.points;
  if (pts.length === 0) return [];
  const keys = [...new Set(pts.map((p) => `${p.date.slice(0, 4)}-T${Math.floor((Number(p.date.slice(5, 7)) - 1) / 3) + 1}`))];
  const now = new Date();
  const curKey = `${now.getUTCFullYear()}-T${Math.floor(now.getUTCMonth() / 3) + 1}`;
  return keys
    .sort()
    .reverse()
    .filter((k) => includeCurrent || k !== curKey)
    .map((key) => {
      const year = Number(key.slice(0, 4));
      const q = Number(key.slice(6));
      const days = pts.filter((p) => p.date.slice(0, 4) === String(year) && Math.floor((Number(p.date.slice(5, 7)) - 1) / 3) + 1 === q);
      return { key, label: QLABEL(year, q), year, q, from: days[0].date, to: days[days.length - 1].date };
    });
}

/** Everything the quarterly note says. Undefined when that quarter has no session read. */
export async function quarterNote(key?: string, data?: IndexPageData): Promise<QuarterNote | undefined> {
  const d = data ?? (await indexPageData());
  const list = quarters(d, true);
  if (list.length === 0) return undefined;
  const quarter = list.find((x) => x.key === key) ?? list.find((x) => x.key !== `${new Date().getUTCFullYear()}-T${Math.floor(new Date().getUTCMonth() / 3) + 1}`) ?? list[0];
  const pts = d.stats.points;
  const inQ = pts.filter((p) => p.date >= quarter.from && p.date <= quarter.to);
  if (inQ.length === 0) return undefined;
  const i0 = pts.findIndex((p) => p.date === inQ[0].date);
  const before = i0 > 0 ? pts[i0 - 1] : inQ[0];
  const last = inQ[inQ.length - 1];
  const ret = before.value > 0 ? (last.value / before.value - 1) * 100 : 0;
  const moved = inQ.filter((p) => (p.variationPct ?? 0) !== 0);
  const yearAgo = pts.filter((p) => p.date <= new Date(new Date(`${last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10)).pop();

  // trading of the quarter, in total and per share
  const perShare = new Map<string, { amount: number; trades: number; titles: number }>();
  let amount = 0;
  let trades = 0;
  let titles = 0;
  for (const p of inQ) {
    const s = d.trading.get(p.date);
    if (!s) continue;
    amount += s.amount;
    trades += s.trades;
    titles += s.titles;
    for (const [m, v] of Object.entries(s.shares)) {
      const cur = perShare.get(m) ?? { amount: 0, trades: 0, titles: 0 };
      cur.amount += v.amount;
      cur.trades += v.trades;
      cur.titles += v.titles;
      perShare.set(m, cur);
    }
  }

  const { lines, compare: comparaison } = await lignesDeLaPeriode(d, quarter.from, quarter.to);
  const capTotal = d.weights.reduce((s, w) => s + w.capTotal, 0);
  const capFloat = d.weights.reduce((s, w) => s + w.capFloat, 0);
  const rotation = capFloat ? (d.histories.reduce((s, h) => s + (floatRotation(h.quotes)?.amount ?? 0), 0) / capFloat) * 100 : undefined;
  const high = inQ.reduce((a, p) => (p.value > a.value ? p : a), inQ[0]);
  const low = inQ.reduce((a, p) => (p.value < a.value ? p : a), inQ[0]);

  // month ends inside the quarter, for the figure
  const monthly: { label: string; value: number; ret: number }[] = [];
  for (const m of [...new Set(inQ.map((p) => p.date.slice(0, 7)))]) {
    const days = inQ.filter((p) => p.date.slice(0, 7) === m);
    const prevEnd = monthly.length ? monthly[monthly.length - 1].value : before.value;
    const end = days[days.length - 1].value;
    monthly.push({ label: MONTHS[Number(m.slice(5, 7)) - 1], value: end, ret: prevEnd > 0 ? (end / prevEnd - 1) * 100 : 0 });
  }

  const movedSessions = [...moved].reverse().map((p) => ({
    date: p.date,
    variationPct: p.variationPct ?? 0,
    movers: (d.movers.get(p.date) ?? []).filter((m) => m.variationPct !== 0).map((m) => `${m.mnemo} ${signed(m.variationPct)}`).join(" · "),
  }));

  const group = (pick: (l: QuarterLine) => string) => repartition(lines, pick);

  // the reconciliation, said in one line only : the detail stays internal
  const methodOpen = moved.some((p) => {
    const nz = (d.movers.get(p.date) ?? []).filter((m) => m.variationPct !== 0);
    const expected = nz.reduce((s, m) => s + ((d.weights.find((w) => w.mnemo === m.mnemo)?.weightTotal ?? 0) / 100) * m.variationPct, 0);
    const ratio = p.variationPct ? expected / p.variationPct : 0;
    return !(nz.length > 0 && ratio > 0.5 && ratio < 2);
  });

  const stats = statsDeSeance(inQ);

  // the session that carried the quarter, named on the curve
  const peakSession = moved.reduce<(typeof moved)[number] | undefined>((a, p) => (a && Math.abs(a.variationPct ?? 0) >= Math.abs(p.variationPct ?? 0) ? a : p), undefined);
  const peak = peakSession
    ? {
        date: peakSession.date,
        variationPct: peakSession.variationPct ?? 0,
        movers: (d.movers.get(peakSession.date) ?? []).filter((m) => m.variationPct !== 0).map((m) => `${m.mnemo} ${signed(m.variationPct)}`).join(" · "),
      }
    : undefined;

  // four of the seven are financial : the reading is, for the most part, a banking one
  const financePct = partDeLaFinance(lines);

  const top = lines.reduce((a, l) => (Math.abs(l.points) > Math.abs(a.points) ? l : a), lines[0]);
  const best = [...lines].sort((a, b) => b.move - a.move)[0];
  const headline: Sentence[] =
    moved.length === 0
      ? [{ key: "Aucune séance du trimestre n'a fait bouger l'indice : il reste à {v} points.", vars: { v: fmt(last.value) } }]
      : [
          {
            key:
              moved.length > 1
                ? "L'indice BVMAC All Share termine le {q} à {v} points, {r} sur le trimestre, après {m} séances avec mouvement sur {n} séances lues."
                : "L'indice BVMAC All Share termine le {q} à {v} points, {r} sur le trimestre, après une seule séance avec mouvement sur {n} séances lues.",
            vars: { q: quarter.label, v: fmt(last.value), r: signed(ret), m: moved.length, n: inQ.length },
          },
        ];
  const reading: Sentence[] =
    top && Math.abs(top.points) > 0.01
      ? [
          {
            key: "{c} porte le mouvement : {m} sur son cours et un poids de {w} de la cote, soit {p} d'indice.",
            vars: { c: top.name, m: signed(top.move, 1), w: fmtPct(top.weight, 1), p: signed(top.points, 2).replace(" %", " point") },
          },
          ...(best && best.mnemo !== top.mnemo && best.move > top.move
            ? [
                {
                  key: "La plus forte hausse du trimestre est celle de {c}, {m}, dont le poids de {w} limite l'effet sur l'indice.",
                  vars: { c: best.name, m: signed(best.move, 1), w: fmtPct(best.weight, 1) },
                },
              ]
            : []),
        ]
      : [{ key: "Aucune valeur n'a pesé sur l'indice ce trimestre." }];
  const caution: Sentence[] =
    amount > 0
      ? [
          {
            key:
              trades > 1
                ? "{a} FCFA ont changé de mains en {n} transactions sur l'ensemble de la cote."
                : "{a} FCFA ont changé de mains en une seule transaction sur l'ensemble de la cote.",
            vars: { a: money(amount), n: trades },
          },
          { key: "Une position se construit et se défait en plusieurs séances : passez par un ordre à cours limité et donnez-lui du temps." },
        ]
      : [{ key: "Aucune transaction sur les actions ce trimestre : le niveau de l'indice reflète les derniers cours connus, pas un prix auquel acheter ou vendre aujourd'hui." }];

  return {
    quarter,
    number: `PC-IDX-${quarter.year}T${quarter.q}`,
    level: last.value,
    levelBefore: before.value,
    ret,
    year: yearAgo && yearAgo.value > 0 ? (last.value / yearAgo.value - 1) * 100 : undefined,
    sessions: inQ.length,
    moved: moved.length,
    up: moved.filter((p) => (p.variationPct ?? 0) > 0).length,
    down: moved.filter((p) => (p.variationPct ?? 0) < 0).length,
    missing: d.missing.filter((day) => day >= quarter.from && day <= quarter.to).length,
    high: { date: high.date, value: high.value },
    low: { date: low.date, value: low.value },
    amount,
    trades,
    titles,
    capTotal,
    capFloat,
    rotation,
    lines,
    monthly,
    movedSessions,
    compare: comparaison,
    points: inQ.map((p) => ({ date: p.date, value: p.value, variationPct: p.variationPct ?? 0 })),
    activity: activiteDeLaPeriode(d, quarter.from, quarter.to),
    peak,
    stats,
    financePct,
    bySector: group((l) => l.sector),
    byCountry: group((l) => l.country),
    headline,
    reading,
    caution,
    methodOpen,
  };
}
