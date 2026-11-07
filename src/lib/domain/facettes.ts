/**
 * DES FILTRES QUI SE RÉPONDENT (7 novembre 2026, planche « Filtres qui se répondent »).
 *
 * Le nombre d'une pastille est le nombre de lignes qui resteraient si on la choisissait, avec TOUS LES AUTRES FILTRES appliqués et sans le sien : choisir « Gabon » sur
 * « BTA » dit combien de séances gabonaises de BTA existent, et on peut encore passer du Gabon au Cameroun sans tout retirer. Une pastille à zéro est grisée, jamais retirée
 * (sauf un instrument que la page n'a jamais), et une valeur déjà choisie qui tombe à zéro reste choisie, barrée, retirable d'un geste.
 */
export type Comptes = Record<string, Record<string, number>>;

/**
 * Pour chaque facette, le nombre de lignes par valeur.
 * `passeSans(x, cle)` : la ligne passe-t-elle tous les filtres SAUF celui de `cle` ? `valeurs(x, cle)` : les valeurs de cette facette que la ligne porte.
 */
export function compterFacettes<T>(lignes: T[], cles: string[], passeSans: (x: T, cle: string) => boolean, valeurs: (x: T, cle: string) => string[]): Comptes {
  const out: Comptes = {};
  for (const cle of cles) {
    const c: Record<string, number> = {};
    for (const x of lignes) {
      if (!passeSans(x, cle)) continue;
      for (const v of valeurs(x, cle)) c[v] = (c[v] ?? 0) + 1;
    }
    out[cle] = c;
  }
  return out;
}

/** Les valeurs choisies qui ne donnent plus aucune ligne : elles restent choisies, mais barrées, et la page propose de les retirer. */
export function impossibles(choisies: Set<string>, comptes: Record<string, number> | undefined): string[] {
  return [...choisies].filter((v) => !(comptes?.[v] ?? 0));
}
