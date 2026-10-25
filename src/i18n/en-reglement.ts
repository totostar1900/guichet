/**
 * Le compte de règlement : la page du desk qui l'écrit, et les lignes que le
 * client lit quand il n'est pas encore publié.
 *
 * Son fichier à lui, et non une annexe de « en-desk » : ces phrases nomment la
 * DESTINATION DE L'ARGENT, elles se relisent ensemble, et un client qui
 * conteste un virement cite celles du bas.
 */
export const EN_REGLEMENT: Record<string, string> = {
  /* ---- la page du desk ---- */
  "Compte de règlement": "Settlement account",
  "Les coordonnées que le client recopie dans le formulaire de sa banque, et que portent les appels de fonds. Elles s'écrivent ici : aucun déploiement, et aucune variable d'environnement à toucher.":
    "The details the client copies into their bank's form, and that calls for funds carry. They are written here: no deployment, and no environment variable to touch.",
  "Ce que les clients lisent en ce moment": "What clients are reading right now",
  "Rien n'est encore publié : {quoi}. Tant que c'est le cas, le chemin du virement dit au client de s'adresser au desk au lieu d'afficher des coordonnées incomplètes.":
    "Nothing is published yet: {quoi}. Until it is, the transfer path tells the client to ask the desk instead of showing incomplete details.",
  "Publié le {d}{par}.": "Published on {d}{par}.",
  ", écrit par {q}": ", written by {q}",
  "Valeurs livrées avec le code, jamais écrites au desk.": "Values shipped with the code, never written by the desk.",
  "Les écrire": "Writing them",
  "Un enregistrement ne publie rien : il laisse un brouillon, qu'une autre personne du desk relit et publie. Ce n'est pas une formalité — un faux RIB arrive toujours par une seule main pressée, et c'est la seconde main qui l'arrête.":
    "Saving publishes nothing: it leaves a draft, which another person at the desk reads and publishes. This is not a formality — a false account number always arrives by one hurried hand, and it is the second hand that stops it.",
  "Où ces lignes sortent": "Where these lines come out",
  "les trois lignes et le motif, avec un bouton de recopie par ligne.": "the three lines and the reference, with a copy button on each.",
  "L'appel de fonds d'un ordre : le motif y est la référence de l'ordre, pas celle du compte.":
    "The call for funds on an order: there the reference is the order's, not the account's.",
  "L'appel de fonds d'une souscription de fonds, et celui d'un versement complémentaire.":
    "The call for funds on a fund subscription, and on a further payment.",
  "Un document déjà émis garde les coordonnées qu'il portait : un PDF est une pièce, pas une vue.":
    "A document already issued keeps the details it carried: a PDF is a record, not a view.",
  "garde qui a écrit et qui a publié, et l'audit garde l'avant et l'après.": "keeps who wrote and who published, and the audit keeps the before and the after.",

  /* ---- les quatre champs ---- */
  "BIC / SWIFT": "BIC / SWIFT",
  "Tel qu'il doit être tapé chez la banque du client.": "As it must be typed at the client's bank.",
  "Le nom tel qu'il figure sur un relevé.": "The name as it appears on a statement.",
  "Lettres, chiffres, espaces, points, tirets et barres. Aucun contrôle de clef IBAN : un RIB de la zone n'en porte pas toujours.":
    "Letters, digits, spaces, dots, dashes and slashes. No IBAN check digit control: an account number in the zone does not always carry one.",
  "8 ou 11 caractères. Sans lui, un client de la diaspora ne peut pas virer depuis l'étranger.":
    "8 or 11 characters. Without it, a client in the diaspora cannot transfer from abroad.",
  "Pourquoi ce changement": "Why this change",
  "changement de banque de règlement, nouveau compte ségrégué…": "change of settlement bank, new segregated account…",
  "Enregistrer en brouillon": "Save as a draft",

  /* ---- le brouillon et sa publication ---- */
  "Un brouillon attend": "A draft is waiting",
  "Écrit par {q}.": "Written by {q}.",
  "Vous l'avez écrit : une autre personne du desk doit le publier. C'est la règle des quatre yeux, et elle regarde la personne, pas le rôle.":
    "You wrote it: another person at the desk must publish it. That is the four-eyes rule, and it looks at the person, not the role.",
  "Vous l'avez écrit, et aucun autre responsable n'est en poste : la publication passera seule, et elle sera dite au journal.":
    "You wrote it, and no other manager is in post: the publication will go through alone, and it will be stated in the journal.",
  "Vous ne l'avez pas écrit : vous pouvez le publier.": "You did not write it: you may publish it.",
  "— rien —": "— nothing —",
  "Recopiez « publier »": "Copy the word « publier »",
  "Publier ces coordonnées": "Publish these details",
  "Jeter le brouillon": "Discard the draft",

  /* ---- ce que le client lit ---- */
  "le BIC": "the BIC",
  "Les coordonnées ne sont pas encore publiées": "The details are not published yet",
  "Demandez-les à votre conseiller avant de faire un virement : nous préférons vous le dire plutôt que vous laisser recopier un numéro incomplet.":
    "Ask your adviser for them before making a transfer: we would rather tell you than let you copy an incomplete number.",
  "Ce motif est le vôtre et ne changera pas : c'est lui qui rattachera votre virement à votre compte.":
    "This reference is yours and will not change: it is what will attach your transfer to your account.",
};
