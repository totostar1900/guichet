/**
 * « Trade » : les trois rayons, le parcours du téléphone, et la page qui
 * dit qui répond.
 *
 * Un fichier à eux parce qu'ils se relisent ensemble : l'écran large et le
 * téléphone rendent le MÊME texte dans le même ordre, et les séparer en deux
 * dictionnaires ferait diverger un mot d'un écran à l'autre — exactement ce
 * que l'harmonisation du 23 octobre 2026 est venue fermer.
 */
export const EN_TRADE: Record<string, string> = {
  /* ---- le parcours du téléphone ---- */
  "Où vous êtes": "Where you are",
  "Revenir": "Back",
  "{n} en place": "{n} in place",
  "1 en place": "1 in place",
  "en place": "in place",

  /* ---- les sommaires des sièges, sur téléphone ---- */
  "Ce que vous avez, ce qui vous est dû, et ce que vos lignes ont rendu.": "What you hold, what you are owed, and what your lines have returned.",
  "Les trois façons d'entrer sur une ligne : la cote, les fonds, et les séances des Trésors.":
    "The three ways onto a line: the exchange, the funds, and the Treasuries' auctions.",
  "1 ligne": "1 line",
  "{n} lignes": "{n} lines",
  "1 fonds": "1 fund",
  "{n} fonds": "{n} funds",
  "1 séance": "1 session",
  "{n} séances": "{n} sessions",

  /* ---- le siège « Aide », cinquième onglet du téléphone ---- */
  "Poser une question à la personne qui suit votre compte, ou trouver la réponse vous-même.":
    "Ask the person who follows your account, or find the answer yourself.",
  "Votre conseiller, le message déjà écrit, et le dépôt d'une réclamation.": "Your adviser, the message already written, and filing a complaint.",
  "Les éclairages, le parcours du marché, le simulateur et le glossaire.": "The explainers, the market walkthrough, the simulator and the glossary.",
  "Questions courantes": "Common questions",
  "Ce qu'on nous demande le plus souvent, répondu une fois pour toutes.": "What we are asked most often, answered once and for all.",
  "Ce que la maison ne promet pas, et ce qu'elle ne fait pas.": "What the firm does not promise, and what it does not do.",
  "Qui est Purpose Capital, sous quel agrément, et qui le contrôle.": "Who Purpose Capital is, under which licence, and who supervises it.",

  /* ---- nous contacter ---- */
  "Nous contacter": "Contact us",
  "Une personne suit votre compte. Écrivez-lui : le message part avec ce qu'il faut pour qu'on n'ait pas à vous demander qui vous êtes.":
    "A person follows your account. Write to them: the message leaves with what is needed, so nobody has to ask who you are.",
  "La réponse est souvent déjà écrite : le guide répond aux questions courantes, et les éclairages expliquent ce qui se passe derrière un ordre.":
    "The answer is often already written: the guide covers the common questions, and the explainers say what happens behind an order.",
  "Si quelque chose s'est mal passé et qu'un message ne suffit pas, déposez une réclamation : elle est enregistrée, datée, et vous en suivez le traitement.":
    "If something went wrong and a message is not enough, file a complaint: it is recorded, dated, and you follow how it is handled.",
  "Déposer une réclamation": "File a complaint",

  /* ---- à quoi chaque service sert : la phrase qui manquait ---- */
  "Prêter à un État de la zone en achetant ses titres à l'émission, au prix de l'adjudication plutôt qu'à celui du marché.":
    "Lend to a state of the zone by buying its securities at issue, at the auction price rather than the market's.",
  "Dire au desk ce que vous prendriez avant qu'une séance ouvre, sans vous engager, pour qu'il vous rappelle au bon moment.":
    "Tell the desk what you would take before a session opens, without committing, so it calls you back at the right time.",
  "Devenir actionnaire d'une société cotée à la BVMAC, ou revendre ce que vous détenez, au cours du marché.":
    "Become a shareholder in a company listed on the BVMAC, or sell back what you hold, at the market price.",
  "Confier une somme à un gérant agréé qui la répartit sur des dizaines de lignes : la diversification sans avoir à la faire soi-même.":
    "Entrust a sum to an approved manager who spreads it across dozens of lines: diversification without having to do it yourself.",
  "Changer de fonds sans sortir de votre argent, quand votre horizon ou votre besoin de liquidité a changé.":
    "Move between funds without taking your money out, when your horizon or your need for cash has changed.",
  "Placer une somme fixe chaque mois sans y penser : c'est la régularité qui fait le résultat, pas le moment choisi.":
    "Invest a fixed sum every month without thinking about it: regularity makes the result, not the moment you pick.",
  "Remettre au travail un coupon ou un remboursement dès son arrivée, au lieu de le laisser dormir sur un compte.":
    "Put a coupon or a redemption back to work as soon as it arrives, instead of letting it sleep in an account.",
  "Autoriser la maison à débiter votre compte bancaire à date fixe, sous un plafond que vous fixez, pour n'avoir plus de virement à faire.":
    "Authorise the firm to debit your bank account on a fixed date, under a cap you set, so you no longer have transfers to make.",
  "Laisser de l'argent chez nous pour que vos ordres se règlent sans attendre un virement, et le reprendre quand vous voulez.":
    "Leave money with us so your orders settle without waiting for a transfer, and take it back whenever you want.",
  "Vos titres sont inscrits à votre nom au dépositaire, jamais dans un compte collectif, et tout mouvement vous est prouvé.":
    "Your securities are registered in your name at the depositary, never in an omnibus account, and every movement is evidenced to you.",
};
