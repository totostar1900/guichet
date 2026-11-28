/**
 * « COMPRENDRE L'INVESTISSEMENT » : LE CONTENU DE LA PRÉSENTATION « INVESTIR AVEC GUICHET », CONDENSÉ EN DIX SECTIONS (28 novembre 2026, le client : « B : une page de l'application » ; « condensée »).
 *
 * UNE SEULE SOURCE POUR LA PAGE, en français et en anglais, dans l'ordre de la présentation : les trois questions du novice (que puis-je acheter, que puis-je gagner et risquer, comment ça se passe).
 * Les exemples chiffrés sont ceux des éclairages (une OTA à 6 % rapporte 600 FCFA par titre de 10 000) : illustratifs, jamais une ligne en vente. Aucun mot ne promet, aucun ne conseille
 * (ETALON.md § 10). Les frais se disent en une seule ligne, « Frais » : jamais leur composition ni leur destination.
 */
export interface Bi {
  fr: string;
  en: string;
}
export interface SectionDeComprendre {
  id: string;
  titre: Bi;
  intro?: Bi;
  /** Une liste « terme · explication », rendue en rangées à plat. */
  lignes?: { terme: Bi; texte: Bi }[];
  /** Une mention en petit, sous la section. */
  fin?: Bi;
}

export const COMPRENDRE_RELU_LE = "2026-11-28";

export const COMPRENDRE: SectionDeComprendre[] = [
  {
    id: "investir",
    titre: { fr: "Investir, c'est faire travailler son argent", en: "Investing means putting your money to work" },
    intro: { fr: "Trois gestes, quatre familles de produits sur Guichet. Aucun ne se confond avec un compte d'épargne : le capital n'est pas garanti.", en: "Three actions, four product families on Guichet. None is a savings account: your capital is not guaranteed." },
    lignes: [
      { terme: { fr: "Prêter", en: "Lend" }, texte: { fr: "Vous prêtez à un État ou à une entreprise : il verse des intérêts et rend l'argent à une date fixée. Bons et obligations.", en: "You lend to a state or a company: it pays interest and returns the money on a set date. Bills and bonds." } },
      { terme: { fr: "Détenir", en: "Own" }, texte: { fr: "Vous achetez une part d'une société : son prix varie, elle peut verser un dividende. Actions.", en: "You buy a share of a company: its price moves and it may pay a dividend. Shares." } },
      { terme: { fr: "Mettre en commun", en: "Pool" }, texte: { fr: "Vous achetez une part d'un panier géré par un professionnel, avec d'autres épargnants. Fonds (OPCVM).", en: "You buy a unit of a basket run by a professional, alongside other savers. Funds (UCITS)." } },
    ],
  },
  {
    id: "curseurs",
    titre: { fr: "Tout placement se juge sur trois choses", en: "Every investment is judged on three things" },
    lignes: [
      { terme: { fr: "Ce que je peux gagner", en: "What I can earn" }, texte: { fr: "Des intérêts, un dividende, une hausse du prix. Toujours « si » : jamais garanti, sauf ce que le contrat fixe à l'avance.", en: "Interest, a dividend, a price rise. Always “if”: never guaranteed, except what the contract sets in advance." } },
      { terme: { fr: "Quand je récupère mon argent", en: "When I get my money back" }, texte: { fr: "À une échéance, à la prochaine valeur liquidative, ou en revendant en séance, ce qui peut prendre du temps.", en: "At maturity, at the next net asset value, or by selling in a session, which can take time." } },
      { terme: { fr: "Ce qui peut mal tourner", en: "What can go wrong" }, texte: { fr: "L'émetteur ne paie pas, le prix baisse, on ne trouve pas d'acheteur : chaque produit a ses risques propres.", en: "The issuer does not pay, the price falls, no buyer is found: each product has its own risks." } },
    ],
  },
  {
    id: "portes",
    titre: { fr: "La page Investir : trois portes, deux marchés", en: "The Invest page: three doors, two markets" },
    lignes: [
      { terme: { fr: "Titres", en: "Securities" }, texte: { fr: "Obligations, bons et actions cotées à la BVMAC. Prix : un cours. Délai : en séance.", en: "Bonds, bills and listed shares on the BVMAC. Price: a quote. Timing: in session." } },
      { terme: { fr: "Fonds", en: "Funds" }, texte: { fr: "Les OPCVM de la zone, avec leur catégorie et leur société de gestion. Prix : la valeur liquidative.", en: "The region's funds, with their category and management company. Price: the net asset value." } },
      { terme: { fr: "Adjudications", en: "Auctions" }, texte: { fr: "Les séances où le Trésor émet ses bons et obligations. Prix : celui de la séance.", en: "The sessions where the Treasury issues its bills and bonds. Price: the session's." } },
      { terme: { fr: "Marché primaire", en: "Primary market" }, texte: { fr: "Vous souscrivez auprès de l'émetteur, pendant une fenêtre limitée, lors d'une adjudication.", en: "You subscribe from the issuer, during a limited window, at an auction." } },
      { terme: { fr: "Marché secondaire", en: "Secondary market" }, texte: { fr: "Vous achetez à un autre investisseur, au cours du jour, sur une ligne déjà cotée.", en: "You buy from another investor, at the day's price, on an already listed line." } },
    ],
  },
  {
    id: "familles",
    titre: { fr: "Les quatre familles, en un coup d'œil", en: "The four families at a glance" },
    intro: { fr: "Exemples illustratifs : ce ne sont pas des lignes en vente.", en: "Illustrative examples: these are not lines on sale." },
    lignes: [
      { terme: { fr: "Bon du Trésor (BTA)", en: "Treasury bill (BTA)" }, texte: { fr: "Un prêt court à l'État, de moins de deux ans. L'intérêt est déduit du prix : un bon de 1 000 000 FCFA à 5,5 % sur 52 semaines se paie environ 944 400 et rembourse 1 000 000 à l'échéance. Risque principal : l'État ne paie pas.", en: "A short loan to the state, under two years. Interest is deducted from the price: a 1,000,000 FCFA bill at 5.5% over 52 weeks costs about 944,400 and repays 1,000,000 at maturity. Main risk: the state does not pay." } },
      { terme: { fr: "Obligation (OTA, cotée)", en: "Bond (OTA, listed)" }, texte: { fr: "Un prêt long avec un coupon chaque année : une OTA à 6 % rapporte 600 FCFA par titre de 10 000 FCFA, car le coupon se calcule sur le nominal. Le rendement dépend du prix payé. Risques : l'émetteur ne paie pas, le prix varie si l'on revend avant l'échéance.", en: "A long loan with a yearly coupon: a 6% OTA pays 600 FCFA per 10,000 FCFA bond, because the coupon is calculated on the nominal. The yield depends on the price paid. Risks: the issuer does not pay; the price moves if you sell before maturity." } },
      { terme: { fr: "Action cotée", en: "Listed share" }, texte: { fr: "Une part d'une société. Pour une action à 45 000 FCFA qui verse 2 500 FCFA de dividende brut, le rendement du dividende est de 5,6 %. Ni échéance, ni capital garanti ; le dividende dépend des résultats et du vote de l'assemblée.", en: "A share of a company. For a share at 45,000 FCFA paying a 2,500 FCFA gross dividend, the dividend yield is 5.6%. No maturity, no guaranteed capital; the dividend depends on results and the shareholders' vote." } },
      { terme: { fr: "Fonds (OPCVM)", en: "Fund (UCITS)" }, texte: { fr: "Une part d'un panier géré. Le prix d'une part, la valeur liquidative, est calculé à intervalle régulier : souscrire 1 000 000 FCFA un mardi, avec une valeur calculée le jeudi, se fait à la valeur de jeudi. Quatre catégories, du plus calme au plus mobile : monétaire, obligataire, diversifié, actions.", en: "A unit of a managed basket. The unit price, the net asset value, is calculated at regular intervals: subscribing 1,000,000 FCFA on a Tuesday, with a value calculated on Thursday, is done at Thursday's value. Four categories, from calmest to most volatile: money market, bond, balanced, equity." } },
    ],
  },
  {
    id: "carte",
    titre: { fr: "Lire une carte de la page Investir", en: "Reading a card on the Invest page" },
    intro: { fr: "Quatre zones, toujours dans le même ordre. Touchez le chevron pour déplier la carte : elle ajoute une phrase « En clair » et les trois curseurs. Tirez la carte vers la gauche pour contacter, déclarer une intention sans engagement, ou suivre la ligne.", en: "Four zones, always in the same order. Tap the chevron to unfold the card: it adds a plain-language sentence and the three sliders. Swipe the card left to get in touch, declare a non-binding intention, or follow the line." },
  },
  {
    id: "fiche",
    titre: { fr: "Lire une fiche", en: "Reading a line's page" },
    intro: { fr: "La fiche s'ouvre sur « En bref » : la phrase, puis les trois curseurs. Dessous, chaque section répond à une question.", en: "The page opens with “In brief”: the sentence, then the three sliders. Below, each section answers a question." },
    lignes: [
      { terme: { fr: "Rendement", en: "Yield" }, texte: { fr: "Ce que le titre rapporte par an, selon le prix payé.", en: "What the security earns per year, given the price paid." } },
      { terme: { fr: "Calendrier", en: "Calendar" }, texte: { fr: "Les dates qui comptent : jusqu'à quand agir, quand c'est réglé, quand votre argent revient.", en: "The dates that matter: until when to act, when it settles, when your money comes back." } },
      { terme: { fr: "Documents", en: "Documents" }, texte: { fr: "Les documents officiels de la ligne : en cas de doute, ils font foi.", en: "The line's official documents: when in doubt, they prevail." } },
      { terme: { fr: "L'émetteur", en: "The issuer" }, texte: { fr: "Qui emprunte, et sa situation : c'est lui qui paie les intérêts et rembourse.", en: "Who borrows, and their situation: they pay the interest and repay." } },
    ],
  },
  {
    id: "mots",
    titre: { fr: "Les mots de la page", en: "The page's words" },
    lignes: [
      { terme: { fr: "ISIN", en: "ISIN" }, texte: { fr: "Le code d'identité d'un titre ; il sert à passer un ordre.", en: "A security's identity code; it is used to place an order." } },
      { terme: { fr: "Nominal", en: "Nominal" }, texte: { fr: "La valeur de départ d'un titre de dette (10 000 FCFA pour une OTA).", en: "The starting value of a debt security (10,000 FCFA for an OTA)." } },
      { terme: { fr: "Coupon", en: "Coupon" }, texte: { fr: "L'intérêt annuel, calculé sur le nominal.", en: "The yearly interest, calculated on the nominal." } },
      { terme: { fr: "Rendement actuariel", en: "Yield to maturity" }, texte: { fr: "Ce que vous gagnez par an si vous gardez jusqu'à l'échéance.", en: "What you earn per year if you hold to maturity." } },
      { terme: { fr: "Ticket minimum", en: "Minimum ticket" }, texte: { fr: "Le plus petit montant que vous pouvez souscrire.", en: "The smallest amount you can subscribe." } },
      { terme: { fr: "Valeur liquidative", en: "Net asset value" }, texte: { fr: "Le prix d'une part de fonds.", en: "The price of one fund unit." } },
      { terme: { fr: "Cours inchangé depuis", en: "Price unchanged since" }, texte: { fr: "Depuis combien de temps la ligne ne s'est pas échangée.", en: "How long the line has gone without trading." } },
      { terme: { fr: "Décote", en: "Discount" }, texte: { fr: "Un prix inférieur à 100 % du nominal : le rendement dépasse alors le coupon.", en: "A price under 100% of nominal: the yield then exceeds the coupon." } },
    ],
  },
  {
    id: "periode",
    titre: { fr: "Choisir la période", en: "Choosing the period" },
    intro: { fr: "Sur Titres, la période change à la fois la courbe, la variation, le filtre hausse ou baisse et le tri : 3 mois, 6 mois ou 1 an. Sur Fonds, elle mesure la rentabilité sur 3, 6, 12 mois, 2 ou 3 ans. Une période grisée dit « historique insuffisant » : la page n'invente pas un chiffre. Comparez deux lignes sur la même période.", en: "On Securities, the period changes the curve, the change, the rise/fall filter and the sort: 3 months, 6 months or 1 year. On Funds, it measures the return over 3, 6, 12 months, 2 or 3 years. A greyed period says “not enough history”: the page never makes up a figure. Compare two lines over the same period." },
    fin: { fr: "Ce sont des performances passées, hors dividendes : elles ne préjugent pas des performances futures.", en: "These are past performances, excluding dividends: they do not predict future performance." },
  },
  {
    id: "risques",
    titre: { fr: "Les quatre risques", en: "The four risks" },
    lignes: [
      { terme: { fr: "Crédit", en: "Credit" }, texte: { fr: "L'émetteur peut ne pas payer. On ne prête pas tout à un seul émetteur.", en: "The issuer may not pay. Do not lend everything to a single issuer." } },
      { terme: { fr: "Liquidité", en: "Liquidity" }, texte: { fr: "Revendre peut prendre plusieurs séances, à un prix inférieur. On n'engage que ce qu'on peut immobiliser.", en: "Selling can take several sessions, at a lower price. Only commit what you can tie up." } },
      { terme: { fr: "Prix", en: "Price" }, texte: { fr: "La valeur varie avec les taux et le marché. Gardé jusqu'au terme, un titre de dette délivre le rendement calculé, si l'émetteur honore son engagement.", en: "Value moves with rates and the market. Held to maturity, a debt security delivers the calculated yield, if the issuer honours its commitment." } },
      { terme: { fr: "Allocation", en: "Allocation" }, texte: { fr: "Une intention n'est ni un ordre ni une garantie d'être servi.", en: "An intention is neither an order nor a guarantee of being allotted." } },
    ],
    fin: { fr: "Le geste le plus simple : répartir entre plusieurs émetteurs et plusieurs échéances, avec un montant que l'on peut garder jusqu'au terme. Le texte opposable est la page « Risques et limites ».", en: "The simplest step: spread across several issuers and maturities, with an amount you can hold to the end. The binding text is the “Risks and limits” page." },
  },
  {
    id: "ordre",
    titre: { fr: "Comment se passe un ordre", en: "How an order works" },
    intro: { fr: "Une fois le dossier approuvé et la convention acceptée, un ordre suit quatre gestes.", en: "Once your file is approved and the agreement accepted, an order follows four steps." },
    lignes: [
      { terme: { fr: "1 · J'exprime", en: "1 · I state" }, texte: { fr: "Montant ou quantité, prix limite si vous en voulez un. Aucun engagement à ce stade.", en: "Amount or quantity, a limit price if you want one. No commitment at this stage." } },
      { terme: { fr: "2 · Le desk vérifie", en: "2 · The desk checks" }, texte: { fr: "Dossier, profil, canaux de contact. Il confirme, ou vous fait une contre-proposition.", en: "File, profile, contact channels. It confirms, or makes a counter-proposal." } },
      { terme: { fr: "3 · Je relis et je signe", en: "3 · I review and sign" }, texte: { fr: "Une ligne « Frais » donne le total à payer. Je signe avec le code de mon compte.", en: "A single “Fees” line gives the total to pay. I sign with my account code." } },
      { terme: { fr: "4 · Je suis la piste", en: "4 · I follow the track" }, texte: { fr: "Signé, transmis, servi ou exécuté, réglé : visible à tout moment dans « Mes ordres ». Le document de l'ordre est partagé par e-mail ou WhatsApp.", en: "Signed, forwarded, allotted or executed, settled: visible at any time under “My orders”. The order document is shared by e-mail or WhatsApp." } },
    ],
    fin: { fr: "Délais : un bon ou une obligation en adjudication est exécuté à la clôture de la séance ; une ligne cotée, en séance quand une contrepartie existe ; un fonds, à la prochaine valeur liquidative.", en: "Timing: a bill or bond at auction is executed at the session close; a listed line, in session when a counterparty exists; a fund, at the next net asset value." },
  },
];
