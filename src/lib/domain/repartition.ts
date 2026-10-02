/**
 * La clé de répartition, et comment un montant s'y partage.
 *
 * Le client écrit « 60 % sur X, 40 % sur Y ». La clé est la sienne : une clé
 * choisie par la maison serait de la gestion, et la maison n'a pas cet agrément.
 * Elle fait donc partie des termes de l'ordre, au même titre que le montant et
 * le jour, et elle se relit comme eux.
 *
 * Module sans dépendance d'exécution : il se lit du serveur comme du
 * navigateur, et un test l'atteint sans monter de base.
 */

export interface Part {
  offerId: string;
  /** Un entier : les pourcentages à virgule invitent des totaux à 99,99. */
  pct: number;
}

/** Au-delà, une clé devient un portefeuille, et le robot un gérant. */
export const PARTS_MAX = 6;

/**
 * La clé d'une instruction, destination unique comprise.
 *
 * Une instruction sans clé n'est pas un cas particulier : c'est une clé à une
 * part. Le traiter ainsi évite deux chemins dans le robot, et c'est le genre de
 * bifurcation où l'un des deux finit par oublier une règle.
 */
export function repartition(s: { offerId: string; splits?: Part[] }): Part[] {
  return s.splits?.length ? s.splits : [{ offerId: s.offerId, pct: 100 }];
}

/**
 * Le partage d'un montant selon la clé, au franc près.
 *
 * LE RESTE VA À LA DERNIÈRE PART, et c'est une décision plutôt qu'un hasard
 * d'arrondi : 100 000 à 1/3 donne 33 333 deux fois et 33 334 une fois, et la
 * somme des tranches doit faire exactement le montant annoncé. Répartir le
 * reste « au plus gros » ou « au hasard » ferait varier le résultat d'un mois à
 * l'autre pour la même clé, ce qu'un client ne pourrait pas recalculer.
 *
 * Une tranche nulle est écartée : un ordre de zéro franc n'est pas un ordre.
 */
export function tranches(montant: number, parts: Part[]): { offerId: string; montant: number }[] {
  const total = Math.round(montant);
  const out: { offerId: string; montant: number }[] = [];
  let pose = 0;
  parts.forEach((p, i) => {
    const m = i === parts.length - 1 ? total - pose : Math.floor((total * p.pct) / 100);
    pose += m;
    if (m > 0) out.push({ offerId: p.offerId, montant: m });
  });
  return out;
}

/**
 * Pourquoi cette clé ne peut pas s'enregistrer, ou rien.
 *
 * Le total à cent est la règle évidente. Les deux autres le sont moins : une
 * même destination deux fois n'est pas une erreur de frappe innocente, c'est
 * une clé dont le client ne peut plus lire ce qu'elle fait ; et une part à zéro
 * est une ligne qu'il croit avoir posée et qui ne recevra rien.
 */
export function pourquoiPasDeCle(parts: Part[]): string | null {
  if (!parts.length) return "Indiquez au moins une destination.";
  if (parts.length > PARTS_MAX) return `Au plus ${PARTS_MAX} destinations : au-delà, une clé devient un portefeuille.`;
  if (parts.some((p) => !p.offerId)) return "Chaque part porte sa destination.";
  if (new Set(parts.map((p) => p.offerId)).size !== parts.length) return "Une même destination apparaît deux fois : regroupez-la en une seule part.";
  if (parts.some((p) => !Number.isInteger(p.pct) || p.pct < 1)) return "Chaque part est un pourcentage entier, au moins 1.";
  const somme = parts.reduce((t, p) => t + p.pct, 0);
  if (somme !== 100) return `Le total des parts fait ${somme} % : il doit faire 100 %.`;
  return null;
}

/** La clé en mots, pour un avis ou un journal. */
export const cleEnMots = (parts: Part[], titre: (offerId: string) => string): string =>
  parts.map((p) => `${p.pct} % ${titre(p.offerId)}`).join(" · ");
