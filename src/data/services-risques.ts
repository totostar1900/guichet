/**
 * « SERVICES ET RISQUES ASSOCIÉS » (7 novembre 2026) : la documentation qui complète les mentions légales.
 *
 * Elle ne fait PAS partie du texte qu'un client accepte (« legal.ts », versionné) : elle l'explique. Une modification ici ne redemande donc aucune
 * signature. Chaque ligne affirmée s'appuie sur ce que l'application fait déjà (« flows.ts » pour le parcours d'un ordre, « summary.ts » pour les
 * chiffres) ; rien n'y promet un dispositif que la maison n'a pas décrit (garantie d'investisseurs, assurance) : ce passage reste à écrire avec la
 * conformité. LE TON SUIT ETALON § 10 : le geste de la maison avant la mise en garde, un vocabulaire calme, la liquidité en premier, aucune mention
 * retirée, un seul lien vers le texte opposable.
 */
export interface Bi {
  fr: string;
  en: string;
}
export interface DocLigne {
  terme: Bi;
  texte: Bi;
}
export interface DocSection {
  id: string;
  /** Le mot de la bande de menu. */
  onglet: Bi;
  title: Bi;
  intro?: Bi;
  lignes?: DocLigne[];
  fin?: Bi;
}

/** Date de dernière relecture de ces pages (jour de leur écriture). */
export const SERVICES_RISQUES_RELU_LE = "2026-11-07";

export const SERVICES: DocSection = {
  id: "services",
  onglet: { fr: "Nos services", en: "Our services" },
  title: { fr: "Ce que le Guichet fait pour vous", en: "What the Guichet does for you" },
  intro: {
    fr: "Le Guichet est le service en ligne de Purpose Capital, société de bourse agréée. Il est fait pour que vous compreniez avant de décider, et pour que vous ne soyez jamais seul au moment de décider.",
    en: "The Guichet is the online service of Purpose Capital, a licensed brokerage firm. It is made so that you understand before you decide, and are never alone when you do.",
  },
  lignes: [
    { terme: { fr: "Vous présenter les instruments", en: "Presenting the instruments" }, texte: { fr: "Titres publics (obligations, bons, rachats du Trésor), actions cotées à la BVMAC et fonds (OPCVM), avec leurs chiffres expliqués en clair.", en: "Public securities (bonds, bills, Treasury buybacks), shares listed on the BVMAC and funds (UCITS), with their figures explained in plain words." } },
    { terme: { fr: "Vous mettre en relation avec un conseiller", en: "Putting you in touch with an adviser" }, texte: { fr: "Vous déclarez une intention ; un conseiller de Purpose Capital vous rappelle, confirme avec vous, et seul le bulletin que vous signez engage.", en: "You declare an intention; a Purpose Capital adviser calls you back and confirms with you, and only the order form you sign commits you." } },
    { terme: { fr: "Suivre pour vous", en: "Following for you" }, texte: { fr: "Alertes sur une séance, suivi d'une ligne cotée, échéances à venir, avis d'opéré et documents rangés dans votre espace.", en: "Alerts on an auction, follow of a listed line, upcoming maturities, execution notices and documents kept in your space." } },
    { terme: { fr: "Vous laisser la décision", en: "Leaving the decision to you" }, texte: { fr: "Vous êtes seul à donner vos ordres : la maison n'en exécute d'aucun tiers. Le conseil adapté à votre situation, c'est votre conseiller qui vous le donne.", en: "You alone give your orders: the firm executes none from a third party. Advice suited to your situation comes from your adviser." } },
  ],
};

export const INSTRUMENTS: DocSection = {
  id: "instruments",
  onglet: { fr: "Les instruments", en: "The instruments" },
  title: { fr: "Les instruments, en une fiche chacun", en: "The instruments, one card each" },
  intro: { fr: "Pour chacun : à quoi il sert, puis ce qui mérite votre attention.", en: "For each: what it is for, then what deserves your attention." },
  lignes: [
    { terme: { fr: "Obligation du Trésor (OTA)", en: "Treasury bond (OTA)" }, texte: { fr: "Vous prêtez à un État de la zone ; il vous verse un coupon chaque année et vous rembourse le nominal à l'échéance. À l'adjudication, le prix servi fixe votre rendement. À veiller : revendre avant l'échéance se fait au prix du jour, qui peut différer du prix d'achat, et un ordre peut n'être servi qu'en partie.", en: "You lend to a state of the zone; it pays you a coupon each year and repays the face value at maturity. At the auction, the price served sets your yield. Worth watching: selling before maturity is done at the day's price, which may differ from your purchase price, and an order may be served only in part." } },
    { terme: { fr: "Bon du Trésor (BTA)", en: "Treasury bill (BTA)" }, texte: { fr: "Un placement court, sans coupon : vous l'achetez sous le nominal, il vous est remboursé au nominal, et la différence est votre rendement, connu à l'adjudication. À veiller : le taux de chaque séance est celui de la séance.", en: "A short placement, with no coupon: you buy it below face value, it is repaid at face value, and the difference is your yield, known at the auction. Worth watching: each session's rate is that session's." } },
    { terme: { fr: "Rachat du Trésor", en: "Treasury buyback" }, texte: { fr: "L'État rachète une ligne à 100 % du nominal avant son échéance : utile pour libérer de la trésorerie ou réinvestir. À veiller : le rachat est une offre du Trésor, ouverte pendant une fenêtre.", en: "The state buys back a line at 100% of face value before maturity: useful to free cash or reinvest. Worth watching: the buyback is an offer by the Treasury, open during a window." } },
    { terme: { fr: "Action cotée (BVMAC)", en: "Listed share (BVMAC)" }, texte: { fr: "Une part du capital d'une société, achetée au cours de séance ; elle peut verser un dividende voté chaque année. À veiller : peu d'actions s'échangent à chaque séance, donc revendre peut demander du temps ; le cours monte et baisse, et le capital n'est pas garanti.", en: "A share of a company's capital, bought at the session price; it may pay a dividend voted each year. Worth watching: few shares trade at every session, so selling may take time; the price goes up and down, and the capital is not guaranteed." } },
    { terme: { fr: "Fonds (OPCVM)", en: "Fund (UCITS)" }, texte: { fr: "Des parts d'un portefeuille géré par une société de gestion, souscrites à la prochaine valeur liquidative. À veiller : ni le capital ni la performance ne sont garantis, et les frais du fonds réduisent le rendement.", en: "Units of a portfolio run by a management company, subscribed at the next net asset value. Worth watching: neither capital nor performance is guaranteed, and the fund's fees reduce the return." } },
  ],
};

export const RISQUES_DETAIL: DocSection = {
  id: "types-de-risques",
  onglet: { fr: "Les risques", en: "The risks" },
  title: { fr: "Les risques, un par un", en: "The risks, one by one" },
  intro: { fr: "La liquidité vient en premier, parce que c'est le trait de ce marché. Chaque risque est dit avec ce que vous pouvez faire.", en: "Liquidity comes first, because it is the trait of this market. Each risk is stated with what you can do." },
  lignes: [
    { terme: { fr: "Liquidité", en: "Liquidity" }, texte: { fr: "Revendre une ligne peu échangée peut prendre du temps ou se faire à un prix moins favorable. Chaque carte affiche depuis quand le cours n'a pas bougé : prévoyez ce que vous n'aurez pas besoin de revendre vite.", en: "Selling a thinly traded line may take time or be done at a less favourable price. Each card shows since when the price has not moved: plan for what you will not need to resell quickly." } },
    { terme: { fr: "Prix", en: "Price" }, texte: { fr: "Un cours évolue avec le marché, dans les deux sens. La variation affichée est celle des trois derniers mois, hors dividendes : elle décrit le passé et ne préjuge pas de l'avenir.", en: "A price moves with the market, both ways. The change shown is that of the last three months, excluding dividends: it describes the past and does not predict the future." } },
    { terme: { fr: "Taux", en: "Interest rate" }, texte: { fr: "Le prix d'une obligation baisse quand les taux montent, et monte quand ils baissent. Gardée jusqu'à l'échéance, elle est remboursée au nominal.", en: "A bond's price falls when rates rise, and rises when they fall. Held to maturity, it is repaid at face value." } },
    { terme: { fr: "Émetteur", en: "Issuer" }, texte: { fr: "Un émetteur peut ne pas payer, ou payer en retard : État, société ou fonds. Regarder qui émet, et répartir entre plusieurs émetteurs, réduit l'effet d'un seul.", en: "An issuer may fail to pay, or pay late: state, company or fund. Looking at who issues, and spreading across several issuers, reduces the effect of any one." } },
    { terme: { fr: "Allocation", en: "Allocation" }, texte: { fr: "À une adjudication, votre ordre peut n'être servi qu'en partie, ou pas du tout : l'allocation est décidée par l'émetteur à la clôture.", en: "At an auction, your order may be served in part, or not at all: the allocation is decided by the issuer at closing." } },
    { terme: { fr: "Pays et marché", en: "Country and market" }, texte: { fr: "Les décisions publiques et la situation économique d'un pays peuvent peser sur la valeur de ses titres. Les pays de la zone sont affichés par un drapeau sur chaque ligne.", en: "Public decisions and a country's economic situation may weigh on the value of its securities. Countries of the zone are shown by a flag on each line." } },
    { terme: { fr: "Règlement et dépositaire", en: "Settlement and custodian" }, texte: { fr: "Entre l'ordre et l'inscription des titres, un règlement-livraison à T+n fait intervenir le dépositaire : un incident technique peut retarder l'inscription. Votre avis d'opéré en fait foi.", en: "Between the order and the registration of securities, a T+n delivery-versus-payment involves the custodian: a technical incident may delay registration. Your execution notice is the proof." } },
    { terme: { fr: "Information", en: "Information" }, texte: { fr: "Certaines données (dernier cours, séance annoncée) viennent de tiers et peuvent arriver avec retard. La date de chaque chiffre est affichée.", en: "Some data (last price, announced session) come from third parties and may arrive late. The date of each figure is shown." } },
    { terme: { fr: "Fiscalité", en: "Taxation" }, texte: { fr: "Elle dépend de votre situation et de votre pays de résidence. Les rendements affichés sont bruts, avant impôt.", en: "It depends on your situation and country of residence. Yields shown are gross, before tax." } },
  ],
  fin: { fr: "Le texte opposable est « Risques et limites » ; cette page l'explique sans le remplacer.", en: "The binding text is “Risks and limits”; this page explains it without replacing it." },
};

export const CHIFFRES: DocSection = {
  id: "chiffres",
  onglet: { fr: "Les chiffres", en: "The figures" },
  title: { fr: "Lire les chiffres d'une ligne", en: "Reading a line's figures" },
  intro: { fr: "Tous les indicateurs de l'application, avec ce qu'ils mesurent et ce qu'ils ne disent pas.", en: "Every indicator of the app, with what it measures and what it does not say." },
  lignes: [
    { terme: { fr: "Coupon", en: "Coupon" }, texte: { fr: "Ce que le Trésor verse chaque année, en pourcentage du nominal. C'est un taux facial, pas un rendement.", en: "What the Treasury pays each year, as a percentage of face value. It is a face rate, not a yield." } },
    { terme: { fr: "Rendement actuariel", en: "Actuarial yield" }, texte: { fr: "Ce que vous gagnez par an en gardant la ligne jusqu'à l'échéance, au prix indiqué, coupons compris. Brut, hors commission et fiscalité.", en: "What you earn per year by holding the line to maturity, at the price shown, coupons included. Gross, before commission and tax." } },
    { terme: { fr: "« Si servi à » · « servi à »", en: "“If served at” · “served at”" }, texte: { fr: "Le prix sur lequel le rendement est calculé : attendu avant l'adjudication, constaté après.", en: "The price on which the yield is calculated: expected before the auction, observed after." } },
    { terme: { fr: "Rendement non affiché", en: "Yield not shown" }, texte: { fr: "Quand l'échéance n'est connue que par son année et qu'il reste moins d'un an, un rendement serait une devinette : la carte préfère se taire et dit le coupon.", en: "When the maturity is known only by its year and less than a year remains, a yield would be a guess: the card prefers silence and shows the coupon." } },
    { terme: { fr: "Variation sur 3 mois", en: "3-month change" }, texte: { fr: "L'écart du cours d'une action en trois mois, hors dividendes. Une performance passée.", en: "A share price's change over three months, excluding dividends. A past performance." } },
    { terme: { fr: "Dividende et rendement du dividende", en: "Dividend and dividend yield" }, texte: { fr: "Le dividende versé sur le dernier exercice, et son rapport au cours. Il se vote chaque année : un dividende passé n'est pas une promesse.", en: "The dividend paid for the last year, and its ratio to the price. It is voted each year: a past dividend is not a promise." } },
    { terme: { fr: "Cours inchangé depuis", en: "Price unchanged since" }, texte: { fr: "Depuis combien de temps la ligne ne s'est pas échangée. C'est le repère de sa liquidité.", en: "How long the line has not traded. It is the marker of its liquidity." } },
    { terme: { fr: "Ticket minimum", en: "Minimum ticket" }, texte: { fr: "Le plus petit montant souscriptible : un titre, ou le lot fixé par le desk.", en: "The smallest amount you can subscribe: one security, or the lot set by the desk." } },
    { terme: { fr: "Échéance et durée", en: "Maturity and term" }, texte: { fr: "La date de remboursement, et le temps qu'il reste.", en: "The repayment date, and the time left." } },
    { terme: { fr: "Valeur liquidative", en: "Net asset value" }, texte: { fr: "Le prix d'une part de fonds à une date donnée ; sa date est affichée.", en: "The price of a fund unit at a given date; its date is shown." } },
    { terme: { fr: "Pastille d'état", en: "State pill" }, texte: { fr: "Ouverte, Clôturée, ou Cotée ; avant la clôture, un compte à rebours.", en: "Open, Closed, or Listed; before closing, a countdown." } },
  ],
};

export const ORDRES: DocSection = {
  id: "ordres",
  onglet: { fr: "Vos ordres", en: "Your orders" },
  title: { fr: "De l'intention au titre inscrit", en: "From intention to registered security" },
  intro: { fr: "Rien n'est engagé avant votre signature. Voici le chemin, et qui fait quoi.", en: "Nothing is committed before you sign. Here is the path, and who does what." },
  lignes: [
    { terme: { fr: "1 · Vous déclarez une intention", en: "1 · You declare an intention" }, texte: { fr: "Sans engagement : vous dites ce qui vous intéresse.", en: "No commitment: you say what interests you." } },
    { terme: { fr: "2 · Un conseiller vous rappelle", en: "2 · An adviser calls you back" }, texte: { fr: "Il confirme avec vous la ligne, le montant et votre situation.", en: "They confirm the line, the amount and your situation with you." } },
    { terme: { fr: "3 · Vous signez le bulletin", en: "3 · You sign the order form" }, texte: { fr: "C'est la signature qui engage. Vous virez les fonds sur le compte ségrégué.", en: "The signature is what commits. You transfer the funds to the segregated account." } },
    { terme: { fr: "4 · L'ordre est déposé ou exécuté", en: "4 · The order is placed or executed" }, texte: { fr: "À l'adjudication, au prix servi ; sur la cote, au cours de la séance. Une adjudication peut ne vous servir qu'en partie.", en: "At an auction, at the price served; on the exchange, at the session price. An auction may serve you only in part." } },
    { terme: { fr: "5 · Règlement et avis d'opéré", en: "5 · Settlement and execution notice" }, texte: { fr: "Le dépositaire règle et livre à T+n, les titres sont inscrits à votre nom, et l'avis d'opéré dans votre espace en fait foi.", en: "The custodian settles and delivers at T+n, the securities are registered in your name, and the execution notice in your space is the proof." } },
  ],
};

export const PROTECTION: DocSection = {
  id: "protection",
  onglet: { fr: "Votre argent", en: "Your money" },
  title: { fr: "Votre argent et vos titres", en: "Your money and your securities" },
  intro: { fr: "Ce que la maison fait pour les garder à l'abri, et vers qui se tourner.", en: "What the firm does to keep them safe, and who to turn to." },
  lignes: [
    { terme: { fr: "Un compte ségrégué", en: "A segregated account" }, texte: { fr: "Les fonds d'un ordre sont virés sur un compte ségrégué, distinct des comptes de la maison.", en: "An order's funds are transferred to a segregated account, separate from the firm's own accounts." } },
    { terme: { fr: "Des titres à votre nom", en: "Securities in your name" }, texte: { fr: "Le dépositaire ouvre votre compte-titres, et les titres y sont inscrits à votre nom.", en: "The custodian opens your securities account, and the securities are registered in your name." } },
    { terme: { fr: "Un régulateur", en: "A regulator" }, texte: { fr: "Purpose Capital est agréée et surveillée par la COSUMAF.", en: "Purpose Capital is licensed and supervised by COSUMAF." } },
    { terme: { fr: "Une réponse écrite", en: "A written answer" }, texte: { fr: "Une réclamation reçoit une réponse écrite ; à défaut d'accord, la COSUMAF peut être saisie.", en: "A complaint receives a written answer; failing agreement, COSUMAF may be seised." } },
  ],
};

/** L'ordre des sections de la page, et l'onglet de chacune : les sections « legal.ts » y gardent leur place, intactes. */
export const ORDRE_DE_LA_PAGE: ({ doc: DocSection } | { legal: string; onglet: Bi })[] = [
  { legal: "qui", onglet: { fr: "Qui sommes-nous", en: "Who we are" } },
  { doc: SERVICES },
  { doc: INSTRUMENTS },
  { legal: "risques", onglet: { fr: "Les risques", en: "The risks" } },
  { doc: RISQUES_DETAIL },
  { doc: CHIFFRES },
  { legal: "conseil", onglet: { fr: "Notre rôle", en: "Our role" } },
  { doc: ORDRES },
  { doc: PROTECTION },
  { legal: "canaux", onglet: { fr: "Vos données", en: "Your data" } },
  { legal: "reclamation", onglet: { fr: "Réclamations", en: "Complaints" } },
];
