import type { IntentState } from "@/lib/domain/types";
import type { PassageDef } from "./passages-catalog";

/**
 * Les messages préparés : ce que le desk écrit au client dans les quelques
 * situations qui reviennent tous les jours.
 *
 * Un centre d'appels appelle cela des réponses types, et les tient pour deux
 * raisons. La première est le temps : « il manque des pièces à votre dossier »
 * se réécrit vingt fois par semaine. La seconde compte davantage : écrite vingt
 * fois, la même règle finit par se dire de vingt façons, dont certaines
 * promettent ce que la maison ne tient pas.
 *
 * Trois choix tiennent ce qui suit.
 *
 * D'abord, un message préparé n'est pas un message envoyé. L'opérateur le
 * choisit, le lit, le corrige, puis l'ouvre dans WhatsApp ou dans son courrier.
 * Rien ne part sans une main. Une plateforme qui envoie toute seule finit par
 * écrire à un client mort ou par relancer celui qui vient d'appeler.
 *
 * Ensuite, le texte se range au Référentiel › Modèles, comme les passages des
 * documents : version, relecture, historique. Le desk possède ses mots. Le code
 * ne fournit que le premier jet.
 *
 * Enfin, les messages qui demandent quelque chose exigent la précision écrite,
 * exactement comme le motif « autre » d'une clôture : « il manque des pièces »
 * sans dire lesquelles fait perdre le tour suivant. C'est la même règle que
 * `cancel-reasons.ts` : un motif que le client ne peut pas lire n'est qu'une
 * case à cocher.
 */
export interface MessageDef extends PassageDef {
  /** Les états de l'ordre où ce message est le mot naturel : il passe devant. */
  when?: IntentState[];
  /** Ce que l'opérateur doit préciser ; le message ne se tient pas sans. */
  askNote?: string;
}

const M = (key: string, label: string, hint: string, placeholders: string[], fr: string, en: string, extra: { when?: IntentState[]; askNote?: string; required?: string[] } = {}): MessageDef => ({
  key,
  label,
  hint,
  sensitivity: "relu",
  placeholders,
  required: extra.required ?? [],
  fr,
  en,
  when: extra.when,
  askNote: extra.askNote,
});

/**
 * Le cadre : la salutation, le corps, la formule et la signature.
 *
 * Il est un passage comme les autres, donc réécrivable au Référentiel, mais
 * il ne se choisit pas : c'est l'enveloppe de tous les messages. L'écrire une
 * fois plutôt que huit a une raison pratique, changer la formule de politesse
 * d'un seul geste, et une raison de fond : huit copies d'une même phrase
 * finissent par en faire huit phrases différentes.
 *
 * Les lignes vides comptent. Un message se lit sur un téléphone, dans un fil,
 * entre deux messages de la famille : quarante mots d'un bloc s'y lisent comme
 * un mur, et un mur ne se lit pas.
 */
export const FRAME: MessageDef = M(
  "cadre",
  "Le cadre d'un message",
  "la salutation, la formule de politesse et la signature de tous les messages",
  ["client", "corps", "conseiller", "societe"],
  "Bonjour {client},\n\n{corps}\n\nNous restons à votre disposition.\n{conseiller} · {societe}",
  "Hello {client},\n\n{corps}\n\nWe remain at your disposal.\n{conseiller} · {societe}",
  { required: ["corps"] },
);

export const MESSAGES: MessageDef[] = [
  FRAME,
  M(
    "accuse",
    "Accusé : l'ordre est à l'étude",
    "quand le client attend un signe après le dépôt",
    ["ref", "ligne"],
    "Nous avons bien reçu votre ordre {ref} sur {ligne}.\nIl est à l'étude ; nous revenons vers vous dès qu'il avance.",
    "We have received your order {ref} on {ligne}.\nIt is under review; we will come back to you as soon as it moves.",
    { when: ["recue"] },
  ),
  M(
    "documents",
    "Pièces manquantes",
    "le message le plus fréquent : il nomme ce qui manque",
    ["ref", "ligne", "precision"],
    "Pour transmettre votre ordre {ref} sur {ligne}, il nous manque :\n\n{precision}\n\nVous pouvez les déposer depuis Mon espace, ou les envoyer en réponse à ce message.",
    "To send your order {ref} on {ligne} we are missing:\n\n{precision}\n\nYou can file them from My space, or send them in reply to this message.",
    { when: ["recue", "confirmee"], askNote: "Les pièces qui manquent, nommées", required: ["precision"] },
  ),
  M(
    "compte",
    "Compte-titres à ouvrir",
    "quand l'ordre attend l'ouverture du compte",
    ["ref", "ligne"],
    "Votre ordre {ref} sur {ligne} attend l'ouverture de votre compte-titres.\nLe dossier se remplit depuis Mon espace ; nous transmettons dès qu'il est complet.",
    "Your order {ref} on {ligne} is waiting for your securities account to be opened.\nThe file is filled in from My space; we send the order as soon as it is complete.",
    { when: ["recue", "confirmee"] },
  ),
  M(
    "provision",
    "Provision attendue",
    "quand le virement conditionne la transmission",
    ["ref", "ligne", "montant"],
    "Votre ordre {ref} sur {ligne} porte sur {montant}.\nLe virement de la provision sur notre compte de règlement clients nous permet de le transmettre.",
    "Your order {ref} on {ligne} is for {montant}.\nThe transfer of the funds to our client settlement account lets us send it.",
    { when: ["recue", "confirmee"] },
  ),
  M(
    "echeance",
    "L'échéance approche",
    "quand la date limite de la ligne se rapproche",
    ["ref", "ligne", "echeance"],
    "La date limite de dépôt sur {ligne} est le {echeance}.\nVotre ordre {ref} doit être complet d'ici là pour partir.",
    "The deadline on {ligne} is {echeance}.\nYour order {ref} has to be complete by then to go out.",
    { when: ["recue", "confirmee"], required: ["echeance"] },
  ),
  M(
    "relance",
    "Relance : sans réponse",
    "quand un message est resté sans retour",
    ["ref", "ligne"],
    "Nous vous avons écrit au sujet de votre ordre {ref} sur {ligne} et n'avons pas eu de retour.\nDites-nous si vous souhaitez le maintenir.",
    "We wrote to you about your order {ref} on {ligne} and have had no answer.\nTell us whether you wish to keep it.",
  ),
  M(
    "appel",
    "Proposer un appel",
    "quand la voix réglera plus vite que l'écrit",
    ["ref", "ligne", "precision"],
    "Au sujet de votre ordre {ref} sur {ligne} : pouvons-nous vous appeler {precision} ?\nSi ce moment ne vous convient pas, dites-nous le vôtre.",
    "About your order {ref} on {ligne}: may we call you {precision}?\nIf that time does not suit you, tell us yours.",
    { askNote: "Le créneau proposé, par exemple « demain matin »", required: ["precision"] },
  ),
  M(
    "autre",
    "Vos propres mots",
    "l'en-tête de la maison, et ce que vous avez à dire",
    ["ref", "ligne", "precision"],
    "Au sujet de votre ordre {ref} sur {ligne} :\n\n{precision}",
    "About your order {ref} on {ligne}:\n\n{precision}",
    { askNote: "Ce que vous avez à dire", required: ["precision"] },
  ),
];

export const messageDef = (key: string): MessageDef | undefined => MESSAGES.find((m) => m.key === key);

/**
 * L'ordre dans lequel les messages se présentent pour un ordre donné : ceux
 * que son état appelle d'abord, les autres ensuite, « vos propres mots » en
 * dernier. Le desk garde toute la liste ; seule la main change.
 */
export function messagesFor(state: IntentState): MessageDef[] {
  const rank = (m: MessageDef) => (m.key === "autre" ? 2 : m.when?.includes(state) ? 0 : 1);
  // Le cadre enveloppe les autres : il n'est pas un message qu'on choisit.
  return MESSAGES.filter((m) => m.key !== FRAME.key).sort((a, b) => rank(a) - rank(b));
}
