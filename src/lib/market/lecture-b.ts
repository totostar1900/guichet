/**
 * La lecture B : un point par Trésor et par durée, la séance la plus récente.
 *
 * Deux lectures d'une courbe datée se défendaient, et la maison a tranché.
 *
 * La lecture A voyait un instantané de titres vivants : on écarte ce qui est
 * remboursé, on recalcule la vie restante au jour d'observation. Elle a contre
 * elle que nous n'avons pas de marché secondaire liquide : il n'existe pas de
 * rendement « vivant » à observer un jour donné, et les fenêtres profondes se
 * videraient presque entièrement.
 *
 * La lecture B dit le dernier prix payé à chaque durée. C'est ce qu'une
 * adjudication produit réellement, et c'est la seule lecture qui fasse de la
 * profondeur une ressource plutôt qu'un mélange : aller chercher plus loin
 * n'ajoute pas un deuxième point à trois mois, cela ajoute une durée qu'on
 * n'avait pas.
 *
 * Mesuré avant la décision, au 28 septembre 2021 sur cinq ans : dix-huit points
 * gabonais se posaient sur la seule durée « 3 mois », entre 3,50 et 5,25 pour
 * cent. La lecture B en garde un, le plus récent, et l'âge reste écrit à côté.
 *
 * Module sans dépendance : il part dans le paquet du navigateur avec la figure.
 */

export interface PointDate {
  /** La durée arrondie qui nomme l'abscisse : deux points du même mot se disputent la place. */
  mot: string;
  /** L'âge de la séance au jour d'observation, en jours. */
  age?: number;
  /** Une séance servie à un ou deux soumissionnaires. */
  mince?: boolean;
}

/**
 * Ne garder, par durée, que la séance la plus récente.
 *
 * L'ordre d'entrée ne décide de rien : à âge égal, le premier rencontré gagne,
 * ce qui est arbitraire mais stable, et deux séances du même jour à la même
 * durée pour le même Trésor sont de toute façon la même adjudication.
 */
export function derniereParDuree<T extends PointDate>(points: T[]): T[] {
  const par = new Map<string, T>();
  for (const p of points) {
    const vu = par.get(p.mot);
    if (!vu || (p.age ?? Number.POSITIVE_INFINITY) < (vu.age ?? Number.POSITIVE_INFINITY)) par.set(p.mot, p);
  }
  return [...par.values()];
}

/** Ce qu'on fait d'une séance mince : la garder, la sous-pondérer, ou la retirer. */
export type Minces = "inclure" | "sous-ponderer" | "exclure";

/**
 * Le poids d'une observation : son âge, et sa représentativité.
 *
 * Une séance de dix-huit mois ne pèse pas comme celle de la semaine. La
 * décroissance est exponentielle et se règle par sa demi-vie, qui est la seule
 * façon lisible d'en parler : « à quatre-vingt-dix jours, une séance compte
 * pour moitié ».
 *
 * Une séance mince porte un chiffre vrai et non représentatif : la
 * sous-pondérer dit exactement cela, là où l'exclure prétendrait qu'elle n'a
 * pas eu lieu.
 */
export function poids(p: PointDate, opts: { demiVieJours?: number; minces?: Minces }): number {
  const { demiVieJours, minces = "sous-ponderer" } = opts;
  if (p.mince && minces === "exclure") return 0;
  const age = Math.max(0, p.age ?? 0);
  const w = demiVieJours && demiVieJours > 0 ? Math.pow(0.5, age / demiVieJours) : 1;
  return p.mince && minces === "sous-ponderer" ? w * 0.35 : w;
}
