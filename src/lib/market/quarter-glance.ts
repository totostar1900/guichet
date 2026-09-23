import type { IndexPageData } from "./index-data";
import type { QuarterKey } from "./index-quarter";

/**
 * Ce qu'un trimestre a fait, en quatre chiffres, sans écrire la note.
 *
 * L'archive des notes en affiche une ligne par trimestre : vingt notes
 * complètes, chacune avec ses sept sociétés, ses contributions et ses
 * statistiques, pour n'en montrer que le niveau et la variation, ce serait
 * payer vingt fois le prix d'une page de sommaire. Les mêmes séances, lues
 * une fois.
 */
export interface QuarterGlance {
  key: string;
  level: number;
  ret: number;
  sessions: number;
  moved: number;
}

export function quarterGlance(d: IndexPageData, q: QuarterKey): QuarterGlance | undefined {
  const pts = d.stats.points;
  const inside = pts.filter((p) => p.date >= q.from && p.date <= q.to);
  if (inside.length === 0) return undefined;
  const last = inside[inside.length - 1];
  // Le point de départ est la dernière séance d'avant le trimestre : sans elle,
  // la variation du premier jour du trimestre serait perdue.
  const before = [...pts].reverse().find((p) => p.date < q.from) ?? inside[0];
  const ret = before.value > 0 ? (last.value / before.value - 1) * 100 : 0;
  return { key: q.key, level: last.value, ret, sessions: inside.length, moved: inside.filter((p) => (p.variationPct ?? 0) !== 0).length };
}

/** Le trimestre plus ancien et le plus récent, autour de celui qu'on lit. */
export function quarterNeighbours(closed: QuarterKey[], key: string): { older?: QuarterKey; newer?: QuarterKey } {
  // `closed` vient du plus récent au plus ancien : le voisin plus ancien est le suivant.
  const i = closed.findIndex((q) => q.key === key);
  if (i < 0) return {};
  return { older: closed[i + 1], newer: closed[i - 1] };
}
