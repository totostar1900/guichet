/**
 * LES VOLETS QUE LA FICHE NE MONTRE PAS, par ligne.
 *
 * Plus aucun (10 novembre 2026). Le volet « Émetteur » d'un fonds avait été retiré le 1er novembre : la société de gestion était déjà nommée avec son dépositaire dans
 * « Souscription, rachat et règlement ». La fiche d'un fonds, calquée sur celle d'un titre, le reprend sous le nom « Société de gestion » (planche 1A). La fonction
 * reste : c'est le point où une ligne qui n'a rien à dire d'un volet le retirerait.
 */
export function voletsMasques(_o: { kind: string }): string[] {
  return [];
}
