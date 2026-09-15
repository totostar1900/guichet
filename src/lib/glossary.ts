/**
 * The words the site uses, explained once — the info bubbles, the ratio
 * explanations and the « Repères » page all read from here.
 */
export interface Term {
  short: string; // the label as shown
  long?: string; // what the acronym stands for
  text: string; // one or two plain sentences
}

export const GLOSSARY = {
  per: { short: "PER", long: "Price Earnings Ratio — cours / bénéfice par action", text: "Combien d'années de bénéfice vous payez au cours du jour. Entre 5 et 12 est courant sur les marchés africains ; plus haut, le marché paie la croissance attendue ou la rareté du titre." },
  rendement_dividende: { short: "Rendement du dividende", text: "Le dernier dividende brut divisé par le cours : ce que l'action verse chaque année si le dividende est maintenu, avant retenue à la source (16,5 % au Cameroun)." },
  rendement_actuariel: { short: "Rendement actuariel", text: "Ce que rapporte réellement un titre de dette acheté à ce prix et gardé jusqu'à l'échéance, coupons et coupon couru compris (convention Exact/Exact). Seule mesure comparable d'une ligne à l'autre." },
  capitalisation: { short: "Capitalisation", text: "Le cours multiplié par toutes les actions de la société, flottant compris : la valeur que la bourse lui donne. La part réellement échangeable est bien plus petite (3 à 20 %)." },
  flottant: { short: "Flottant", text: "La part du capital détenue par le public et effectivement en bourse. Un flottant faible = peu de titres à acheter ou vendre, un cours qui bouge par à-coups." },
  ytd: { short: "Depuis le 1er janvier", long: "YTD — year to date", text: "La variation du cours depuis la première séance de l'année, telle que la BVMAC la publie ; « — » pour une société introduite dans l'année." },
  rendement_cours: { short: "Rendement", text: "Ce que la ligne rapporte, brut, au prix du moment — le chiffre à comparer d'une ligne à l'autre. Obligations (à souscrire ou cotées) : au pair, le taux nominal du titre ; avec décote ou prime, le rendement actuariel au prix indiqué ou au dernier cours, coupon couru compris ; « ≈ » quand seule l'année de l'échéance est publiée. Actions et introductions : dernier dividende brut rapporté au cours ou au prix de souscription — un dividende passé, décidé chaque année, jamais garanti. Fonds : performance annualisée depuis la création. Avant impôt : la retenue diffère selon l'instrument et l'État." },
  cours: { short: "Cours", text: "Le dernier prix auquel le titre s'est échangé à la BVMAC (clôture de la séance). Si rien ne s'est échangé, la bourse republie le cours précédent." },
  bnpa: { short: "BNPA", long: "Bénéfice net par action", text: "Le bénéfice de l'exercice divisé par le nombre d'actions : ce que chaque action a gagné, distribué ou non." },
  payout: { short: "Part du bénéfice distribuée", long: "Taux de distribution (payout)", text: "Dividende par action divisé par le bénéfice par action. 100 % = tout le bénéfice est reversé ; 0 % = tout est conservé dans la société." },
  marge_nette: { short: "Marge nette", text: "Bénéfice net divisé par le chiffre d'affaires : ce qui reste sur 100 FCFA de ventes une fois tout payé. À comparer d'une année sur l'autre plutôt qu'entre secteurs." },
  roe: { short: "ROE", long: "Return on equity — rentabilité des fonds propres", text: "Bénéfice net divisé par les fonds propres : le rendement de l'argent que les actionnaires ont dans la société. Au-dessus de 10 %, le capital est bien rémunéré." },
  price_to_book: { short: "Cours / fonds propres", long: "Price to book", text: "Le cours rapporté à la valeur comptable d'une action (fonds propres ÷ actions). Sous 1, le marché paie moins que ce que la société possède ; au-dessus, il valorise aussi la marque, la position ou la rentabilité." },
  fonds_propres: { short: "Fonds propres", text: "Ce que la société possède moins ce qu'elle doit : la part du bilan qui appartient aux actionnaires. Ils grossissent quand la société garde une partie de ses bénéfices." },
  total_bilan: { short: "Total du bilan", text: "Tout ce que l'entreprise possède (immobilisations, stocks, créances, trésorerie). Pour une banque, il est surtout fait des dépôts des clients : il est normal qu'il soit très supérieur aux fonds propres." },
  chiffre_affaires: { short: "Chiffre d'affaires", text: "Le total des ventes de l'exercice. Pour une banque on parle de produit net bancaire (intérêts et commissions nets) ; pour un réassureur, de primes acquises." },
  valeur_ajoutee: { short: "Valeur ajoutée", text: "Chiffre d'affaires moins les achats et services extérieurs : la richesse créée par l'entreprise avant de payer les salaires, l'État et les banques." },
  resultat_net: { short: "Résultat net", text: "Le bénéfice (ou la perte) de l'exercice une fois toutes les charges, les intérêts et l'impôt payés. C'est sur lui que se calcule le dividende." },
  dividende: { short: "Dividende brut", text: "La part du bénéfice versée par action, avant la retenue à la source. Décidé chaque année par l'assemblée des actionnaires : il n'est jamais garanti." },
  ticket: { short: "Ticket minimum", text: "Le plus petit montant que vous pouvez engager sur la ligne, en FCFA, et ce qu'il représente en titres. Sur une adjudication, c'est le nominal minimum (le décaissement réel dépend du prix servi, du coupon couru et de la commission) ; sur une ligne cotée, le lot minimum au dernier cours." },
  commission: { short: "Commission", text: "La rémunération de Purpose Capital sur l'opération, en % du montant. Elle s'ajoute au prix à l'achat et se déduit du produit à la vente ; elle est indiquée avant toute intention." },
  vl: { short: "VL", long: "Valeur liquidative", text: "Le prix d'une part d'un fonds : actifs du fonds moins ses dettes, divisé par le nombre de parts. Souscriptions et rachats se font à la prochaine VL, inconnue au moment de l'ordre." },
  coupon: { short: "Coupon", text: "L'intérêt annuel d'une obligation, en % du nominal. Le coupon couru est la part déjà produite depuis le dernier paiement : l'acheteur l'avance, puis la récupère au coupon suivant." },
  coupon_couru: { short: "Coupon couru", text: "Intérêts déjà produits depuis le dernier versement. Vous les avancez au règlement, puis les récupérez intégralement au coupon suivant." },
  seuils: { short: "Seuils de séance", text: "Les bornes entre lesquelles la BVMAC autorise le cours à bouger pendant une séance (± 10 % environ autour de la référence)." },
  liquidite: { short: "Liquidité", text: "La facilité à acheter ou vendre sans faire bouger le prix. À la BVMAC, comptez souvent plusieurs séances pour un ordre de taille." },
  volume: { short: "Volume", text: "Le nombre de titres échangés pendant la séance ; la valeur échangée est ce volume multiplié par les prix d'exécution." },
  nominal: { short: "Nominal", text: "La valeur faciale d'un titre de dette, celle que l'émetteur rembourse à l'échéance et sur laquelle le coupon est calculé. Une obligation cotée « 99 % » vaut 99 % de son nominal." },
  bta: { short: "BTA", long: "Bon du Trésor assimilable", text: "Titre de dette de l'État à moins de deux ans, à intérêts précomptés : on paie moins que le nominal et on reçoit le nominal à l'échéance." },
  ota: { short: "OTA", long: "Obligation du Trésor assimilable", text: "Titre de dette de l'État à plus de deux ans, avec un coupon annuel et un remboursement à l'échéance." },
  adjudication: { short: "Adjudication", text: "La vente aux enchères des titres du Trésor : chaque banque agréée (SVT) dépose des offres, le Trésor retient les mieux-disantes. Une offre peut être servie en partie ou pas du tout." },
  apes: { short: "APE", long: "Appel public à l'épargne", text: "Emprunt obligataire d'une entreprise ou d'un État ouvert au public, visé par la COSUMAF, puis coté à la BVMAC." },
  opcvm: { short: "OPCVM", long: "Organisme de placement collectif en valeurs mobilières", text: "Un fonds commun de placement (FCP) : un portefeuille géré par une société de gestion agréée, dont on achète des parts. Monétaire, obligataire, diversifié ou actions selon ce qu'il détient." },
  in_fine: { short: "In fine", text: "Le capital revient en une seule fois, à l'échéance. Entre-temps, vous ne percevez que les coupons annuels." },
  prix_limite: { short: "Adjudication et prix limite", text: "Le Trésor retient les offres les mieux-disantes. Le prix publié par Purpose Capital est le prix auquel vos ordres sont présentés ; vous pouvez être servi en partie, ou pas du tout." },
  lignes: { short: "Nouvelle ligne, abondement, rachat", text: "Une ligne nouvelle démarre sans coupon couru. Un abondement rouvre une ligne existante, avec sa durée restante. Un rachat est l'inverse : le Trésor reprend ses titres, en général au pair." },
  precompte: { short: "BTA à intérêts précomptés", text: "Vous payez moins que le nominal et recevez le nominal à l'échéance. Le taux précompté est calculé sur 360 jours ; le rendement réel est un peu plus élevé." },
  svt: { short: "SVT", long: "Spécialiste en Valeurs du Trésor", text: "La banque agréée qui dépose les offres à l'adjudication. Purpose Capital regroupe vos ordres et les transmet à un SVT avant l'heure limite." },
  decote_duree: { short: "Décote et durée", text: "Une même décote rapporte d'autant plus par an que la ligne est courte : une réouverture à 1 an 5 mois peut offrir un rendement supérieur à une ligne à 3 ans." },
  pair: { short: "Au pair", text: "Un titre acheté à 100 % de son nominal. Il rapporte alors son taux nominal : le rendement actuariel n'a de sens qu'avec une décote (moins de 100 %) ou une prime (plus de 100 %)." },
  pnb: { short: "Produit net bancaire", text: "Le « chiffre d'affaires » d'une banque : marge d'intérêt plus commissions, nettes des charges d'intérêt." },
  primes: { short: "Primes acquises", text: "Le « chiffre d'affaires » d'un assureur ou réassureur : les primes correspondant à la couverture de l'exercice." },
} as const satisfies Record<string, Term>;

export type TermKey = keyof typeof GLOSSARY;
