import type { Contact } from "./types";

/**
 * D'UNE COHORTE À UN MESSAGE.
 *
 * La planche du 10 octobre 2026, et la dernière du lot à être construite.
 * Elle porte deux règles que le dessin énonce et que le code doit tenir,
 * parce qu'elles ne se devinent pas en regardant l'écran.
 *
 * LE CONSENTEMENT COMMANDE L'ENVOI, JAMAIS L'APPARTENANCE. Celui qui n'a
 * consenti sur aucun canal reste dans sa cohorte et garde tous ses droits :
 * il ne reçoit simplement rien. Retirer quelqu'un du groupe parce qu'il ne
 * veut pas de messages reviendrait à le punir d'un refus, et fausserait au
 * passage tous les comptes du répertoire.
 *
 * UNE COHORTE CHOISIT QUI PRÉVENIR, JAMAIS QUEL PRIX. Deux clients devant la
 * même offre lisent le même prix. Ce module ne touche donc à aucun montant,
 * et c'est volontaire : il ne connaît que des destinataires.
 */

/** Ce qu'un message emporte toujours, et que personne ne retire. */
export const MENTIONS = [
  "Information, ni conseil ni garantie d'allocation.",
  "Rendements bruts, avant fiscalité.",
  "Répondre STOP pour ne plus recevoir ces messages.",
] as const;

export interface PlanDEnvoi {
  /** Tout le monde dans la cohorte, démonstration écartée. */
  dansLaCohorte: number;
  /** Ceux qui ont consenti sur au moins un canal. */
  joignables: Contact[];
  /** Ceux qui ne recevront rien, et pourquoi. */
  sansCanal: Contact[];
  parWhatsapp: number;
  parEmail: number;
}

/**
 * Qui recevra, qui ne recevra pas, et par quel canal.
 *
 * LES COMPTES DE DÉMONSTRATION SONT HORS DU COMPTE, comme partout ailleurs :
 * annoncer « neuf clients » dont trois sont des comptes d'essai ferait croire
 * à une portée qu'on n'a pas.
 */
export function planDEnvoi(cohorte: Contact[], demo: Set<string>): PlanDEnvoi {
  const vrais = cohorte.filter((c) => !demo.has(c.id));
  const parWa = vrais.filter((c) => c.phone && c.whatsappOptIn);
  const parMail = vrais.filter((c) => c.email && c.emailOptIn);
  const joignables = vrais.filter((c) => (c.phone && c.whatsappOptIn) || (c.email && c.emailOptIn));
  return {
    dansLaCohorte: vrais.length,
    joignables,
    sansCanal: vrais.filter((c) => !joignables.includes(c)),
    parWhatsapp: parWa.length,
    parEmail: parMail.length,
  };
}

/**
 * Le texte tel qu'il partira, mentions comprises.
 *
 * ELLES SONT AJOUTÉES ICI ET NON SAISIES : une mention qu'on tape est une
 * mention qu'on oublie, et celle-ci est la seule partie du message dont
 * l'absence se paie ailleurs qu'en relation commerciale.
 */
export const texteComplet = (corps: string): string => `${corps.trim()}\n\n${MENTIONS.join(" ")}`;

/** Ce qui empêche de préparer : on le dit avant, pas après le clic. */
export function refusDePreparer(objet: string, corps: string, plan: PlanDEnvoi): string | undefined {
  if (objet.trim().length < 4) return "Un objet, même court : c'est lui qui s'affiche avant le texte.";
  if (corps.trim().length < 20) return "Le texte est trop court pour qu'un client comprenne de quoi il s'agit.";
  if (plan.joignables.length === 0) return "Personne dans cette cohorte n'a consenti à recevoir une information.";
  return undefined;
}
