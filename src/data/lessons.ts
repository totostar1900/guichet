/**
 * Info — eight short lessons, one idea each, illustrated with a real line
 * of the Guichet and closed by one question. These are the code defaults; the
 * desk edits them in the référentiel (kind « lesson ») without touching code.
 */
export type LessonWidget = "bond_price" | "bta_rate" | "tenor" | "equity" | "fund" | "auction" | "risks" | "read_ota";

export interface Lesson {
  key: string;
  order: number;
  title: string;
  minutes: number;
  intro: string; // one sentence under the title
  body: string[]; // short paragraphs
  widget: LessonWidget; // the interactive block, fed with a live line
  quiz: { q: string; options: string[]; answer: number; why: string };
  /** Glossary keys whose « i » bubble links to this lesson. */
  terms: string[];
}

export const LESSONS: Lesson[] = [
  {
    key: "lire-une-ota",
    order: 1,
    title: "Lire une OTA en trente secondes",
    minutes: 2,
    intro: "Cinq chiffres suffisent, dans cet ordre : coupon, nominal, échéance, prix, rendement.",
    body: [
      "Une Obligation du Trésor assimilable (OTA) est un prêt que vous faites à un État de la CEMAC. L'État vous verse chaque année un coupon (un pourcentage du nominal) et vous rend le nominal à l'échéance.",
      "Le nominal est la valeur faciale d'un titre — 10 000 FCFA pour une OTA. Le coupon se calcule dessus : 6 % de 10 000 = 600 FCFA par titre et par an.",
      "Le prix est ce que vous payez, en pourcentage du nominal. À 96 %, un titre de 10 000 coûte 9 600 (plus le coupon couru s'il y en a). Le rendement actuariel dit ce que cela rapporte réellement par an jusqu'à l'échéance, en tenant compte du prix.",
      "Sur une fiche du Guichet, le chiffre en or est ce rendement, brut, si vous êtes servi au prix affiché et gardez le titre jusqu'au bout.",
    ],
    widget: "read_ota",
    quiz: { q: "Sur une OTA à 6 % achetée 96 %, le coupon annuel par titre de 10 000 FCFA est…", options: ["576 FCFA (6 % de 9 600)", "600 FCFA (6 % de 10 000)", "960 FCFA"], answer: 1, why: "Le coupon se calcule toujours sur le nominal, jamais sur le prix payé." },
    terms: ["ota", "nominal", "coupon", "rendement_actuariel"],
  },
  {
    key: "coupon-et-rendement",
    order: 2,
    title: "Coupon ≠ rendement : le prix change tout",
    minutes: 2,
    intro: "Le coupon est fixé à l'émission ; le rendement dépend du prix que vous payez.",
    body: [
      "Sous le pair (moins de 100 %), vous touchez le même coupon pour moins cher et récupérez 100 à l'échéance : le rendement dépasse le coupon.",
      "Au-dessus du pair, c'est l'inverse : vous payez une prime que vous ne reverrez pas, le rendement passe sous le coupon.",
      "Au pair exactement, rendement et coupon coïncident. C'est pourquoi le Guichet affiche le taux nominal quand une ligne est au pair, et le rendement actuariel dès qu'il y a décote ou prime.",
      "Faites glisser le prix ci-dessous : le rendement est recalculé avec le moteur du Guichet, sur une vraie ligne.",
    ],
    widget: "bond_price",
    quiz: { q: "À 100 % (au pair), le rendement actuariel est…", options: ["plus élevé que le coupon", "égal au coupon nominal", "plus faible que le coupon"], answer: 1, why: "Vous payez 100, récupérez 100 : il ne reste que les coupons, donc le taux nominal." },
    terms: ["pair", "rendement_cours", "coupon_couru"],
  },
  {
    key: "adjudication",
    order: 3,
    title: "Adjudication : demandé, servi, partiel",
    minutes: 2,
    intro: "Le Trésor vend aux enchères ; votre intention n'est pas encore une allocation.",
    body: [
      "Le jour de l'adjudication, les banques agréées (SVT) déposent des offres avec un prix et un montant. Le Trésor retient les mieux-disantes jusqu'au volume qu'il cherche.",
      "Le prix Purpose affiché sur une fiche est celui que le desk propose de déposer pour vous. Vous pouvez être servi à ce prix, en partie, ou pas du tout si le Trésor n'a pas retenu ce niveau.",
      "D'où la formule : « rendement si servi au prix publié ». Le résultat vous est confirmé le jour même, et les fonds non utilisés restitués.",
    ],
    widget: "auction",
    quiz: { q: "Vous demandez 10 M FCFA à 96 % et le Trésor sert 60 % des offres à ce prix. Vous obtenez…", options: ["10 M à 96 %", "6 M à 96 %, 4 M restitués", "10 M à un prix plus bas"], answer: 1, why: "Une allocation partielle : le montant servi est réduit, le prix reste celui de votre offre." },
    terms: ["adjudication", "prix_limite", "svt"],
  },
  {
    key: "bons-precomptes",
    order: 4,
    title: "Bon du Trésor : intérêts précomptés",
    minutes: 2,
    intro: "Pas de coupon : vous payez moins que le nominal et recevez le nominal à l'échéance.",
    body: [
      "Un BTA dure moins de deux ans. Son intérêt est « précompté » : déduit du prix d'achat au départ. À 5,5 % sur 52 semaines, un bon de 1 000 000 se paie environ 944 400 et rembourse 1 000 000.",
      "Le taux précompté n'est pas le rendement : comme vous avancez moins que le nominal, le rendement réel est un peu plus élevé que le taux affiché.",
      "Ici aussi, le taux servi dépend de l'adjudication ; le Guichet affiche un taux indicatif fixé par le desk.",
    ],
    widget: "bta_rate",
    quiz: { q: "Sur un BTA à intérêts précomptés, vous recevez les intérêts…", options: ["chaque trimestre", "à l'échéance, en recevant le nominal", "à l'achat, déduits du prix payé"], answer: 2, why: "Précompté = compté d'avance : la différence entre le prix payé et le nominal est votre intérêt." },
    terms: ["bta", "precompte"],
  },
  {
    key: "duree-et-risque",
    order: 5,
    title: "Durée et risque : 2029 ne paie pas comme 2031",
    minutes: 2,
    intro: "Plus la ligne est longue, plus le rendement demandé est élevé — et plus le prix bouge.",
    body: [
      "Prêter cinq ans immobilise votre argent plus longtemps qu'en prêter deux : les émetteurs paient cette patience par un coupon plus élevé. C'est la courbe des taux.",
      "Une même décote rapporte d'autant plus par an que la ligne est courte : 4 points récupérés en 18 mois valent plus que 4 points récupérés en 5 ans.",
      "Enfin, si vous devez revendre avant l'échéance, une ligne longue réagit davantage aux mouvements de taux : son prix peut baisser plus.",
    ],
    widget: "tenor",
    quiz: { q: "Deux OTA à 6 % achetées 96 % : l'une échoit dans 18 mois, l'autre dans 5 ans. Laquelle rapporte le plus par an ?", options: ["la plus longue", "la plus courte", "les deux pareil"], answer: 1, why: "La décote de 4 points est récupérée plus vite sur la ligne courte : elle pèse plus par an." },
    terms: ["decote_duree", "in_fine", "lignes"],
  },
  {
    key: "action-cotee",
    order: 6,
    title: "Action cotée : cours, dividende, PER",
    minutes: 3,
    intro: "Trois nombres suffisent pour situer une action de la BVMAC.",
    body: [
      "Le cours est le dernier prix échangé en séance. Le dividende brut est ce que la société verse par action chaque année, s'il est maintenu : divisé par le cours, il donne le rendement du dividende.",
      "Le PER (cours divisé par le bénéfice par action) dit combien d'années de bénéfice vous payez. Entre 5 et 12 est courant sur les marchés africains ; au-dessus, le marché paie une croissance attendue ou la rareté du titre.",
      "Une action n'a pas d'échéance ni de capital garanti : le cours monte et descend, le dividende dépend des résultats et de l'assemblée.",
    ],
    widget: "equity",
    quiz: { q: "Une action cote 45 000 FCFA et verse 2 500 FCFA de dividende brut. Son rendement du dividende est…", options: ["5,6 %", "2,5 %", "18 %"], answer: 0, why: "2 500 / 45 000 = 5,6 % — avant retenue à la source." },
    terms: ["per", "rendement_dividende", "dividende", "cours", "bnpa"],
  },
  {
    key: "fonds-vl",
    order: 7,
    title: "Fonds : la VL et les frais",
    minutes: 2,
    intro: "Vous n'achetez pas un titre mais une part d'un panier, à un prix connu après coup.",
    body: [
      "La valeur liquidative (VL) est le prix d'une part : actifs du fonds moins ses dettes, divisé par le nombre de parts. Elle est calculée à intervalle régulier par la société de gestion.",
      "Une souscription s'exécute à la prochaine VL calculée après votre ordre. Vous connaissez votre montant, pas encore votre nombre de parts.",
      "Les frais d'entrée, de sortie et de gestion (prélevés dans la VL) sont dans le prospectus du fonds ; les performances passées ne préjugent pas des performances futures.",
    ],
    widget: "fund",
    quiz: { q: "Vous souscrivez 1 000 000 FCFA un mardi ; la VL est calculée le jeudi. Vous êtes servi…", options: ["à la VL de mardi", "à la VL de jeudi", "au cours de bourse"], answer: 1, why: "Toujours la prochaine VL calculée après réception de l'ordre." },
    terms: ["vl", "opcvm"],
  },
  {
    key: "les-quatre-risques",
    order: 8,
    title: "Les quatre risques, et ce qu'on peut faire",
    minutes: 3,
    intro: "Crédit, liquidité, prix, allocation — chaque fiche les rappelle dans « À garder en tête ».",
    body: [
      "Crédit : l'émetteur peut ne pas payer. Pour un État de la CEMAC, le risque est celui de sa capacité à honorer sa dette ; pour une entreprise, celui de sa solidité. On ne prête pas tout à un seul émetteur.",
      "Liquidité : revendre avant l'échéance peut prendre plusieurs séances et se faire à un prix inférieur. On n'engage que ce qu'on peut immobiliser jusqu'au terme.",
      "Prix : la valeur des titres varie avec les taux et le marché ; gardé jusqu'au terme, un titre de dette délivre le rendement calculé, cédé avant, pas forcément.",
      "Allocation : une intention n'est ni un ordre ni une garantie d'être servi. Le desk confirme, transmet, puis vous dit ce qui a été obtenu.",
    ],
    widget: "risks",
    quiz: { q: "Le moyen le plus simple de réduire le risque de crédit est…", options: ["choisir la ligne au rendement le plus haut", "répartir entre plusieurs émetteurs et échéances", "revendre vite"], answer: 1, why: "Diversifier : plusieurs émetteurs, plusieurs échéances, un montant qu'on peut garder jusqu'au terme." },
    terms: ["liquidite", "seuils", "ticket"],
  },
];
