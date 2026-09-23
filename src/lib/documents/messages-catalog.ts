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

export const MESSAGES: MessageDef[] = [
  M(
    "accuse",
    "Accusé : l'ordre est à l'étude",
    "quand le client attend un signe après le dépôt",
    ["client", "ref", "ligne"],
    "Bonjour {client}, nous avons bien reçu votre ordre {ref} sur {ligne}. Il est à l'étude ; nous revenons vers vous dès qu'il avance.",
    "Hello {client}, we have received your order {ref} on {ligne}. It is under review; we will come back to you as soon as it moves.",
    { when: ["recue"] },
  ),
  M(
    "documents",
    "Pièces manquantes",
    "le message le plus fréquent : il nomme ce qui manque",
    ["client", "ref", "ligne", "precision"],
    "Bonjour {client}, pour transmettre votre ordre {ref} sur {ligne}, il nous manque : {precision}. Vous pouvez les déposer depuis Mon espace, ou les envoyer en réponse à ce message.",
    "Hello {client}, to send your order {ref} on {ligne} we are missing: {precision}. You can file them from My space, or send them in reply to this message.",
    { when: ["recue", "confirmee"], askNote: "Les pièces qui manquent, nommées", required: ["precision"] },
  ),
  M(
    "compte",
    "Compte-titres à ouvrir",
    "quand l'ordre attend l'ouverture du compte",
    ["client", "ref", "ligne"],
    "Bonjour {client}, votre ordre {ref} sur {ligne} attend l'ouverture de votre compte-titres. Le dossier se remplit depuis Mon espace ; nous transmettons dès qu'il est complet.",
    "Hello {client}, your order {ref} on {ligne} is waiting for your securities account to be opened. The file is filled in from My space; we send the order as soon as it is complete.",
    { when: ["recue", "confirmee"] },
  ),
  M(
    "provision",
    "Provision attendue",
    "quand le virement conditionne la transmission",
    ["client", "ref", "ligne", "montant"],
    "Bonjour {client}, votre ordre {ref} sur {ligne} porte sur {montant}. Le virement de la provision sur notre compte de règlement clients nous permet de le transmettre.",
    "Hello {client}, your order {ref} on {ligne} is for {montant}. The transfer of the funds to our client settlement account lets us send it.",
    { when: ["recue", "confirmee"] },
  ),
  M(
    "echeance",
    "L'échéance approche",
    "quand la date limite de la ligne se rapproche",
    ["client", "ref", "ligne", "echeance"],
    "Bonjour {client}, la date limite de dépôt sur {ligne} est le {echeance}. Votre ordre {ref} doit être complet d'ici là pour partir.",
    "Hello {client}, the deadline on {ligne} is {echeance}. Your order {ref} has to be complete by then to go out.",
    { when: ["recue", "confirmee"], required: ["echeance"] },
  ),
  M(
    "relance",
    "Relance : sans réponse",
    "quand un message est resté sans retour",
    ["client", "ref", "ligne"],
    "Bonjour {client}, nous vous avons écrit au sujet de votre ordre {ref} sur {ligne} et n'avons pas eu de retour. Dites-nous si vous souhaitez le maintenir ; nous restons à votre disposition.",
    "Hello {client}, we wrote to you about your order {ref} on {ligne} and have had no answer. Tell us whether you wish to keep it; we remain at your disposal.",
  ),
  M(
    "appel",
    "Proposer un appel",
    "quand la voix réglera plus vite que l'écrit",
    ["client", "ref", "ligne", "precision"],
    "Bonjour {client}, au sujet de votre ordre {ref} sur {ligne} : pouvons-nous vous appeler {precision} ? Si ce moment ne vous convient pas, dites-nous le vôtre.",
    "Hello {client}, about your order {ref} on {ligne}: may we call you {precision}? If that time does not suit you, tell us yours.",
    { askNote: "Le créneau proposé, par exemple « demain matin »", required: ["precision"] },
  ),
  M(
    "autre",
    "Vos propres mots",
    "l'en-tête de la maison, et ce que vous avez à dire",
    ["client", "ref", "ligne", "precision"],
    "Bonjour {client}, au sujet de votre ordre {ref} sur {ligne} : {precision}",
    "Hello {client}, about your order {ref} on {ligne}: {precision}",
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
  return [...MESSAGES].sort((a, b) => rank(a) - rank(b));
}
