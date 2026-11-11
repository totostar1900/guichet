/**
 * LA PILE DES PAGES VUES, TENUE PAR LA BARRE (10 novembre 2026, audit « Mon argent »).
 *
 * L'ancienne mémoire ne gardait que la page d'avant, et la flèche du haut ouvrait le parent comme une page de plus : après « Épargne › flèche », le retour Android ramenait sur « Épargne » (une boucle). La pile suit l'historique du navigateur : une page nouvelle s'empile, un retour (flèche ou Android) la dépile.
 * La flèche qui REMPLACE la page (parent différent de la page d'avant) la remplace aussi dans la pile, pour que les deux retours restent d'accord.
 */
const MAX = 40;

export function majPile(pile: string[], chemin: string, remplace: boolean): string[] {
  const p = [...pile];
  if (remplace && p.length) p[p.length - 1] = chemin;
  else if (p.length >= 2 && p[p.length - 2] === chemin) p.pop();
  else if (p[p.length - 1] !== chemin) p.push(chemin);
  return p.slice(-MAX);
}

export const precedentDe = (pile: string[]): string | undefined => (pile.length >= 2 ? pile[pile.length - 2] : undefined);
