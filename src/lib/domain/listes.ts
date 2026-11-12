import type { Offer } from "./types";
import { lieuDe, sectionDe } from "./sections";
import { displayStatus, isActionable, maturityIsGuess, offerFamily } from "./status";
import { yearsBetween } from "@/lib/finance";
import { localIso } from "@/lib/format";

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
export function lignesDeLaCote(all: Offer[], now = new Date()): Offer[] {
  const cotees = new Set(all.filter((o) => o.kind === "MARCHE" && !o.hidden && o.isin).map((o) => o.isin));
  const jour = localIso(now);
  return all.filter((o) => !o.hidden && lieuDe(o) === "cote" && !((o.status === "live" || o.status === "matured") && o.kind !== "MARCHE" && cotees.has(o.isin)) && !motifDeRetrait(o, jour));
}

/**
 * LES OBLIGATIONS QUI SORTENT DE LA LISTE, ET POURQUOI (12 novembre 2026, à la demande du client).
 *
 * Une obligation déjà remboursée n'a plus rien à rapporter : le bulletin l'imprime encore quelque temps, la liste n'a pas à la montrer.
 * Une obligation dont on ne connaît que l'ANNÉE d'échéance (le bulletin imprime « 2026 », la maison pose le 31 décembre) et qui arrive à terme dans
 * l'année n'a pas de rendement publiable : le chiffre bougerait de dizaines de points selon le jour réel. C'est la même condition que celle qui retient
 * son rendement (`headlineYield`) ; la liste ne montre plus ce que la fiche ne sait pas chiffrer.
 *
 * LA LIGNE N'EST PAS EFFACÉE : sa fiche reste ouverte à son adresse, avec ses documents et son historique ; elle cesse seulement de paraître dans les listes
 * (Titres, Accueil). Le rapport BOC de la séance les nomme, avec leur motif : retirer sans le dire serait taire.
 */
export type MotifDeRetrait = "remboursee" | "echeance_incertaine";

export function motifDeRetrait(o: Offer, jour: string): MotifDeRetrait | undefined {
  if (o.kind !== "MARCHE" || o.instrument !== "obligation" || !o.maturityOn) return undefined;
  if (o.maturityOn < jour) return "remboursee";
  if (maturityIsGuess(o) && yearsBetween(jour, o.maturityOn) < 1) return "echeance_incertaine";
  return undefined;
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

/*
 * « comptesParLieu » VIVAIT ICI, et comptait les trois familles comme leurs
 * pages les montrent : la cote, les fonds, les séances. Elle n'avait qu'un
 * emploi — poser « 45 lignes » dans un intitulé du menu et de l'accueil — et
 * cet emploi est tombé le 29 octobre 2026 : « ne plus annoncer le nombre de
 * lignes ou de services dans les intitulés ».
 *
 * ELLE PART AVEC EUX plutôt que d'attendre un second usage. Une fonction
 * juste, éprouvée et sans appelant est ce qui se garde le plus facilement et
 * se paie le plus tard : elle a l'air d'un service rendu, elle survit aux
 * relectures, et elle finit par justifier le retour de ce qu'on vient de
 * retirer. Les trois listes qu'elle appelait — « lignesDeLaCote »,
 * « fondsListes », « seancesAnnoncees » — restent, elles, employées par les
 * trois pages qu'elles servent.
 */
