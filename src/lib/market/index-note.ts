import "server-only";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { floatRotation, type IndexWeight } from "@/lib/market/index";
import { indexPageData, type IndexPageData } from "@/lib/market/index-data";

/**
 * The monthly index note: everything the note says, computed once from the
 * series already read at each bulletin. The wording lives here, the layout in
 * the PDF template; the desk reads and approves before anything is sent.
 */
export interface NoteMonth {
  /** « 2026-09 ». */
  key: string;
  label: string;
  from: string;
  to: string;
}

export interface NoteLine {
  mnemo: string;
  name: string;
  weight: number;
  move: number;
  points: number;
  amount: number;
  trades: number;
}

export interface IndexNote {
  month: NoteMonth;
  number: string;
  /** Level at the end of the month and at the end of the previous one. */
  level: number;
  levelBefore: number;
  ret: number;
  ytd?: number;
  year?: number;
  sessions: number;
  moved: number;
  up: number;
  down: number;
  missing: number;
  amount: number;
  trades: number;
  titles: number;
  high?: { date: string; value: number };
  low?: { date: string; value: number };
  /** Per share over the month, heaviest contribution first. */
  lines: NoteLine[];
  weights: IndexWeight[];
  capTotal: number;
  capFloat: number;
  rotation?: number;
  /** Sessions whose published change the prices we read do not reconstitute. */
  unexplained: { date: string; variationPct: number; movers: string }[];
  lastBulletin?: { number: number; date: string; ingestedAt: string; by: string };
  /** The three sentences the note leads with, written from the figures above. */
  headline: string;
  reading: string;
  caution: string;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;

/** The months the series covers, most recent first. */
export function noteMonths(d: IndexPageData): NoteMonth[] {
  const keys = [...new Set(d.stats.points.map((p) => p.date.slice(0, 7)))].sort().reverse();
  return keys.map((key) => {
    const days = d.stats.points.filter((p) => p.date.slice(0, 7) === key);
    return { key, label: monthLabel(key), from: days[0].date, to: days[days.length - 1].date };
  });
}

/** Everything the note of one month says. Undefined when that month has no session read. */
export async function indexNote(monthKey?: string, data?: IndexPageData): Promise<IndexNote | undefined> {
  const d = data ?? (await indexPageData());
  const months = noteMonths(d);
  if (months.length === 0) return undefined;
  const month = months.find((m) => m.key === monthKey) ?? months[0];
  const pts = d.stats.points;
  const inMonth = pts.filter((p) => p.date.slice(0, 7) === month.key);
  if (inMonth.length === 0) return undefined;
  const i0 = pts.findIndex((p) => p.date === inMonth[0].date);
  const before = i0 > 0 ? pts[i0 - 1] : inMonth[0];
  const last = inMonth[inMonth.length - 1];
  const ret = before.value > 0 ? (last.value / before.value - 1) * 100 : 0;
  const moved = inMonth.filter((p) => (p.variationPct ?? 0) !== 0);
  const yearStart = pts.filter((p) => p.date < `${month.key.slice(0, 4)}-01-01`).pop();
  const yearAgo = pts.filter((p) => p.date <= new Date(new Date(`${last.date}T12:00:00Z`).getTime() - 365 * 86400e3).toISOString().slice(0, 10)).pop();
  // trading of the month, all shares and per share
  const perShare = new Map<string, { amount: number; trades: number; titles: number }>();
  let amount = 0;
  let trades = 0;
  let titles = 0;
  for (const p of inMonth) {
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
  // each share's own move over the month, and its contribution in index points
  const nameOf = d.nameOf;
  const lines: NoteLine[] = d.histories
    .map(({ w, quotes }) => {
      const before0 = quotes.filter((q) => q.sessionDate < month.from).pop() ?? quotes.find((q) => q.sessionDate >= month.from);
      const end = quotes.filter((q) => q.sessionDate <= month.to).pop();
      const move = before0 && end && before0.close > 0 ? (end.close / before0.close - 1) * 100 : 0;
      const t = perShare.get(w.mnemo) ?? { amount: 0, trades: 0, titles: 0 };
      return { mnemo: w.mnemo, name: nameOf(w.mnemo), weight: w.weightTotal, move, points: (w.weightTotal / 100) * move, amount: t.amount, trades: t.trades };
    })
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  // the sessions our prices do not reconstitute : the same test as Santé, over the month
  const unexplained = moved
    .map((p) => {
      const movers = d.movers.get(p.date) ?? [];
      const nz = movers.filter((m) => m.variationPct !== 0);
      const expected = nz.reduce((s, m) => s + ((d.weights.find((w) => w.mnemo === m.mnemo)?.weightTotal ?? 0) / 100) * m.variationPct, 0);
      const ratio = p.variationPct ? expected / p.variationPct : 0;
      return { p, nz, ok: nz.length > 0 && ratio > 0.5 && ratio < 2 };
    })
    .filter((x) => !x.ok)
    .map((x) => ({ date: x.p.date, variationPct: x.p.variationPct ?? 0, movers: x.nz.length ? x.nz.map((m) => `${m.mnemo} ${signed(m.variationPct)}`).join(" · ") : "aucun cours modifié dans nos lectures" }));
  const capTotal = d.weights.reduce((s, w) => s + w.capTotal, 0);
  const capFloat = d.weights.reduce((s, w) => s + w.capFloat, 0);
  const rot = d.histories.map(({ quotes }) => floatRotation(quotes)).filter(Boolean);
  const rotation = capFloat ? (rot.reduce((s, r) => s + (r?.amount ?? 0), 0) / capFloat) * 100 : undefined;
  const high = inMonth.reduce((a, p) => (!a || p.value > a.value ? p : a), inMonth[0]);
  const low = inMonth.reduce((a, p) => (!a || p.value < a.value ? p : a), inMonth[0]);
  const top = lines[0];
  const best = [...lines].sort((a, b) => b.move - a.move)[0];

  // the three sentences : written from the figures, never from an opinion
  const headline =
    moved.length === 0
      ? `Aucune séance du mois n'a fait bouger l'indice : il reste à ${fmt(last.value)} points, comme à la fin de ${monthLabel(before.date.slice(0, 7))}.`
      : `L'indice termine ${month.label} à ${fmt(last.value)} points, ${signed(ret)} sur le mois, après ${moved.length} séance${moved.length > 1 ? "s" : ""} avec mouvement sur ${inMonth.length} lues.`;
  const reading =
    top && Math.abs(top.points) > 0.01
      ? `${top.mnemo} explique l'essentiel du mouvement : ${signed(top.move, 1)} sur son cours pour un poids de ${fmtPct(top.weight, 1)}, soit ${signed(top.points, 2).replace(" %", " point")} d'indice.${best && best.mnemo !== top.mnemo && best.move > top.move ? ` La plus forte hausse du mois revient à ${best.mnemo}, ${signed(best.move, 1)}, dont le poids de ${fmtPct(best.weight, 1)} limite l'effet sur l'indice.` : ""}`
      : `Aucune valeur n'a pesé sur l'indice ce mois-ci.`;
  const caution =
    amount > 0
      ? `${money(amount)} FCFA ont changé de mains en ${trades} transaction${trades > 1 ? "s" : ""} : le marché reste étroit, une position se construit et se défait en plusieurs séances, à l'ordre à cours limité.`
      : `Aucune transaction sur les actions ce mois-ci : le niveau de l'indice reflète les derniers cours connus, pas un prix auquel on peut acheter ou vendre aujourd'hui.`;

  return {
    month,
    number: `PC-IDX-${month.key.replace("-", "")}`,
    level: last.value,
    levelBefore: before.value,
    ret,
    ytd: yearStart && yearStart.value > 0 ? (last.value / yearStart.value - 1) * 100 : undefined,
    year: yearAgo && yearAgo.value > 0 ? (last.value / yearAgo.value - 1) * 100 : undefined,
    sessions: inMonth.length,
    moved: moved.length,
    up: moved.filter((p) => (p.variationPct ?? 0) > 0).length,
    down: moved.filter((p) => (p.variationPct ?? 0) < 0).length,
    missing: d.missing.filter((day) => day.slice(0, 7) === month.key).length,
    amount,
    trades,
    titles,
    high: { date: high.date, value: high.value },
    low: { date: low.date, value: low.value },
    lines,
    weights: d.weights,
    capTotal,
    capFloat,
    rotation,
    unexplained,
    lastBulletin: d.lastBulletin ? { number: d.lastBulletin.number, date: d.lastBulletin.sessionDate, ingestedAt: d.lastBulletin.ingestedAt, by: d.lastBulletin.ingestedBy === "cron" ? "le robot" : "le desk" } : undefined,
    headline,
    reading,
    caution,
  };
}

/** The one line the desk reads in Santé or in a message: the month in a sentence. */
export const noteSummary = (n: IndexNote): string => `${n.month.label} : ${fmt(n.level)} (${signed(n.ret)}), ${n.moved} séance(s) avec mouvement, ${money(n.amount)} FCFA échangés${n.unexplained.length ? `, ${n.unexplained.length} séance(s) à éclaircir` : ""}.`;
