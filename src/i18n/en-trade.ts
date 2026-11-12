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
  "La réponse est souvent déjà écrite : les questions courantes répondent à ce qu'on nous demande le plus, et les éclairages expliquent ce qui se passe derrière un ordre.":
    "The answer is often already written: the common questions cover what we are asked most, and the insights say what happens behind an order.",
  "Si quelque chose s'est mal passé et qu'un message ne suffit pas, déposez une réclamation":
    "If something went wrong and a message is not enough, file a complaint",
  "Message de {nom}": "Message from {nom}",
  "Ma question porte sur la ligne {ligne}.": "My question is about the line {ligne}.",
  "la ligne {ligne}": "the line {ligne}",
  "Déposer une réclamation": "File a complaint",

  /* ---- à quoi chaque service sert : la phrase qui manquait ---- */
  "Prêter à un État de la zone en achetant ses titres à l'émission, au prix de l'adjudication plutôt qu'à celui du marché.":
    "Lend to a state of the zone by buying its securities at issue, at the auction price rather than the market's.",
  "Dire au desk ce que vous prendriez avant qu'une séance ouvre, sans vous engager, pour qu'il vous rappelle au bon moment.":
    "Tell the desk what you would take before a session opens, without committing, so it calls you back at the right time.",
  /* LA RAISON D'ÊTRE DE LA COTE A CHANGÉ AVEC SON NOM : « devenir
     actionnaire » ne couvrait que la moitié de ce que `/titres` montre. */
  "Acheter ou revendre au cours du marché ce qui est inscrit au bulletin de la BVMAC : les actions des sociétés, et les obligations des États, des institutions régionales et des entreprises.":
    "Buy or sell at the market price whatever is listed on the BVMAC bulletin: company shares, and the bonds of states, regional institutions and companies.",
  "Souscrire à une émission avant qu'elle soit cotée : le prix est fixé par l'émetteur et ne bouge pas pendant la fenêtre, contrairement à un cours.":
    "Subscribe to an issue before it is listed: the price is set by the issuer and does not move during the window, unlike a market price.",
  "Céder une ligne avant son terme quand le Trésor en offre le rachat. C'est une sortie, pas un placement : renoncer aux coupons restants se compare au rendement d'un réemploi.":
    "Sell a line before its term when the Treasury offers to buy it back. This is an exit, not an investment: giving up the remaining coupons is to be compared with the yield of reinvesting.",
  "Confier une somme à un gérant agréé qui la répartit sur des dizaines de lignes : la diversification sans avoir à la faire soi-même.":
    "Entrust a sum to an approved manager who spreads it across dozens of lines: diversification without having to do it yourself.",
  "Déplacer votre argent d'une ligne à une autre sans vous désinvestir entre les deux : rien ne part tant que l'arrivée n'est pas tenue.":
    "Move your money from one line to another without divesting in between: nothing leaves until the destination is secured.",
  "Placer une somme fixe chaque mois sans y penser : c'est la régularité qui fait le résultat, pas le moment choisi.":
    "Invest a fixed sum every month without thinking about it: regularity makes the result, not the moment you pick.",
  "Remettre au travail un coupon ou un remboursement dès son arrivée, au lieu de le laisser dormir sur un compte.":
    "Put a coupon or a redemption back to work as soon as it arrives, instead of letting it sleep in an account.",
  /* Même correction que dans « en-console » : le plafond a quitté la phrase
     française le 25 octobre 2026, et sa clef anglaise ne la rejoignait plus. */
  "Autoriser la maison à débiter votre compte bancaire à date fixe, du montant exact que vous écrivez, pour n'avoir plus de virement à faire.":
    "Authorise the firm to debit your bank account on a fixed date, for the exact amount you write, so you no longer have transfers to make.",
  "Laisser de l'argent chez nous pour que vos ordres se règlent sans attendre un virement, et le reprendre quand vous voulez.":
    "Leave money with us so your orders settle without waiting for a transfer, and take it back whenever you want.",
  "Vos titres sont inscrits à votre nom au dépositaire, jamais dans un compte collectif, et tout mouvement vous est prouvé.":
    "Your securities are registered in your name at the depositary, never in an omnibus account, and every movement is evidenced to you.",
  "Les instruments en bref": "The instruments in brief",
  "En un coup d'œil": "At a glance",
  "Délai": "Timing",
  "un cours": "a quoted price",
  "la valeur liquidative": "the net asset value",
  "le prix d'adjudication": "the auction price",
  "en séance, en continu": "during the session, continuously",
  "à la prochaine valeur liquidative": "at the next net asset value",
  "à la clôture du dépôt": "when bidding closes",
  "dividende ou coupon": "dividend or coupon",
  "variation de la valeur liquidative": "change in the net asset value",
  "taux actuariel de l'adjudication": "the auction's actuarial yield",
  "Écart acheteur / vendeur": "Bid / ask spread",
  "Dernier versement + capital": "Last payment + principal",
  "Prochain versement par titre": "Next payment per security",
  "Coupons et remboursement jusqu'au terme": "Coupons and redemption to maturity",
  "Gain brut si gardée jusqu'au terme": "Gross gain if held to maturity",
  "Ce que la ligne verse": "What the line pays",
  "3 mois": "3 months",
  "sur 3 mois": "over 3 months",
  "variation du cours": "price change",
  "Rendement": "Yield",
  "du dividende": "of dividend",
  "Cours inchangé depuis": "Price unchanged for",
  "Comment lire la variation": "How to read the change",
  "La variation d'une action est celle de son cours sur trois mois, hors dividendes. Elle décrit le passé : elle ne préjuge pas des performances futures.": "A share's change is the change in its price over three months, excluding dividends. It describes the past: it does not predict future performance.",
  "Pour investir sereinement": "To invest with peace of mind",
  "Liquidité.": "Liquidity.",
  "Peu d'actions s'échangent à chaque séance : prévoyez un délai pour revendre, et gardez en tête que le prix de vente peut différer du dernier cours. L'âge du cours est affiché sur chaque carte.": "Few shares trade at each session: allow time to sell, and keep in mind that the selling price may differ from the last price. The age of the price is shown on each card.",
  "Prix.": "Price.",
  "Un cours évolue avec le marché, dans les deux sens ; le capital investi n'est pas garanti.": "A price moves with the market, in both directions; the capital invested is not guaranteed.",
  "Dividende.": "Dividend.",
  "Il dépend des résultats de la société et se vote chaque année : un dividende passé n'est pas une promesse.": "It depends on the company's results and is voted each year: a past dividend is not a promise.",
  "Un repère simple : n'investissez que ce que vous pouvez conserver, et répartissez entre plusieurs sociétés.": "A simple rule of thumb: only invest what you can keep invested, and spread it across several companies.",
  "Tout savoir sur les risques et les limites": "Everything about the risks and limits",
  "Les variations de cours sont des performances passées, mesurées sur trois mois et hors dividendes : elles ne préjugent pas des performances futures. Un cours reste inchangé quand une ligne n'est pas échangée : la carte dit depuis quand.": "Price changes are past performance, measured over three months and excluding dividends: they do not predict future performance. A price stays unchanged when a line does not trade: the card says since when.",
  "Actions et obligations cotées : deux lectures": "Listed shares and bonds: two ways to read them",
  "Une action.": "A share.",
  "Vous détenez une part d'une société. Son cours est en FCFA ; le chiffre de tête est la variation du cours, le cours est dessous. Le rendement est le dividende de la dernière année rapporté au cours : il dépend des résultats et se vote chaque année. Il n'y a pas d'échéance.":
    "You hold a share of a company. Its price is in FCFA; the headline figure is the change in the price, with the price underneath. The yield is the last year's dividend divided by the price: it depends on results and is voted every year. There is no maturity date.",
  "Une obligation cotée.": "A listed bond.",
  "Vous prêtez à un émetteur, qui verse un coupon et rembourse le nominal à l'échéance. Son cours est en pourcentage du nominal : 100 % veut dire « au pair ». Le rendement est le taux actuariel, ce que vous gagnez au cours du jour si vous la gardez jusqu'à l'échéance, coupons compris : il diffère du coupon dès que le cours n'est pas à 100 %. La variation du cours compte moins, puisque le prix se rapproche de 100 % à mesure que l'échéance approche.":
    "You lend to an issuer, who pays a coupon and repays the nominal at maturity. Its price is a percentage of the nominal: 100 % means “at par”. The yield is the yield to maturity, what you earn at today's price if you hold it to maturity, coupons included: it differs from the coupon as soon as the price is not 100 %. The change in price matters less, since the price moves towards 100 % as maturity approaches.",
  "Pas de rendement affiché ?": "No yield shown?",
  "Une action sans dividende connu, une obligation déjà remboursée, ou dont on ne connaît que l'année d'échéance et qui arrive à terme dans l'année : le chiffre serait faux, alors la ligne n'en montre pas.":
    "A share with no known dividend, a bond already repaid, or one whose maturity is known only by year and falls due within the year: the figure would be wrong, so the line shows none.",
};
