/**
 * LA FENÊTRE DE L'INDICE, ET L'ÉCHELLE DES VARIATIONS.
 *
 * Deux règles sorties du composant parce qu'elles se mesurent : l'une évite
 * une page vide, l'autre décide ce que le lecteur voit d'une distribution
 * étalée sur deux ordres de grandeur.
 */

/**
 * POSER UNE FENÊTRE SANS JAMAIS LA VIDER.
 *
 * La fenêtre est un couple d'indices sur la série. Les deux champs de dates
 * et les deux poignées la règlent, et rien n'empêche de croiser les bornes :
 * une fenêtre d'une seule séance tombait sur le « pas assez de séances lues »
 * du graphique, qui emportait avec lui la barre avec laquelle on venait de la
 * poser. Deux séances au moins, donc, et toujours dans la série.
 */
export function poserFenetre(n: number, a: number, b: number): [number, number] {
  const max = Math.max(1, n - 1);
  const lo = Math.max(0, Math.min(a, max - 1));
  return [lo, Math.min(max, Math.max(b, lo + 1))];
}

/**
 * L'ÉCHELLE DES VARIATIONS SE RÈGLE SUR LE CORPS DE LA DISTRIBUTION.
 *
 * Mesuré sur les 697 séances du dépôt le 7 octobre 2026 : 136 ont bougé, de
 * 0,415 % au milieu, et quinze au-delà de 3 %, jusqu'à 6,78 %. Un axe tendu
 * sur le plus grand mouvement donnait sept pixels au mouvement médian : la
 * vue montrait cinq pics et une ligne plate.
 *
 * L'axe tient donc le neuvième décile des séances QUI ONT BOUGÉ dans la
 * fenêtre, et les barres au-delà sont coupées, leur pointe sortant du cadre.
 * Le décile se mesure dans la fenêtre et non une fois pour toutes, parce que
 * le marché a changé d'amplitude : le mouvement médian passe de 0,06 % en
 * 2024 à 0,99 % en 2026, et une échelle fixée sur l'ensemble écraserait 2024
 * autant que le maximum écrasait tout.
 *
 * Le plancher de 0,5 % tient la vue d'une fenêtre sans aucun mouvement.
 */
export function ampleurVariations(vals: number[], plancher = 0.5): number {
  const bougees = vals
    .map((v) => Math.abs(v))
    .filter((v) => v !== 0)
    .sort((a, b) => a - b);
  if (!bougees.length) return plancher;
  const d9 = bougees[Math.min(bougees.length - 1, Math.floor(bougees.length * 0.9))];
  return Math.max(plancher, d9);
}

/** Le pas des graduations : environ quatre traits, sur 1, 2 ou 5 fois une puissance de dix. */
export function echelonVariations(amp: number): number {
  const brut = amp / 2;
  const p = 10 ** Math.floor(Math.log10(brut || 1));
  const n = brut / p;
  return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * p;
}
