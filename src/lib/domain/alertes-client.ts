import type { ActionClient } from "./journal-client";
import type { ClientFile } from "./kyc";
import type { TrustedDevice } from "./types";

/**
 * UNE ALERTE NAÎT D'UN ENCHAÎNEMENT, PAS D'UN SCORE.
 *
 * C'est la phrase que la maquette du 10 octobre 2026 porte sous la section
 * « Alertes » de la fiche client, et c'est une règle, pas une formule de
 * style. Un score élevé n'alerte de rien : il dit un état. Ce qui appelle le
 * regard d'une personne, c'est DEUX FAITS QUI SE SUIVENT, et une alerte doit
 * donc toujours nommer les deux, et l'écart de temps entre eux.
 *
 * Aucune de ces règles ne décide quoi que ce soit : elles désignent. La
 * mesure se prend par une personne, avec un motif, et jamais par ce module.
 */

/** Deux gestes séparés de moins de cela se suivent de trop près pour être étrangers. */
export const FENETRE_ENCHAINEMENT_H = 2;

export type GenreDAlerte = "clef_partagee" | "banque_partagee" | "banque_puis_argent";

export interface AlerteClient {
  genre: GenreDAlerte;
  /** Le fait, en une ligne. */
  titre: string;
  /** Les DEUX faits et leur écart : c'est ce qui distingue une alerte d'une étiquette. */
  detail: string;
  /** Le client avec qui le lien existe, quand il y en a un. */
  avec?: string;
  /** Du plus grave au moins grave : une personne lit la première d'abord. */
  poids: number;
}

/**
 * La même clef d'accès sur deux comptes.
 *
 * Une clef vit dans un appareil et prouve une personne. Deux comptes qui la
 * partagent, ce sont deux titulaires qui se connectent avec le même geste :
 * soit un appareil prêté, soit une seule personne derrière deux dossiers. Les
 * deux méritent d'être vus, et aucun ne se conclut d'ici.
 */
export function clefsPartagees(userId: string, appareils: TrustedDevice[], nomDe: (id: string) => string): AlerteClient[] {
  const out: AlerteClient[] = [];
  const miennes = appareils.filter((d) => d.userId === userId && d.credentialId);
  for (const d of miennes) {
    for (const autre of appareils) {
      if (autre.userId === userId || autre.credentialId !== d.credentialId) continue;
      out.push({
        genre: "clef_partagee",
        titre: "Appareil partagé avec un autre compte",
        detail: `Clef d'accès « ${d.name} » enrôlée le ${d.createdAt.slice(0, 10)}, commune avec ${nomDe(autre.userId)}.`,
        avec: autre.userId,
        poids: 2,
      });
    }
  }
  return out;
}

/**
 * Le même compte bancaire déclaré sur deux dossiers.
 *
 * Le plus net des deux signaux de la maquette, et le plus simple à vérifier :
 * un règlement part vers un compte, et deux dossiers qui pointent le même
 * compte demandent qu'on sache pourquoi. Un groupe et sa filiale, c'est
 * normal ; deux clients sans lien, non.
 */
export function banquesPartagees(userId: string, dossiers: ClientFile[], nomDe: (id: string) => string): AlerteClient[] {
  const mien = dossiers.find((f) => f.userId === userId);
  /* Le compte de règlement vit sous « funds », avec l'origine des fonds :
     c'est là que le dossier le déclare, et c'est lui qui reçoit les ventes,
     les rachats et les coupons. */
  const compte = mien?.funds?.bankAccount?.replace(/\s/g, "");
  if (!compte) return [];
  return dossiers
    .filter((f) => f.userId !== userId && f.funds?.bankAccount?.replace(/\s/g, "") === compte)
    .map((f) => ({
      genre: "banque_partagee" as const,
      titre: "Compte bancaire déclaré sur un autre dossier",
      detail: `Le même compte, se terminant par ${compte.slice(-4)}, est déclaré sur le dossier de ${nomDe(f.userId)}.`,
      avec: f.userId,
      poids: 3,
    }));
}

/**
 * Un changement de compte bancaire, suivi de près d'un geste d'argent.
 *
 * L'ENCHAÎNEMENT EST LE FAIT, pas chacun des deux gestes. Changer de banque
 * est ordinaire ; demander un mouvement dans l'heure qui suit l'est moins, et
 * c'est la forme que prend une reprise de compte. L'alerte nomme donc les
 * deux gestes et le temps qui les sépare, et s'arrête là.
 */
const ARGENT = new Set(["epargne.creee", "epargne.modifiee", "epargne.arretee", "mandat.cree", "mandat.signe", "mandat.revoque", "ordre.signe", "ordre.reinvesti"]);

export function banquePuisArgent(gestes: ActionClient[], phraseDe: (geste: string) => string): AlerteClient[] {
  const tries = [...gestes].sort((a, b) => a.at.localeCompare(b.at));
  const out: AlerteClient[] = [];
  for (const [i, g] of tries.entries()) {
    if (g.geste !== "securite.banque.changee") continue;
    for (const suivant of tries.slice(i + 1)) {
      const ecartMs = new Date(suivant.at).getTime() - new Date(g.at).getTime();
      if (!Number.isFinite(ecartMs) || ecartMs > FENETRE_ENCHAINEMENT_H * 3_600_000) break;
      if (!ARGENT.has(suivant.geste)) continue;
      const minutes = Math.max(1, Math.round(ecartMs / 60_000));
      out.push({
        genre: "banque_puis_argent",
        titre: "Compte bancaire changé, puis un geste d'argent",
        detail: `« ${phraseDe(g.geste)} » puis « ${phraseDe(suivant.geste)} », ${minutes} minute(s) plus tard, le ${g.at.slice(0, 10)}.`,
        poids: 4,
      });
      break; // un enchaînement par changement : le premier suffit à appeler le regard
    }
  }
  return out;
}

/** Toutes les alertes d'un client, la plus grave d'abord. */
export function alertesDe(p: {
  userId: string;
  gestes: ActionClient[];
  appareils: TrustedDevice[];
  dossiers: ClientFile[];
  nomDe: (id: string) => string;
  phraseDe: (geste: string) => string;
}): AlerteClient[] {
  return [...banquePuisArgent(p.gestes, p.phraseDe), ...banquesPartagees(p.userId, p.dossiers, p.nomDe), ...clefsPartagees(p.userId, p.appareils, p.nomDe)].sort((a, b) => b.poids - a.poids);
}
