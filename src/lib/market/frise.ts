/**
 * CE QUE DIT UNE CASE DE LA FRISE, et c'est deux choses qui ne se mélangent
 * pas.
 *
 * Le CHIFFRE compte les séances du mois où une ligne entre ou sort de la
 * cote : un fait de marché, mesuré par différence exacte des deux ensembles
 * d'ISIN. La MARQUE compte celles sur lesquelles le lecteur a laissé une
 * remarque : un défaut chez nous. Les réunir sous une seule couleur serait
 * refaire l'erreur que « passagère » et « définitive » ont corrigée sur les
 * départs : une couleur, deux gestes.
 *
 * Le regroupement vit ici et non dans la vue, parce qu'une règle qu'on ne
 * peut pas éprouver sans un navigateur ne s'éprouve pas.
 */

export interface CoupleFrise {
  /** La séance, et la précédente DE LA SÉRIE : la veille d'un lundi est un vendredi. */
  d: string;
  p: string;
  /** Lignes parties, lignes arrivées. */
  s: number;
  a: number;
  /** Le lecteur a-t-il signalé quelque chose sur cette séance. */
  r: boolean;
}

export interface CaseFrise {
  /** « 2024-03 ». */
  mois: string;
  seances: number;
  /** Séances où une ligne entre ou sort. */
  mouvements: number;
  /** Séances portant une remarque du lecteur. */
  aRelire: number;
  couples: CoupleFrise[];
}

export const bouge = (c: CoupleFrise): boolean => c.s > 0 || c.a > 0;

/** Les mois qui portent au moins une séance, rangés par clef. */
export function casesParMois(couples: CoupleFrise[]): Map<string, CaseFrise> {
  const out = new Map<string, CaseFrise>();
  for (const c of couples) {
    const mois = c.d.slice(0, 7);
    const v = out.get(mois) ?? { mois, seances: 0, mouvements: 0, aRelire: 0, couples: [] };
    v.seances += 1;
    if (bouge(c)) v.mouvements += 1;
    if (c.r) v.aRelire += 1;
    v.couples.push(c);
    out.set(mois, v);
  }
  return out;
}

/**
 * Les séances d'un mois, CELLES QUI BOUGENT EN TÊTE : c'est ce qu'on est venu
 * chercher en ouvrant la case, et une liste par date obligerait à parcourir
 * vingt lignes calmes pour trouver les deux qui comptent.
 */
export function ordonner(couples: CoupleFrise[]): CoupleFrise[] {
  return [...couples].sort((x, y) => Number(bouge(y)) - Number(bouge(x)) || x.d.localeCompare(y.d));
}

/** Les années couvertes, de la plus ancienne à la plus récente. */
export const anneesDe = (couples: CoupleFrise[]): string[] => [...new Set(couples.map((c) => c.d.slice(0, 4)))].sort();
