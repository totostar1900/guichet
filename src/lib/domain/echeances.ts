import type { Dit } from "./services";
import type { Offer } from "./types";
import { seancesAnnoncees } from "./listes";

/**
 * CE QUI FERME BIENTÔT, LU UNE SEULE FOIS.
 *
 * Deux surfaces montrent les mêmes échéances — la racine de Trade et la page
 * d'arrivée — et elles les montreront longtemps : une adjudication s'annonce
 * une semaine avant de se fermer, et une annonce manquée est une occasion
 * perdue pour de bon. Deux listes de la même chose divergent toujours ; c'est
 * la leçon que `nav-groups` écrit en tête de fichier, et elle vaut ici autant
 * que pour un menu.
 *
 * LE TEMPS QUI RESTE, ET NON LA DATE SEULE. « Clôture le 29 octobre » oblige
 * le lecteur à faire la soustraction, et il la fait mal : la page sait quel
 * jour on est, lui doit s'en souvenir. C'est déjà la règle des rappels
 * (`watch.rappelMessage` écrit « dans 5 jours », jamais la date), et une même
 * information ne se dit pas de deux façons selon la surface.
 */

/** Trois tons, et ce sont des paliers de décision, pas des couleurs. */
export type Urgence = "urgent" | "bientot" | "calme";

/**
 * SOUS SEPT JOURS, L'ORDRE DU JOUR DU CLIENT CHANGE.
 *
 * C'est le délai au-delà duquel il peut encore réunir les fonds sans se
 * presser : un virement interbancaire de la zone met deux à trois jours, et
 * il faut que l'argent soit arrivé avant le dépôt. En deçà, la section
 * remonte sur la page d'arrivée — c'est le seul seuil qui déplace quelque
 * chose, et c'est pour cela qu'il est ici et non dans une feuille de style.
 */
export const JOURS_URGENT = 7;
/** Au-delà de quatorze jours, c'est noté mais rien ne presse. */
export const JOURS_BIENTOT = 14;
/** Au-delà d'un mois, ce n'est plus « bientôt » : c'est le calendrier. */
export const JOURS_FENETRE = 30;

export interface Echeance {
  offerId: string;
  titre: string;
  /** Qui émet, et de quelle nature est la séance. */
  quoi: Dit;
  /** Jours entiers avant la clôture, au jour d'observation. Zéro = aujourd'hui. */
  jours: number;
  urgence: Urgence;
  href: string;
}

/**
 * Combien de jours entiers avant une date.
 *
 * Il vivait en double : une copie privée dans `watch.ts`, qui écrit les
 * rappels quotidiens, et il en fallait une seconde ici. Deux soustractions de
 * dates qui doivent tomber sur le même nombre, sans quoi le message dit
 * « dans 5 jours » là où la page dit « dans 6 j ».
 */
export const joursAvant = (iso: string, now = new Date()): number => Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000);

export const urgenceDe = (jours: number): Urgence => (jours <= JOURS_URGENT ? "urgent" : jours <= JOURS_BIENTOT ? "bientot" : "calme");

/**
 * Les séances qui se ferment dans le mois, de la plus proche à la plus
 * lointaine.
 *
 * SEULES LES SÉANCES, ET LA LISTE EST CELLE DU CALENDRIER. On passe par
 * `seancesAnnoncees`, la même fonction que sert la page des adjudications :
 * deux définitions de « une séance » finiraient par ne plus désigner le même
 * ensemble, et la page d'accueil annoncerait une clôture que le calendrier
 * ne montre pas.
 *
 * UN FONDS NE FERME PAS, et le relevé du 24 octobre 2026 le dit sans
 * ambiguïté : les deux FCP du dépôt portent « 2099-12-31 », une sentinelle
 * qui veut dire « toujours ouvert ». Les compter ferait paraître une échéance
 * là où il n'y en a pas — et, d'ici 2099, une échéance fausse. Une ligne de
 * la cote n'en est pas non plus : elle se traite tant qu'elle est cotée.
 *
 * CE QUI EST DÉJÀ FERMÉ N'Y EST PAS NON PLUS, et pas davantage ce qui ferme
 * dans six mois : le premier n'est plus une occasion, le second n'est pas
 * encore une échéance. Entre les deux, la fenêtre d'un mois.
 */
export function echeancesProches(offers: Offer[], now = new Date()): Echeance[] {
  const out: Echeance[] = [];
  for (const o of seancesAnnoncees(offers)) {
    if (o.status !== "published" || !o.deadlineAt) continue;
    const jours = joursAvant(o.deadlineAt, now);
    if (jours < 0 || jours > JOURS_FENETRE) continue;
    out.push({
      offerId: o.id,
      titre: o.title,
      /* L'ÉMETTEUR PLUTÔT QUE LE TICKET MINIMUM. Un ticket d'entrée se
         calcule — nominal, quotité, minimum de première souscription selon le
         segment — et un calcul du domaine a sa référence ailleurs ; en
         recopier une approximation ici donnerait un chiffre faux à côté d'un
         chiffre juste. L'émetteur, lui, est écrit sur l'offre, et c'est ce
         qui décide d'abord : on suit le Trésor qu'on connaît. */
      quoi: { key: "Adjudication · {e}", params: { e: o.issuer } },
      jours,
      urgence: urgenceDe(jours),
      href: `/offres/${o.id}`,
    });
  }
  return out.sort((a, b) => a.jours - b.jours || a.titre.localeCompare(b.titre, "fr"));
}

/**
 * La section remonte-t-elle sur la page d'arrivée ?
 *
 * Une échéance sous sept jours passe devant la provision et les lignes ; au
 * delà, elle attend son tour après « Investir ». La règle vit ici pour que la
 * page ne la rejoue pas à sa façon.
 */
export const presse = (e: Echeance[]): boolean => e.some((x) => x.jours <= JOURS_URGENT);
