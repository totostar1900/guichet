import type { Channel, Offer } from "./types";

/**
 * JOINDRE LE DESK SUR UNE LIGNE, EN UN GESTE.
 *
 * Un client dont l'e-mail et le numéro sont déjà prouvés n'a plus rien à
 * déclarer de lui-même : lui redemander son prénom, son nom, son téléphone et
 * son adresse pour poser une question est un péage qu'il a déjà payé. Le
 * formulaire d'intention existe pour engager une opération, pas pour demander
 * un rappel.
 *
 * LE MESSAGE RESTE DANS LA MAISON. Un lien « wa.me » ou « mailto » ouvrirait
 * l'application du client, et le desk ne verrait rien : ni fil, ni trace, ni
 * suite. La règle posée le 2 octobre 2026 est que la plateforme soit le seul
 * exemplaire du courrier, et une demande de rappel en fait partie. Le geste
 * dépose donc une intention « rappel » que le desk trouve dans sa file, avec
 * la ligne attachée et le canal choisi.
 *
 * LE CANAL EST CELUI DE LA RÉPONSE, pas celui de l'envoi. « WhatsApp » veut
 * dire « rappelez-moi là », et c'est ce que le desk lit.
 */
export const CANAUX: Channel[] = ["WhatsApp", "Appel", "E-mail"];

/**
 * Ce que le message dit par défaut.
 *
 * Il nomme la ligne, parce qu'un desk qui reçoit « bonjour, je voudrais des
 * informations » doit rouvrir la fiche pour savoir de quoi on parle. Il ne
 * promet rien et ne demande rien d'autre qu'un retour : c'est une prise de
 * contact, et le client la réécrit s'il veut.
 */
export const MESSAGE_CLEF = "Bonjour, je m'intéresse à la ligne « {t} » et j'aimerais en parler. Pouvez-vous me recontacter ?";

/** Le texte français, pour le serveur ; l'écran passe la clef par t() avec le titre. */
export function messageParDefaut(o: Pick<Offer, "title">): string {
  return MESSAGE_CLEF.replace("{t}", o.title);
}

/** Ce que le bouton d'un canal annonce, à la première personne. */
export const CANAL_PROMESSE: Record<Channel, string> = {
  WhatsApp: "Un conseiller vous écrit sur WhatsApp.",
  Appel: "Un conseiller vous appelle.",
  "E-mail": "Un conseiller vous répond par e-mail.",
};

/**
 * Les canaux qu'un client peut demander, d'après ce qu'il a prouvé.
 *
 * On ne propose pas un rappel téléphonique à qui n'a pas de numéro prouvé : le
 * desk n'aurait pas où appeler, et la demande resterait sans suite sans que
 * personne sache pourquoi. L'e-mail de la session est prouvé par la connexion
 * elle-même, donc il est toujours là.
 */
export function canauxOuverts(opts: { emailProuve: boolean; telephoneProuve: boolean }): Channel[] {
  const out: Channel[] = [];
  if (opts.telephoneProuve) out.push("WhatsApp", "Appel");
  if (opts.emailProuve) out.push("E-mail");
  return out;
}

/** Le contact rapide ne s'offre qu'à qui n'a plus rien à prouver. */
export const contactRapidePossible = (opts: { connecte: boolean; emailProuve: boolean; telephoneProuve: boolean }): boolean =>
  opts.connecte && (opts.emailProuve || opts.telephoneProuve);
