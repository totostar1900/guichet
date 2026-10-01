/**
 * English for Trader: the nine services, their steps, and where each one starts.
 *
 * The steps live in `src/lib/domain/services.ts` as a record keyed by service,
 * so `t()` receives a variable and the missing-keys script cannot see them.
 * They are added here by hand, and this file exists so that the next hand does
 * not have to hunt for them among six thousand other rows.
 */
export const EN_TRADER: Record<string, string> = {
  /* ---------- la page ---------- */
  "Ce que vous pouvez faire": "What you can do",
  "Chaque geste dit son état, ce qu'il fait pour vous en ce moment avec vos chiffres, et ses étapes dans l'ordre. Aucun ne décrit un service en général.":
    "Each move states where it stands, what it does for you right now with your own figures, and its steps in order. None describes a service in general.",
  "Allons-y": "Let's go",
  Trader: "Trader",

  /* ---------- écarter une pièce qui n'est pas un résultat ---------- */
  "chiffres douteux": "figures that do not hold",
  autre: "other",
  obligatoire: "required",
  "Dites lequel : c'est tout ce que le registre gardera": "Say which: that is all the register will keep",

  /* ---------- le carnet du desk ---------- */
  "{n} à décider": "{n} to decide",
  "en continu": "continuous",

  /* ---------- le menu du compte ---------- */
  "Comprendre et nous joindre": "Understanding, and reaching us",
  "ce que chaque opération engage": "what each operation commits you to",

  /* ---------- la barre à quatre sièges ---------- */
  "Les pages de {s}": "The pages of {s}",
  "La performance": "Performance",
  Réinvestir: "Reinvest",
  "le rendement pondéré par les flux, depuis l'origine": "the money-weighted return, since inception",
  "où remettre un coupon ou un remboursement qui vient de tomber": "where to put back a coupon or a redemption that has just landed",
  /* « Portefeuille » et « Automatique » sont déjà traduits ailleurs : les
     redire ici en ferait deux vérités, et la dernière chargée gagnerait. */
  "Portefeuille › Espèces": "Portfolio › Cash",
  /* Le singulier de la ligne tenue : « 1 lignes inscrites » se lisait sur la
     première page qu'un client ouvre. */
  "1 ligne inscrite à votre nom au dépositaire.": "1 line registered in your name at the depositary.",

  /* ---------- 01 · placement primaire ---------- */
  "Choisir la séance annoncée, sur le calendrier des adjudications.": "Pick the announced session, from the auction calendar.",
  "Dire le montant, et le taux auquel vous seriez preneur si vous en voulez un.": "State the amount, and the rate you would take if you want one.",
  "Le desk confirme, édite le bordereau et transmet la demande avec celles des autres investisseurs.":
    "The desk confirms, issues the contract note and sends the request out with those of the other investors.",
  "Le dépouillement dit le montant servi et le prix ; les titres sont ensuite inscrits à votre nom au dépositaire.":
    "The allotment states the amount filled and the price ; the securities are then registered in your name at the depository.",

  /* ---------- 02 · courtage sur actions cotées ---------- */
  "Choisir la ligne à la cote de la BVMAC.": "Pick the line on the BVMAC exchange.",
  "Dire la quantité, et un prix limite si vous ne voulez pas acheter à n'importe quel cours.":
    "State the quantity, and a limit price if you do not want to buy at any price.",
  "Le desk porte l'ordre au carnet.": "The desk takes the order to the book.",
  "L'exécution revient avec son prix, et le règlement suit à la date du marché.": "The fill comes back with its price, and settlement follows on the market's date.",

  /* ---------- 03 · intermédiation sur les fonds ---------- */
  "Choisir le fonds, sa catégorie et la périodicité de sa valeur liquidative.": "Pick the fund, its category and how often its net asset value is struck.",
  "Dire le montant à souscrire.": "State the amount to subscribe.",
  "La VL retenue à la centralisation fixe le nombre exact de parts : il n'est donc connu qu'après.":
    "The NAV used at centralisation sets the exact number of units : it is therefore known only afterwards.",

  /* ---------- 04 · conservation et tenue de compte ---------- */
  "Rien à activer : la conservation commence avec votre première ligne.": "Nothing to switch on : custody begins with your first line.",
  "Les titres sont inscrits à votre nom au dépositaire, jamais dans un compte collectif.":
    "The securities are registered in your name at the depository, never in an omnibus account.",
  "Le relevé et les avis d'opéré suivent chaque mouvement ; les droits de garde sont appelés par période.":
    "The statement and the confirmations follow every movement ; custody fees are charged by period.",

  /* ---------- 05 · réinvestissement ---------- */
  "Un coupon ou un remboursement arrive sur votre poche.": "A coupon or a redemption lands in your cash.",
  "Fixer une destination et un plancher, une fois : en dessous du plancher, rien ne part.": "Set a destination and a floor, once : below the floor, nothing goes out.",
  "À chaque encaissement, l'ordre se prépare tout seul et vous est présenté avant de partir.":
    "On each receipt the order prepares itself and is shown to you before it goes out.",

  /* ---------- 06 · épargne programmée ---------- */
  "Fixer le montant, le jour du mois et la destination.": "Set the amount, the day of the month and the destination.",
  "Signer une fois : c'est cette signature qui vaut pour les prélèvements suivants.": "Sign once : that signature is what governs the later debits.",
  "Le versement part chaque mois sans qu'on y revienne, et s'arrête au premier mot de votre part.":
    "The payment goes out every month without being revisited, and stops at your first word.",

  /* ---------- 07 · sondage avant adjudication ---------- */
  "Une séance est annoncée, environ une semaine avant sa tenue.": "A session is announced, about a week before it is held.",
  "Dire le taux auquel vous seriez preneur, sans engagement : ce n'est pas un ordre.": "State the rate you would take, without commitment : this is not an order.",
  "Le desk en tient compte quand l'ordre se forme, et revient vers vous avant la clôture.":
    "The desk takes it into account as the order takes shape, and comes back to you before the cut-off.",

  /* ---------- 08 · passage d'un fonds à l'autre ---------- */
  "Partir d'une part que vous détenez et qui est rachetable.": "Start from a unit you hold that can be redeemed.",
  "Choisir le fonds d'arrivée.": "Pick the fund to move into.",
  "Le rachat et la souscription se signent ensemble, et les deux VL retenues sont dites avant la signature.":
    "The redemption and the subscription are signed together, and both NAVs used are stated before signing.",

  /* ---------- 09 · appariement des intentions ---------- */
  "Ouvrir le signal, fermé par défaut : sans lui, rien n'est rapproché.": "Open the signal, closed by default : without it, nothing is matched.",
  "Une intention de sens inverse peut alors croiser la vôtre.": "An intention in the opposite direction can then cross yours.",
  "Le desk vous prévient avant tout rapprochement : il ne se fait jamais dans votre dos.": "The desk tells you before any match : it never happens behind your back.",
};
