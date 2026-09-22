import "server-only";
import { repo } from "@/lib/data";
import type { MarketBulletin, Quote } from "@/lib/domain/market";
import { indexSeries, indexStats, indexWeights, type IndexPoint, type IndexStats, type IndexWeight } from "@/lib/market/index";
import { loadCompanies } from "@/lib/reference";

export interface SessionTrading {
  titles: number;
  amount: number;
  trades: number;
  /** Per share : mnemo → titles, amount, trades, variation. */
  shares: Record<string, { titles: number; amount: number; trades: number; variationPct: number }>;
}

export interface IndexPageData {
  stats: IndexStats;
  weights: IndexWeight[];
  nameOf: (mnemo: string) => string;
  /** The seven equity histories, oldest first. */
  histories: { w: IndexWeight; quotes: Quote[] }[];
  /** Session date → the equity trading of that session. */
  trading: Map<string, SessionTrading>;
  /** Session date → the shares that traded or changed price. */
  movers: Map<string, { mnemo: string; variationPct: number }[]>;
  /** The last bulletin read, for the data panel. */
  lastBulletin?: MarketBulletin;
  /** Weekdays between the first and last session with no bulletin read (holidays included). */
  missing: string[];
}

const shift = (iso: string, days: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - days * 86400e3).toISOString().slice(0, 10);

/** Everything the index page and its exports need, assembled once. */
export async function indexPageData(): Promise<IndexPageData> {
  const r = repo();
  const [bulletins, latest, companies] = await Promise.all([r.listBulletins(2000).catch(() => []), r.latestQuotes().catch(() => []), loadCompanies().catch(() => [])]);
  const stats = indexStats(indexSeries(bulletins));
  const weights = indexWeights(latest);
  const nameOf = (mnemo: string) => companies.find((c) => c.mnemo === mnemo)?.shortName ?? mnemo;
  const histories = await Promise.all(weights.map(async (w) => ({ w, quotes: (await r.listQuotes(w.isin, 2000).catch(() => [])).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)) })));
  const trading = new Map<string, SessionTrading>();
  const movers = new Map<string, { mnemo: string; variationPct: number }[]>();
  for (const { w, quotes } of histories) {
    for (const q of quotes) {
      const s = trading.get(q.sessionDate) ?? { titles: 0, amount: 0, trades: 0, shares: {} };
      s.titles += q.volumeTraded || 0;
      s.amount += q.valueTraded || 0;
      s.trades += q.trades || 0;
      s.shares[w.mnemo] = { titles: q.volumeTraded || 0, amount: q.valueTraded || 0, trades: q.trades || 0, variationPct: q.variationPct };
      trading.set(q.sessionDate, s);
      if (q.variationPct !== 0 || q.trades > 0) movers.set(q.sessionDate, [...(movers.get(q.sessionDate) ?? []), { mnemo: w.mnemo, variationPct: q.variationPct }]);
    }
  }
  const dated = new Set(stats.points.map((p) => p.date));
  const missing: string[] = [];
  if (stats.points.length > 1) {
    const first = stats.points[0].date;
    const last = stats.points[stats.points.length - 1].date;
    for (let d = first; d < last; d = shift(d, -1)) {
      const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
      if (dow >= 1 && dow <= 5 && !dated.has(d)) missing.push(d);
    }
  }
  const lastBulletin = stats.last ? bulletins.find((b) => b.sessionDate === stats.last!.date) : undefined;
  return { stats, weights, nameOf, histories, trading, movers, lastBulletin, missing };
}

/** The index series with the trading of each session : one row per session, oldest first. */
export function indexRows(d: IndexPageData): (IndexPoint & { titles: number; amount: number; trades: number; movers: string })[] {
  return d.stats.points.map((p) => {
    const s = d.trading.get(p.date);
    return { ...p, titles: s?.titles ?? 0, amount: s?.amount ?? 0, trades: s?.trades ?? 0, movers: (d.movers.get(p.date) ?? []).map((m) => `${m.mnemo} ${m.variationPct > 0 ? "+" : ""}${m.variationPct.toFixed(2)} %`).join(" · ") };
  });
}
