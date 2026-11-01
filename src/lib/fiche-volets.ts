/**
 * LES VOLETS QUE LA FICHE NE MONTRE PAS, par ligne.
 *
 * « L'émetteur » d'un fonds est sa société de gestion, déjà nommée avec son
 * dépositaire dans « Souscription, rachat et règlement » : le volet n'a rien à
 * ajouter, et il est parti le 1er novembre 2026. Les autres lignes (un titre a
 * un émetteur qui compte : un Trésor, une société) gardent leurs quatre volets.
 * Le desk, qui lit tout, garde le sien.
 */
export function voletsMasques(o: { kind: string }): string[] {
  return o.kind === "FONDS" ? ["emetteur"] : [];
}
