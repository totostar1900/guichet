/**
 * LES VOLETS QUE LA FICHE NE MONTRE PAS, par ligne.
 *
 * L'émetteur d'un fonds est sa société de gestion : le volet est revenu le 10 novembre 2026 sous le nom « Société de gestion » (planche 1A), il n'est plus masqué.
 * « Documents » d'un fonds n'existe que si le fonds a une pièce AUTRE que les bulletins de la cote : ceux-ci sont des pièces de la bourse, pas du fonds (même règle
 * que pour une action), et un onglet qui ne dit « aucun document » ne sert à rien. Les autres lignes gardent leurs volets.
 */
export const estUnBulletin = (d: { name: string }): boolean => /^bulletin\b/i.test(d.name);

export function voletsMasques(o: { kind: string; documents?: { name: string }[] }): string[] {
  return o.kind === "FONDS" && !(o.documents ?? []).some((d) => !estUnBulletin(d)) ? ["docs"] : [];
}
