import type { Offer, Watch } from "./types";

/**
 * CE QUE LE CLIENT SURVEILLE SANS LE DÉTENIR, compté une seule fois.
 *
 * UNE VEILLE N'EST PAS UNE LIGNE. « listWatches » rend des veilles, et une
 * veille porte un `offerId` qui peut ne plus désigner personne : une offre
 * retirée du catalogue, masquée, ou simplement absente du jeu de données
 * qu'on vient de lire. La page des lignes suivies le sait déjà et écarte ces
 * veilles-là — « byOffer.get(w.offerId) » puis un filtre — mais elle le fait
 * chez elle.
 *
 * Le jour où la page d'accueil annonce « 4 lignes suivies » en comptant les
 * veilles, et où la page en montre trois, personne ne saura laquelle des deux
 * ment. C'est exactement ce que l'accueil redoute quand il écrit, pour les
 * rubriques de son dossier : « un nombre posé sur la page d'avant se calcule
 * toujours ailleurs que là où il sera vérifié ». La réponse n'est pas de
 * renoncer au nombre, c'est de n'avoir qu'un seul calcul.
 *
 * L'ORDRE EST CELUI DES VEILLES, et non celui du catalogue : on retrouve ses
 * lignes là où on les a posées.
 */
export function lignesSuivies(watches: Watch[], offers: Offer[]): Offer[] {
  const parId = new Map(offers.map((o) => [o.id, o]));
  return watches.map((w) => parId.get(w.offerId)).filter((o): o is Offer => Boolean(o));
}
