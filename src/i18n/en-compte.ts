/**
 * LE COMPTE EN PAGES : le sommaire, l'identité, l'appareil, et la sortie.
 *
 * La feuille qui s'ouvrait derrière l'initiale est devenue cinq pages le
 * 24 octobre 2026. Ses mots étaient dispersés dans trois dictionnaires, parce
 * qu'ils étaient arrivés par trois chemins — les tuiles, les canaux, les
 * réglages ; ceux des pages neuves tiennent ensemble, parce qu'ils se
 * relisent ensemble : les cinq rubriques du sommaire et les phrases qui les
 * annoncent doivent s'accorder, et « canal prouvé » doit se dire pareil sur
 * « Qui vous êtes » et sur « Sécurité ».
 *
 * DEUX MOTS PORTENT LE SENS DE CES PAGES. « Prouvé » se dit « verified » : le
 * canal a rendu un code, ce n'est pas une promesse mais un fait vérifié.
 * « Appareil » se dit « device », et « cet appareil-ci » devient « this
 * device » — l'insistance du français se perd, la précision reste.
 */
export const EN_COMPTE: Record<string, string> = {
  /* ---------- le sommaire ---------- */
  "Qui vous êtes, ce que la maison détient de vous, et ce que fait cet appareil-ci.": "Who you are, what the firm holds about you, and what this device does.",
  "Profil": "Profile",
  "nom, ville, e-mail, WhatsApp": "name, city, e-mail, WhatsApp",
  "aucun canal prouvé": "no verified channel",
  "votre dossier d'ouverture et les pièces qui le composent": "your account-opening file and the documents in it",
  "votre horizon, votre tolérance au risque, et ce que la maison en déduit": "your horizon, your risk tolerance, and what the firm concludes from them",
  "vos clés d'accès, les appareils reconnus, et comment les retirer": "your passkeys, the devices we recognise, and how to remove them",
  "Cet appareil": "This device",
  "Paramétrages": "Settings",
  "Un ordre commencé": "An order you started",
  "Sur {l}. Vous ne l'avez pas envoyé : il vous attend tant que vous ne le reprenez pas ou ne l'abandonnez pas.":
    "On {l}. You have not sent it: it waits for you until you pick it up again or drop it.",
  "Abandonner": "Drop it",
  "langue, alertes et couleurs": "language, alerts and colours",
  "la langue, les alertes, les couleurs, et par quel canal on vous joint d'abord": "your language, alerts, colours, and which channel we reach you on first",
  /* Les mots qu'on TAPE pour trouver cette page : un lecteur anglais tape « language » et « settings ». */
  "réglages paramètres préférences langue français anglais thème notifications relevés":
    "settings preferences language french english theme notifications statements",
  "alertes, couleurs, et par quel canal on vous joint d'abord": "alerts, colours, and which channel we reach you on first",
  /* LES TROIS MOTS DE CHAQUE RUBRIQUE, qui vivent dans COMPTE_PAGES et
     traversent t() en variable : aucun scanner ne les voit, et ils ressortent
     en français dans l'interface anglaise sans que rien n'échoue. Le sommaire
     n'en montre pas aujourd'hui — il lit le nom et la phrase — mais la table
     les porte, et toute surface qui la lit les affichera. */
  "nom, ville, canaux": "name, city, channels",
  "votre dossier": "your file",
  "horizon et tolérance": "horizon and tolerance",
  "clés et appareils": "passkeys and devices",
  "alertes et couleurs": "alerts and colours",

  /* ---------- la sortie ---------- */
  "Déconnecter tous vos appareils ? Il faudra se reconnecter sur chacun.": "Sign out of every device? You will have to sign in again on each one.",
  "Oui, partout": "Yes, everywhere",

  /* ---------- qui vous êtes ---------- */
  "Le nom qui s'imprime sur vos bulletins, et les deux canaux par lesquels la maison vous joint et vous fait signer.":
    "The name printed on your order forms, and the two channels the firm reaches you and has you sign on.",
  "Écrivez votre nom tel qu'il figure sur votre pièce d'identité : c'est lui qui s'imprime sur vos bulletins et vos relevés, et c'est lui que votre banque lit sur un virement.":
    "Write your name as it appears on your ID document: it is the one printed on your order forms and statements, and the one your bank reads on a transfer.",
  "C'est enregistré.": "Saved.",
  /* « Changer » et « Ajouter » traversaient t() dans un ternaire, que le
     scanner de clefs ne voit pas : ils sortaient en français dans l'interface
     anglaise depuis que la feuille du compte les posait, sans que rien
     n'échoue. La page les écrit aussi en clair, et c'est ce qui les a fait
     tomber. */
  Changer: "Change",
  Ajouter: "Add",
  "Vos canaux": "Your channels",
  "aucune adresse connue": "no address on file",
  "aucun numéro connu": "no number on file",
  "Un canal prouvé est celui sur lequel un code à usage unique peut partir : c'est ce qui vous permet de signer. Tant qu'aucun ne l'est, le desk vous appelle.":
    "A verified channel is one a one-time code can be sent to: it is what lets you sign. As long as neither is, the desk calls you.",

  /* ---------- cet appareil ---------- */
  "Ce que cet appareil-ci fait de lui-même, et ce que la maison fait partout : les alertes et les couleurs d'un côté, la façon de vous joindre de l'autre.":
    "What this device does on its own, and what the firm does everywhere: alerts and colours on one side, how we reach you on the other.",
  "Sur cet appareil": "On this device",
  "Sur tous vos appareils": "On all your devices",
  "Un bulletin à signer, une réponse du desk, une échéance : l'alerte part sur cet appareil-ci et sur aucun autre.":
    "An order form to sign, an answer from the desk, a payment due: the alert goes to this device and to no other.",
  "Choisies ici, gardées à votre compte : elles vous suivent sur vos autres appareils.": "Chosen here, kept on your account: they follow you to your other devices.",
  "Le français et l'anglais disent la même chose ; les documents officiels restent en français.": "French and English say the same thing; official documents stay in French.",

  /* ---------- le siège « Aide » ---------- */
  "Les deux présentations se rejouent par-dessus la page que vous regardez, et se ferment d'un geste.":
    "Both walkthroughs replay on top of the page you are looking at, and close with one gesture.",
  "ce qu'on nous demande": "what we get asked",
  "ce qu'on nous demande le plus souvent, répondu une fois pour toutes": "what we get asked most often, answered once and for all",
  "ce qu'une intention engage, la limite de chaque opération, les risques, et comment réclamer": "what an intention commits you to, the limit of each operation, the risks, and how to complain",
};
