import type { IndexPageData } from "./index-data";

/**
 * LES SÉRIES D'UNE NOTE : LE COURS DE CHAQUE SOCIÉTÉ ET L'INDICE, TOUS À LA BASE 100 DU DÉBUT DE LA PÉRIODE (7 novembre 2026, planche « Notes de marché », 1B).
 *
 * Une série par société, sur les séances où l'indice a été lu (le même axe que sa courbe) : le dernier cours connu se reporte d'une séance à l'autre, comme l'indice lui-même, qui
 * ne bouge que lorsqu'un cours change. Le départ est le dernier cours AVANT la période (ou le premier de la période à défaut) : c'est la variation « du trimestre » ou « du mois »
 * que la note écrit, jamais une autre.
 *
 * « RESTE DE LA COTE » : les autres sociétés, pondérées par leur poids dans l'indice. Une société pèse près des trois quarts de la cote, et c'est ce que la comparaison montre : sans
 * elle, la cote a fait tout autre chose que l'indice.
 */
export interface ComparaisonBase100 {
  dates: string[];
  indice: number[];
  /** La société la plus lourde de l'indice, et ce qu'elle a fait seule. */
  principale: { mnemo: string; name: string; weight: number; serie: number[] };
  /** Les autres sociétés, pondérées par leur poids. */
  reste: number[];
}

export interface SeriesDeLaPeriode {
  dates: string[];
  /** mnemo → cours à la base 100 du début de la période, une valeur par séance de `dates`. */
  parSociete: Record<string, number[]>;
  comparaison?: ComparaisonBase100;
}

export function seriesDeLaPeriode(d: IndexPageData, from: string, to: string): SeriesDeLaPeriode {
  const pts = d.stats.points;
  const dans = pts.filter((p) => p.date >= from && p.date <= to);
  if (dans.length === 0) return { dates: [], parSociete: {} };
  const i0 = pts.findIndex((p) => p.date === dans[0].date);
  const avant = i0 > 0 ? pts[i0 - 1] : dans[0];
  const dates = dans.map((p) => p.date);
  const parSociete: Record<string, number[]> = {};
  const brut: Record<string, number[]> = {};
  for (const { w, quotes } of d.histories) {
    const depart = quotes.filter((q) => q.sessionDate < from).pop() ?? quotes.find((q) => q.sessionDate >= from);
    if (!depart || !(depart.close > 0)) continue;
    let dernier = depart.close;
    let k = quotes.findIndex((q) => q.sessionDate >= from);
    const serie: number[] = [];
    for (const date of dates) {
      while (k >= 0 && k < quotes.length && quotes[k].sessionDate <= date) {
        if (quotes[k].close > 0) dernier = quotes[k].close;
        k++;
      }
      serie.push(dernier);
    }
    brut[w.mnemo] = serie;
    parSociete[w.mnemo] = serie.map((c) => (c / depart.close) * 100);
  }
  const base = avant.value > 0 ? avant.value : dans[0].value;
  const indice = dans.map((p) => (p.value / base) * 100);
  const lourde = [...d.weights].sort((a, b) => b.weightTotal - a.weightTotal)[0];
  let comparaison: ComparaisonBase100 | undefined;
  if (lourde && parSociete[lourde.mnemo]) {
    const autres = d.weights.filter((w) => w.mnemo !== lourde.mnemo && parSociete[w.mnemo]);
    const poids = autres.reduce((s, w) => s + w.weightTotal, 0);
    const reste = dates.map((_, i) => (poids > 0 ? autres.reduce((s, w) => s + w.weightTotal * parSociete[w.mnemo][i], 0) / poids : 100));
    comparaison = { dates, indice, principale: { mnemo: lourde.mnemo, name: d.nameOf(lourde.mnemo), weight: lourde.weightTotal, serie: parSociete[lourde.mnemo] }, reste };
  }
  return { dates, parSociete, comparaison };
}
