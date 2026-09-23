import type { MarketBulletin, Quote } from "@/lib/domain/market";

/**
 * The BVMAC All Share Index as the Guichet reads it: one level and one day
 * variation per bulletin (index_value, index_variation_pct), and the weights
 * of the seven listed shares from the bulletin's capitalisation page (kept
 * on each equity quote). The Guichet shows and explains the index; it never
 * builds one of its own nor measures a client against it.
 */
export interface IndexPoint {
  date: string; // session date, YYYY-MM-DD
  value: number;
  variationPct?: number;
}

export interface IndexStats {
  last?: IndexPoint;
  /** Variation on the last session, as published. */
  day?: number;
  /** Against the level one month, one year ago, and at the end of the previous year (percent). */
  month?: number;
  year?: number;
  ytd?: number;
  points: IndexPoint[];
}

/** The series, oldest first, from the bulletins that carried the index. */
export function indexSeries(bulletins: MarketBulletin[]): IndexPoint[] {
  return bulletins
    .filter((b) => b.indexValue != null && b.indexValue > 0)
    .map((b) => ({ date: b.sessionDate, value: b.indexValue!, variationPct: b.indexVariationPct }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The last point at or before a date (the level « at » that date, sessions being sparse). */
export function indexAt(points: IndexPoint[], date: string): IndexPoint | undefined {
  let out: IndexPoint | undefined;
  for (const p of points) {
    if (p.date <= date) out = p;
    else break;
  }
  return out;
}

const shift = (iso: string, days: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() - days * 86400e3).toISOString().slice(0, 10);
const pct = (from?: IndexPoint, to?: IndexPoint) => (from && to && from.value > 0 && from.date !== to.date ? ((to.value - from.value) / from.value) * 100 : undefined);

export function indexStats(points: IndexPoint[]): IndexStats {
  const last = points[points.length - 1];
  if (!last) return { points };
  const monthAgo = indexAt(points, shift(last.date, 30));
  const yearAgo = indexAt(points, shift(last.date, 365));
  const yearEnd = indexAt(points, `${Number(last.date.slice(0, 4)) - 1}-12-31`);
  return { last, day: last.variationPct, month: pct(monthAgo, last), year: pct(yearAgo, last), ytd: pct(yearEnd, last), points };
}

export interface IndexWeight {
  isin: string;
  mnemo: string;
  close: number;
  capTotal: number;
  capFloat: number;
  /** Share of the sum of capitalisations, in percent, on the global capital and on the quoted float. */
  weightTotal: number;
  weightFloat: number;
  lastDividend?: number;
  liquidity3mPct?: number;
}

/** The weights of the listed shares, from the latest quotes that carry the capitalisation page. */
export function indexWeights(quotes: Quote[]): IndexWeight[] {
  const eq = quotes.filter((q) => q.instrument === "action" && (q.marketCapTotal ?? 0) > 0);
  const T = eq.reduce((a, q) => a + (q.marketCapTotal ?? 0), 0);
  const F = eq.reduce((a, q) => a + (q.marketCapFloat ?? 0), 0);
  return eq
    .map((q) => ({ isin: q.isin, mnemo: q.mnemo, close: q.close, capTotal: q.marketCapTotal ?? 0, capFloat: q.marketCapFloat ?? 0, weightTotal: T ? ((q.marketCapTotal ?? 0) / T) * 100 : 0, weightFloat: F ? ((q.marketCapFloat ?? 0) / F) * 100 : 0, lastDividend: q.lastDividend, liquidity3mPct: q.liquidity3mPct }))
    .sort((a, b) => b.weightTotal - a.weightTotal);
}

/** « +1,23 % », dans la convention de la maison. */
const signedPct = (v: number, d = 2) => `${v > 0 ? "+" : ""}${v.toFixed(d).replace(".", ",")} %`;

/**
 * The index against the share prices of the same session.
 *
 * Two questions, in order. First the direction: a published variation with no
 * share price changed in the reading, or the reverse, says a page of the
 * bulletin was misread. Then the size: the published variation is rebuilt from
 * the prices of the same bulletin, weighted by the **quoted float** of that
 * session.
 *
 * The float is the weighting the series itself points to: tested over the
 * sessions read, it reconstitutes the published variation where the global
 * capitalisation does not, by a wide margin. It stays an inference until the
 * BVMAC confirms its methodology, so a gap is reported as something to look
 * at, never as an error of theirs.
 */
export function indexCheck(current: MarketBulletin | undefined, previousQuotes: Quote[], currentQuotes: Quote[]): { ok: boolean; detail: string } {
  if (!current || current.indexValue == null || current.indexVariationPct == null) return { ok: true, detail: "indice non lu sur la dernière séance" };
  const published = current.indexVariationPct;
  const eq = currentQuotes.filter((q) => q.instrument === "action");
  const prev = new Map(previousQuotes.filter((q) => q.instrument === "action").map((q) => [q.isin, q.close]));
  const movers = eq.filter((q) => (prev.has(q.isin) ? Math.abs(q.close - prev.get(q.isin)!) > 0.001 : Math.abs(q.variationPct) > 0.001));
  const moved = movers.map((q) => q.mnemo);
  const indexMoved = Math.abs(published) >= 0.005;

  if (indexMoved && moved.length === 0 && prev.size > 0) return { ok: false, detail: `BVMAC-AS ${signedPct(published)} au bulletin, aucun cours d'action changé dans la lecture : page « Marché des actions » à vérifier` };
  if (!indexMoved && moved.length > 0) return { ok: false, detail: `${moved.join(", ")} : cours changé(s) dans la lecture, indice à 0,00 % au bulletin : bloc de l'indice à vérifier` };
  if (!indexMoved) return { ok: true, detail: "indice stable, aucun cours d'action changé" };

  // Rebuild the published variation from the float weights of this very session.
  const floatTotal = eq.reduce((a, q) => a + (q.marketCapFloat ?? 0), 0);
  if (!floatTotal) return { ok: true, detail: `indice et cours cohérents (${moved.join(", ")}) · flottant non lu sur cette séance, reconstitution impossible` };
  const expected = movers.reduce((a, q) => {
    const move = prev.has(q.isin) && prev.get(q.isin)! > 0 ? (q.close / prev.get(q.isin)! - 1) * 100 : q.variationPct;
    return a + ((q.marketCapFloat ?? 0) / floatTotal) * move;
  }, 0);
  const ratio = expected / published;
  const reconstituted = ratio > 0.8 && ratio < 1.25;
  return reconstituted
    ? { ok: true, detail: `${signedPct(published)} publié, ${signedPct(expected)} reconstitué au flottant (${moved.join(", ")})` }
    : { ok: false, detail: `${signedPct(published)} publié, ${signedPct(expected)} reconstitué au flottant (${moved.join(", ")}) : écart d'un facteur ${Math.abs(ratio) >= 1 ? Math.abs(ratio).toFixed(1).replace(".", ",") : (1 / Math.abs(ratio)).toFixed(1).replace(".", ",")}${ratio < 0 ? ", et de sens contraire" : ""} · séance à éclaircir` };
}

export interface FloatRotation {
  /** FCFA traded over the window. */
  amount: number;
  /** Float capitalisation at the end of the window (last share count read × last close). */
  capFloat: number;
  /** amount ÷ capFloat, in percent. */
  pct: number;
  days: number;
  trades: number;
}

/**
 * Float rotation of one share : the FCFA traded over the last `days` days
 * against the quoted float, the honest measure of how easily a position
 * can be taken or left. Undefined when the float is not read yet.
 */
export function floatRotation(quotes: Quote[], days = 365): FloatRotation | undefined {
  const sorted = [...quotes].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  const last = sorted[sorted.length - 1];
  if (!last) return undefined;
  const shares = [...sorted].reverse().find((q) => (q.sharesFloat ?? 0) > 0)?.sharesFloat;
  const capFloat = last.marketCapFloat && last.marketCapFloat > 0 ? last.marketCapFloat : shares ? shares * last.close : 0;
  if (!capFloat) return undefined;
  const from = new Date(new Date(`${last.sessionDate}T12:00:00Z`).getTime() - days * 86400e3).toISOString().slice(0, 10);
  const win = sorted.filter((q) => q.sessionDate >= from);
  const amount = win.reduce((a, q) => a + (q.valueTraded || 0), 0);
  const trades = win.reduce((a, q) => a + (q.trades || 0), 0);
  return { amount, capFloat, pct: (amount / capFloat) * 100, days, trades };
}

/** How to say a rotation : the words a client needs before buying. */
export function rotationWording(r: FloatRotation): "faible" | "moyenne" | "vive" {
  return r.pct < 5 ? "faible" : r.pct < 20 ? "moyenne" : "vive";
}

/** Two series rebased to 100 at the first common date, for the share-against-index chart. */
export function base100(series: { date: string; value: number }[], from: string): { date: string; value: number }[] {
  const s = series.filter((p) => p.date >= from);
  const first = s[0]?.value;
  if (!first) return [];
  return s.map((p) => ({ date: p.date, value: (p.value / first) * 100 }));
}
