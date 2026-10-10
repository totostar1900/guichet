import type { Cran } from "@/lib/domain/tenue";

/**
 * LES COHORTES : QUATRE GROUPES NOMMÉS, ET CE QU'ILS AUTORISENT.
 *
 * Pas de déciles ni de quintiles : un groupe doit pouvoir se dire en un mot à
 * quelqu'un qui n'a pas lu le code. Quatre suffisent à décider quoi faire, et
 * c'est la seule raison d'en faire.
 *
 * UNE COHORTE CHOISIT QUI PRÉVENIR, JAMAIS QUEL PRIX PROPOSER. Deux clients
 * devant la même offre lisent la même chose. Moduler un prix ou une condition
 * par groupe ferait de la maison autre chose qu'un intermédiaire, et la
 * phrase « ni conseil, ni garantie d'allocation » tomberait avec.
 *
 * ET LE CONSENTEMENT COMMANDE L'ENVOI, JAMAIS L'APPARTENANCE. Un client qui
 * n'a accepté aucun message reste dans sa cohorte et garde tous ses droits ;
 * il ne reçoit simplement rien.
 */
export const COHORTES = ["a_surveiller", "dormant", "fidele", "tiede"] as const;
export type Cohorte = (typeof COHORTES)[number];

export const COHORTE_LABEL: Record<Cohorte, string> = {
  a_surveiller: "À surveiller",
  dormant: "Dormants",
  fidele: "Fidèles",
  tiede: "Tièdes",
};

export const COHORTE_QUOI: Record<Cohorte, string> = {
  a_surveiller: "un manquement à regarder avant de leur écrire",
  dormant: "plus un geste depuis six mois",
  fidele: "présents, et ils donnent suite",
  tiede: "ils regardent, ils concrétisent peu",
};

/**
 * LE SEUIL DU SOMMEIL : six mois sans un geste.
 *
 * Au-delà, reprendre contact n'est plus une relance mais une nouvelle
 * approche. Trois mois classeraient dormant un client qui ne traite qu'aux
 * adjudications trimestrielles ; douze laisseraient passer l'éloignement.
 */
export const MOIS_AVANT_SOMMEIL = 6;

/** Au-dessus, un client est tenu pour présent ; c'est un seuil, pas une note. */
export const SCORE_FIDELE = 50;

/**
 * UN CLIENT N'EST QUE DANS UNE COHORTE, et l'ordre de priorité est une
 * décision : un manquement passe avant tout le reste, parce qu'écrire une
 * offre à quelqu'un dont un ordre n'est pas réglé serait au mieux maladroit.
 * Le sommeil passe avant la fidélité : un ancien fidèle qui dort est d'abord
 * quelqu'un qu'on a perdu de vue.
 */
export function cohorteDe(cran: Cran, score: number, dernierGeste: string | undefined, now = new Date()): Cohorte {
  if (cran === "a_surveiller" || cran === "en_defaut") return "a_surveiller";
  const limite = new Date(now);
  limite.setMonth(limite.getMonth() - MOIS_AVANT_SOMMEIL);
  if (!dernierGeste || dernierGeste < limite.toISOString()) return "dormant";
  return score >= SCORE_FIDELE ? "fidele" : "tiede";
}

export const estCohorte = (s: string | undefined): s is Cohorte => COHORTES.includes(s as Cohorte);

/** Le nom qui voyage dans l'adresse et dans le choix du segment d'un envoi. */
export const SEGMENT_COHORTE = "cohorte:";
export const segmentDeCohorte = (c: Cohorte): string => `${SEGMENT_COHORTE}${c}`;
export const cohorteDuSegment = (segment: string): Cohorte | undefined => {
  if (!segment.startsWith(SEGMENT_COHORTE)) return undefined;
  const c = segment.slice(SEGMENT_COHORTE.length);
  return estCohorte(c) ? c : undefined;
};
