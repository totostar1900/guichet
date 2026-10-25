import type { Offer } from "./types";
import { lieuDe, sectionDe } from "./sections";
import { displayStatus, isActionable, offerFamily } from "./status";

/**
 * CE QUE CHAQUE LISTE CONTIENT, DÉCIDÉ UNE FOIS.
 *
 * Les trois pages d'achat tiraient le même « listOffers » et le filtraient
 * chacune chez elle. Trois copies du même tri, donc deux qui dérivent : le
 * compte de la bande large comptait « tout ce qui n'est pas un fonds », ce qui
 * rangeait les séances de la BEAC avec la cote, et le compte des fonds
 * oubliait qu'une page ne montre qu'un fonds qui porte sa valeur liquidative.
 *
 * Un chiffre posé à côté d'un nom ne vaut que s'il est celui de la page qu'on
 * ouvre. Les tuiles en portent un, donc le tri vit ici.
 */

/**
 * LA COTE, ET RIEN QUE LA COTE.
 *
 * Une ligne du primaire cotée depuis sa séance paraît deux fois, une fois comme
 * émission et une fois comme ligne de bulletin : la seconde la représente, et
 * elle seule. Les séances de la BEAC, elles, ont leur propre page, et un bon du
 * Trésor n'est jamais coté, donc rien ne les en sortait tant que la règle
 * attendait une cotation. Mesuré le 4 octobre 2026 : neuf séances closes depuis
 * deux à trois semaines dormaient dans cette liste.
 */
export function lignesDeLaCote(all: Offer[]): Offer[] {
  const cotees = new Set(all.filter((o) => o.kind === "MARCHE" && !o.hidden && o.isin).map((o) => o.isin));
  return all.filter((o) => !o.hidden && lieuDe(o) === "cote" && !((o.status === "live" || o.status === "matured") && o.kind !== "MARCHE" && cotees.has(o.isin)));
}

/** Les séances annoncées par les six Trésors, à leur page. */
export const seancesAnnoncees = (all: Offer[]): Offer[] => all.filter((o) => !o.hidden && lieuDe(o) === "adjudications");

/**
 * DEUX LISTES QUI SONT VIDES LA PLUPART DU TEMPS, ET C'EST TOUT LEUR INTÉRÊT.
 *
 * Une émission à prix fixé (APE, introduction) et un rachat du Trésor ne
 * paraissent pas au calendrier de la maison : il y en a quelques-uns par an.
 * Ils vivaient donc dans une section d'une page de catalogue — « En
 * souscription » sur la cote, « Rachats du Trésor » aux adjudications — que
 * personne n'ouvre pour voir si par hasard il y en a un. Décision du
 * 25 octobre 2026 : ils deviennent des services À PART ENTIÈRE, qui ne
 * paraissent que lorsque ces listes portent quelque chose.
 *
 * `isActionable` ET NON « pas encore clôturé » : une fenêtre de souscription
 * fermée hier n'est pas une occasion, et un rachat dont la date limite est
 * passée est une tuile qui mène à une page où l'on ne peut rien. Les quatre
 * états que la maison tient pour ouverts sont écrits une fois, dans `status`,
 * et c'est celui-là qu'il faut lire plutôt qu'une comparaison de dates
 * refaite ici.
 */
export const enSouscription = (all: Offer[]): Offer[] => all.filter((o) => !o.hidden && sectionDe(o) === "souscription" && isActionable(displayStatus(o)));

/** Les rachats du Trésor encore ouverts : une sortie offerte, pas un placement. */
export const rachatsOuverts = (all: Offer[]): Offer[] => all.filter((o) => !o.hidden && offerFamily(o) === "RACHAT" && isActionable(displayStatus(o)));

/**
 * Les fonds que la page montre : ceux qui portent leur fiche. Un OPCVM sans
 * valeur liquidative ne se lit pas, donc il ne se compte pas non plus.
 */
export const fondsListes = (all: Offer[]): (Offer & { fund: NonNullable<Offer["fund"]> })[] => all.filter((o): o is Offer & { fund: NonNullable<Offer["fund"]> } => o.kind === "FONDS" && Boolean(o.fund));

/** Ce que chaque siège « Instruments » ouvre, compté comme sa page le montre. */
export interface ComptesParLieu {
  titres: number;
  fonds: number;
  calendrier: number;
}

export const comptesParLieu = (all: Offer[]): ComptesParLieu => ({
  titres: lignesDeLaCote(all).length,
  fonds: fondsListes(all).length,
  calendrier: seancesAnnoncees(all).length,
});
