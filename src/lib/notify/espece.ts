import "server-only";
import { fmt, fmtDate } from "@/lib/format";
import { tmpl } from "./compose";
import { contactDuClient } from "./destinataire";
import { notifyRaw } from "./dispatch";

/**
 * CE QUE LE CLIENT APPREND QUAND SON ARGENT BOUGE.
 *
 * RELEVÉ À LA REVUE DES PAGES CLIENT du 26 octobre 2026 : cinq gestes du desk
 * déplaçaient de l'argent sur le compte d'un client sans qu'un mot ne parte.
 * Il l'apprenait EN REVENANT — l'accueil montre la position, l'avis dort dans
 * ses pièces — et « plus rien » ressemble trait pour trait à « rien n'est
 * arrivé ».
 *
 * ET UNE PROMESSE ÉCRITE ÉTAIT DÉMENTIE PAR LE CODE. Le robot des coupons
 * annonce l'échéance trois jours avant et le jour même, et sa phrase finit
 * par : « nous vous le confirmons par un avis dès qu'il est constaté. » Le
 * geste qui le constate — « porter au journal » — n'envoyait rien. La maison
 * promettait une confirmation qu'elle ne faisait pas.
 *
 * ─── CE QUE CES MESSAGES TIENNENT ──────────────────────────────────────────
 *
 *   ILS DISENT UN FAIT ACCOMPLI, jamais une intention : l'argent est arrivé,
 *   l'argent est parti. Un message envoyé avant le mouvement porterait un
 *   montant qui n'a pas encore bougé — c'est la règle déjà écrite sur l'avis
 *   de versement, qui se fabrique APRÈS le virement.
 *
 *   ILS PORTENT DE QUOI RECONNAÎTRE LA LIGNE SUR UN RELEVÉ BANCAIRE : le
 *   montant, la date de valeur, et ce que c'est. C'est la leçon de
 *   l'encaissement d'un prélèvement, et c'est ce qui distingue un avis d'une
 *   notification de politesse.
 *
 *   ET LEUR ÉCHEC NE RETIENT RIEN. L'argent est parti ; un message qui ne
 *   part pas se voit au fil du desk, nommément, et c'est au desk de décrocher
 *   son téléphone. Faire reculer une écriture d'espèces parce qu'un canal est
 *   injoignable serait le pire des deux maux.
 */
export interface Envoi {
  sent: boolean;
  error?: string;
}

const envoyer = async (userId: string, nom: string | undefined, subject: string, text: string): Promise<Envoi> => {
  try {
    const contact = await contactDuClient(userId, nom);
    if (!contact) return { sent: false, error: "aucun canal joignable" };
    const template = { name: tmpl("WA_TEMPLATE_UPDATE", "guichet_maj"), params: [contact.name, text] };
    const rows = await notifyRaw("intent_update", contact, { subject, text, template });
    return rows.some((x) => x.status === "sent") ? { sent: true } : { sent: false, error: rows.map((x) => `${x.channel} : ${x.status}`).join(" · ") || "aucun canal joignable" };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "échec de l'envoi" };
  }
};

/**
 * UN CRÉDIT CONSTATÉ : c'est la confirmation que le robot des coupons promet.
 *
 * L'ÉCART EST DIT S'IL Y EN A UN, et ce n'est pas un détail de comptable : un
 * client qui attendait 250 000 et en reçoit 243 750 va compter, et il doit
 * trouver l'explication chez nous avant de la chercher chez l'émetteur.
 */
export async function direLeCreditConstate(
  userId: string,
  p: { montant: number; attendu?: number; quoi: string; titre: string; valeurLe: string; nom?: string },
): Promise<Envoi> {
  const ecart = p.attendu != null ? Math.round(p.montant) - Math.round(p.attendu) : 0;
  const dit = ecart ? ` Vous attendiez ${fmt(p.attendu!)} FCFA : l'écart de ${ecart > 0 ? "+" : ""}${fmt(ecart)} est à votre journal, et le desk en a la pièce.` : "";
  return envoyer(
    userId,
    p.nom,
    `${p.quoi} de ${fmt(p.montant)} FCFA constaté`,
    `Purpose Capital : votre ${p.quoi.toLowerCase()} de ${fmt(p.montant)} FCFA sur ${p.titre} est constaté sur votre compte, valeur du ${fmtDate(p.valeurLe)}.${dit} Il est disponible, ou réinvesti selon votre instruction.`,
  );
}

/**
 * Une provision reçue sur un ordre : « votre virement est bien arrivé ».
 *
 * LE CORPS SE SUFFIT À LUI-MÊME, et l'objet ne compte pas : sur WhatsApp il
 * n'y a pas d'objet, et un message qui dit « nous avons bien reçu 3 000 000 »
 * sans nommer ce que c'est oblige le lecteur à deviner lequel de ses virements
 * vient d'arriver. Trouvé en écrivant l'épreuve, qui cherchait le mot dans le
 * corps et ne le trouvait que dans l'objet.
 */
export async function direLaProvisionRecue(userId: string, p: { montant: number; ref: string; nom?: string }): Promise<Envoi> {
  return envoyer(
    userId,
    p.nom,
    `Provision de ${fmt(p.montant)} FCFA reçue`,
    `Purpose Capital : nous avons bien reçu votre provision de ${fmt(p.montant)} FCFA, affectée à votre ordre ${p.ref}. Il suit son cours ; vous en lisez l'état dans le Guichet.`,
  );
}

/**
 * UN VERSEMENT PARTI, et l'écart s'il y en a un.
 *
 * Le disponible bouge entre la demande et le virement — un coupon tombe, un
 * ordre se règle — et le client qui a demandé 400 000 et en reçoit 412 000
 * doit lire pourquoi ici, et non le deviner.
 */
export async function direLeVersement(userId: string, p: { montant: number; demande?: number; nom?: string }): Promise<Envoi> {
  const ecart = p.demande != null ? Math.round(p.montant) - Math.round(p.demande) : 0;
  const dit = ecart ? ` Vous aviez demandé ${fmt(p.demande!)} FCFA ; votre disponible a bougé de ${ecart > 0 ? "+" : ""}${fmt(ecart)} depuis.` : "";
  return envoyer(
    userId,
    p.nom,
    `Versement de ${fmt(p.montant)} FCFA`,
    `Purpose Capital : ${fmt(p.montant)} FCFA sont virés sur votre compte bancaire.${dit} L'avis de versement est dans vos documents.`,
  );
}

/**
 * DES DROITS DE GARDE PRÉLEVÉS, et c'est le seul message de ce module qui
 * annonce un DÉBIT.
 *
 * « Un frais qu'on ne voit qu'en ligne est un frais qu'on subit ; celui qu'on
 * peut citer dans une réclamation est un frais qu'on vérifie » — c'est écrit
 * au-dessus de la fabrication de l'avis, et c'était vrai à moitié : le papier
 * était fabriqué, numéroté, déposé dans les pièces du client, et personne ne
 * lui disait qu'il existait. Il découvrait le prélèvement sur sa position.
 *
 * LE MESSAGE PORTE LA RÉFÉRENCE DE L'AVIS, parce que c'est elle qu'il citera
 * s'il conteste, et la période, parce qu'un frais sans période ne se vérifie
 * pas.
 *
 * IL NE PART QUE SI QUELQUE CHOSE EST DÛ : le barème est fermé à zéro par
 * défaut, et annoncer un prélèvement de zéro franc apprendrait à ne plus lire
 * ces messages-là.
 */
export async function direLesDroitsDeGarde(userId: string, p: { montant: number; periode: string; ref: string; nom?: string }): Promise<Envoi> {
  return envoyer(
    userId,
    p.nom,
    `Droits de garde ${p.periode} : ${fmt(p.montant)} FCFA`,
    `Purpose Capital : vos droits de garde pour ${p.periode} s'élèvent à ${fmt(p.montant)} FCFA, prélevés sur votre compte. L'avis ${p.ref} est dans vos documents : il détaille le calcul, ligne par ligne.`,
  );
}

/**
 * UN REFUS, AVEC SON MOTIF, et c'est le message le plus important des cinq.
 *
 * C'est l'argent du client qu'on garde. Le motif est déjà obligatoire en base
 * et dans le formulaire du desk — « un refus sans raison n'est pas une
 * réponse » — et il attendait pourtant que le client revienne le lire. Un
 * client qui attend un virement qui ne vient pas et dont personne ne lui
 * explique la raison n'a plus qu'à conclure au pire.
 */
export async function direLeRefusDuVersement(userId: string, p: { demande: number; motif: string; nom?: string }): Promise<Envoi> {
  return envoyer(
    userId,
    p.nom,
    `Votre demande de versement de ${fmt(p.demande)} FCFA`,
    `Purpose Capital : votre demande de versement de ${fmt(p.demande)} FCFA n'a pas été exécutée. ${p.motif} Votre argent reste sur votre compte, et vous pouvez redemander quand vous voulez.`,
  );
}
