import type { BudgetEtat, NoteBudget } from "@/lib/domain/types";
import { releveDuBudget } from "@/lib/market/note-budget";

/**
 * LES BUDGETS DES SIX, TELS QUE RELEVÉS LE 25 OCTOBRE 2026.
 *
 * CE FICHIER EST UN RELEVÉ, PAS UNE FIXTURE, et c'est ce qui en fait la
 * valeur : chaque montant vient d'un document daté, et ce qui n'a pas été
 * relevé est NOMMÉ plutôt que laissé vide. Quatre États sur six sont
 * incomplets, et la page le dit — c'est l'état réel du dossier, et le cacher
 * derrière des zéros donnerait l'illusion d'une couverture qui n'existe pas.
 *
 * LES MONTANTS SONT EN MILLIONS DE FCFA, comme partout dans la maison. La
 * presse et les lois parlent en milliards : 8 816,4 milliards s'écrivent donc
 * 8_816_400 ici. Le formateur de la page remet des milliards à l'écran.
 *
 * LE SOLDE N'EST JAMAIS RECALCULÉ. Pour le Cameroun, les deux agrégats repris
 * (5 687,0 de recettes internes, 6 210,5 de dépenses hors principal) donnent
 * −523,5, quand le document annonce −631,0 : les périmètres diffèrent, et
 * trancher demanderait les annexes officielles. On garde donc le chiffre ÉCRIT
 * et on laisse la question ouverte dans « à relever ». Un écart assumé vaut
 * mieux qu'une soustraction qui a l'air juste.
 */

const CAMEROUN: BudgetEtat = {
  pays: "Cameroun",
  exercice: 2026,
  millesime: "revision_annoncee",
  loi: "Loi n° 2025/012 du 17 décembre 2025 portant loi de finances pour l'exercice 2026",
  promulgueeLe: "2025-12-17",
  hypotheses: [
    {
      cle: "baril",
      libelle: "Prix du baril retenu",
      valeur: "62,38 $",
      /* L'écart dure depuis deux trimestres : c'est lui qui a déclenché
         l'annonce de révision, et il est la donnée la plus parlante de la
         fiche. */
      constate: "≈ 100 $ au printemps 2026",
    },
  ],
  budgetTotal: 8_816_400,
  recettes: [
    { cle: "fiscales", libelle: "Recettes fiscales et douanières", montant: 4_689_500 },
    { cle: "petrolieres", libelle: "Recettes pétrolières et gazières", montant: 523_700 },
    { cle: "non_fiscales", libelle: "Recettes non fiscales", montant: 400_000 },
    { cle: "dons", libelle: "Dons", montant: 73_800 },
  ],
  depenses: [
    { cle: "personnel", libelle: "Dépenses de personnel", montant: 1_625_400 },
    { cle: "biens", libelle: "Biens et services", montant: 1_206_000 },
    { cle: "transferts", libelle: "Transferts et subventions", montant: 820_300 },
    { cle: "interets", libelle: "Intérêts de la dette", montant: 532_500 },
    { cle: "investissement", libelle: "Investissement", montant: 2_026_300 },
  ],
  soldeDeclare: -631_000,
  besoinDeFinancement: 3_104_200,
  financement: [
    { cle: "exterieurs", libelle: "Emprunts extérieurs", montant: 1_000_000, suppose: "marchés internationaux et bilatéraux ouverts" },
    { cle: "projets", libelle: "Tirages sur prêts projets", montant: 826_700, suppose: "des projets qui avancent au rythme prévu" },
    { cle: "bancaires", libelle: "Emprunts bancaires", montant: 589_700, suppose: "des banques locales qui ont la place" },
    { cle: "titres", libelle: "Titres publics · marché monétaire", montant: 400_000, titres: true, suppose: "des séances servies au prix attendu" },
    { cle: "exceptionnels", libelle: "Financements exceptionnels", montant: 167_800, suppose: "non récurrents, par nature incertains" },
    { cle: "appuis", libelle: "Appuis budgétaires", montant: 120_000, suppose: "un décaissement de la Banque mondiale — le FMI est à zéro au tableau" },
  ],
  source: {
    texte: "Loi n° 2025/012 du 17 décembre 2025 · exposé des motifs (DGB) · reprise de presse spécialisée",
    releveLe: "2026-10-25",
  },
  /* LES PIÈCES, ET LEURS ADRESSES — OUVERTES, PAS RECOPIÉES.
     Chacune a été demandée depuis l'atelier le 24 octobre 2026 et a répondu.
     L'exposé des motifs a été LU : c'est lui qui a corrigé deux chiffres de
     ce relevé et tranché un point laissé ouvert. Le programme annuel de la
     BEAC, lui, est un SCAN — « Creator: HP Scan », aucune couche de texte —
     donc son adresse est consignée et son contenu ne l'est pas. */
  references: [
    { titre: "Loi n° 2025/012 portant loi de finances pour l'exercice 2026", editeur: "République du Cameroun", date: "2025-12-17" },
    {
      titre: "Exposé des motifs du projet de loi de finances 2026",
      editeur: "Direction générale du Budget (DGB)",
      date: "2025-11",
      url: "https://www.dgb.cm/wp-content/uploads/2025/12/Expose-des-Motifs_LF-2026_fr.pdf",
      verifieLe: "2026-10-24",
    },
    {
      titre: "Programme annuel des émissions de titres publics 2026 — Cameroun",
      editeur: "BEAC",
      date: "2026",
      url: "https://www.beac.int/wp-content/uploads/2019/06/PROGRAMME-ANNUEL-DES-EMISSIONS-2026-CAMEROUN.pdf",
      verifieLe: "2026-10-24",
    },
    {
      titre: "Bulletins du marché des titres publics",
      editeur: "BEAC",
      url: "https://www.beac.int/m-des-titres-publics/bulletins-marche-titres-publics/",
      verifieLe: "2026-10-24",
    },
    {
      titre: "Calendrier trimestriel d'émission de titres publics des États de la CEMAC",
      editeur: "BEAC",
      url: "https://www.beac.int/m-des-titres-publics/calendrier-trimestriel-demission-titres-publics-etats-de-cemac/",
      verifieLe: "2026-10-24",
    },
    {
      titre: "Avis d'émission",
      editeur: "Direction générale du Trésor (DGTCFM)",
      url: "https://dgtcfm.cm/avis-demission/",
      verifieLe: "2026-10-24",
    },
  ],
  aRelever: [
    /* TRANCHÉ LE 24 OCTOBRE par l'exposé des motifs, qui décompose le solde :
       le budget général fait −607,5 et les comptes d'affectation spéciale
       −23,5, soit −631,0. La soustraction de nos deux agrégats, −523,5, ne
       pouvait pas y tomber : elle ignore les CAS et le périmètre des dons. */
    "Deux plans de financement coexistent DANS LE MÊME DOCUMENT : le texte énumère six portes sommant à 3 104,2, le tableau des opérations financières en donne d'autres sommant à 2 996,8 — emprunts extérieurs 650,0 contre 1 000, bancaire 505,7 contre 589,7, exceptionnels 144,4 contre 167,8. Seule la ligne des titres publics, 400,0, est la même des deux côtés. Lequel fait foi reste à trancher.",
    "La base 2025 est donnée à 7 735,9 par l'exposé des motifs ; 7 801,5 circule ailleurs. Le chiffre de la loi promulguée reste à relever.",
    "Les chiffres relevés sont ceux du PROJET de loi (colonne « PLFI 2026 » du tableau des opérations financières). Ce que la loi promulguée du 17 décembre a retenu n'est pas relevé.",
    "Le programme annuel d'émissions 2026 publié par la BEAC est un scan sans couche de texte : son montant n'a pas été relevé, faute d'outil de reconnaissance de caractères.",
  ],
};

const GABON: BudgetEtat = {
  pays: "Gabon",
  exercice: 2026,
  millesime: "revise",
  loi: "Loi de finances rectificative pour 2026",
  hypotheses: [],
  budgetTotal: 5_495_200,
  recettes: [],
  depenses: [],
  besoinDeFinancement: undefined,
  financement: [],
  source: { texte: "Reprise de presse spécialisée · budget initial annoncé à 7 233,3 milliards", releveLe: "2026-10-25" },
  aRelever: [
    "Budget initial 7 233,3 ramené à 5 495,2 ; la coupe votée est donnée à −862,9, ce qui ne se déduit pas des deux chiffres — les périmètres diffèrent.",
    "Recettes et dépenses poste par poste : non relevées.",
    "Programme d'émissions de titres publics : non relevé.",
    "Déficit projeté par le FMI à 10 % du PIB ; les agences retiennent de 6,7 à 12,2 % — à sourcer avant affichage.",
  ],
};

const CONGO: BudgetEtat = {
  pays: "Congo",
  exercice: 2026,
  millesime: "revise",
  loi: "Loi de finances rectificative pour 2026",
  hypotheses: [],
  recettes: [],
  depenses: [],
  financement: [{ cle: "titres", libelle: "Programme d'émissions de titres publics", montant: 690_000, titres: true }],
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  aRelever: [
    "Budget relevé de 9 % par collectif sur de meilleures perspectives pétrolières ; le montant n'a pas été relevé.",
    "Recettes, dépenses et plan de financement : non relevés.",
  ],
};

const TCHAD: BudgetEtat = {
  pays: "Tchad",
  exercice: 2026,
  millesime: "vote",
  loi: "Loi de finances pour 2026",
  hypotheses: [],
  recettes: [],
  depenses: [],
  financement: [{ cle: "titres", libelle: "Programme d'émissions de titres publics", montant: 520_000, titres: true }],
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  aRelever: [
    "Le programme d'émissions est connu, le budget non : la page doit savoir le dire.",
    "Loi de finances, date de promulgation, recettes, dépenses, solde : non relevés.",
  ],
};

const RCA: BudgetEtat = {
  pays: "RCA",
  exercice: 2026,
  millesime: "revision_annoncee",
  loi: "Loi de finances pour 2026",
  hypotheses: [],
  recettes: [{ cle: "globales", libelle: "Recettes globales", montant: 368_400 }],
  depenses: [{ cle: "globales", libelle: "Dépenses globales", montant: 396_300 }],
  soldeDeclare: -27_900,
  financement: [],
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  aRelever: [
    "Le déficit vaut 1,2 % du PIB selon l'État et 3,5 à 4 % selon la Banque africaine de développement : la page doit nommer la mesure ET sa source.",
    "Collectif budgétaire en préparation après des prévisions de trésorerie dépassées à fin juin 2026.",
    "Détail des postes et plan de financement : non relevés.",
  ],
};

const GUINEE: BudgetEtat = {
  pays: "Guinée éq.",
  exercice: 2026,
  millesime: "vote",
  loi: "Loi de finances pour 2026",
  hypotheses: [],
  recettes: [],
  depenses: [],
  financement: [],
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  aRelever: [
    "Excédent de 53 milliards annoncé au premier trimestre 2026 ; déficit 2026 estimé entre 2,1 et 3,3 % du PIB selon les sources.",
    "Loi de finances, montants et plan de financement : non relevés.",
  ],
};

export const SEED_BUDGETS: BudgetEtat[] = [CAMEROUN, GABON, CONGO, TCHAD, RCA, GUINEE];

/**
 * UNE NOTE SEMÉE, ET UNE SEULE.
 *
 * Elle existe pour que la page ne se juge pas sur un écran vide : une fiche
 * sans note ne dit pas si le fil fonctionne. Les autres États n'en ont pas, et
 * c'est juste — on n'écrit pas une note pour meubler.
 *
 * SON « malLu » EST VIDE DE CONTENU MAIS PAS DE TEXTE : c'est la première de
 * la série, et elle doit quand même l'écrire.
 */
export const SEED_NOTES_BUDGET: NoteBudget[] = [
  {
    id: "nb-cmr-2026-1",
    pays: "Cameroun",
    exercice: 2026,
    numero: 1,
    titre: "Le baril a doublé, et le budget ne l'a pas encore écrit",
    enUnePhrase:
      "Le budget 2026 a été bâti sur un baril à 62 dollars ; il s'en échange près de 100 depuis le printemps, et l'État a annoncé qu'il réviserait ses comptes. Tant que la révision n'est pas votée, les chiffres officiels de l'année restent ceux de décembre dernier.",
    motif: "Annonce d'une révision du budget",
    demandeePar: "Desk Purpose Capital",
    redigeePar: "Desk Purpose Capital",
    closeLe: "2026-10-25",
    corps: [
      {
        genre: "constat",
        texte:
          "Un budget se vote sur des hypothèses, et celle qui compte ici est le prix du pétrole : 523,7 milliards de recettes pétrolières et gazières sur 5 687 de recettes internes, environ un dixième.",
      },
      {
        genre: "constat",
        texte:
          "Un baril au-dessus de l'hypothèse ne réduit pas mécaniquement les emprunts. Le besoin de financement de l'année est de 3 104,2 milliards, dont 631 seulement viennent du déficit ; le reste est le remboursement de dettes passées, qui tombe aux dates prévues quel que soit le prix du baril.",
      },
      {
        genre: "lecture",
        texte:
          "Si la révision confirme des recettes plus élevées et que les appuis extérieurs arrivent, alors la ligne des titres publics — 400 milliards, 13 % du besoin — est la première à pouvoir se réduire : c'est elle qui ajuste. Si un appui glisse, c'est la même ligne qui enfle, sans qu'aucune loi soit rouverte. Nous ne savons pas laquelle des deux : les deux branches sont également ouvertes à ce jour.",
      },
      {
        genre: "constat",
        texte: "Chez le voisin, le Gabon a ramené son budget 2026 de 7 233 à 5 495 milliards par collectif, en cours d'année.",
      },
      {
        genre: "lecture",
        texte:
          "Si la révision camerounaise prend la même ampleur, alors les postes d'investissement sont les premiers exposés — c'est eux qui ont payé la coupe gabonaise, le service de la dette étant resté entier. Nous ne tenons pas le Gabon pour un précédent : deux États, deux situations pétrolières opposées. Il dit seulement qu'une révision n'est pas une formalité comptable.",
      },
    ],
    surveiller: [
      "Le dépôt du collectif — session de novembre. Tant qu'il n'est pas voté, rien n'a changé officiellement.",
      "Le calendrier d'adjudications du trimestre, publié par la BEAC : il dira si les 400 milliards tiennent.",
      "Les revues du programme avec le FMI : un appui qui glisse déplace la ligne des titres.",
      "Le budget 2027, déposé en novembre : la première occasion de voir l'hypothèse de baril corrigée.",
    ],
    malLu: "Première note de la série : rien à corriger. Cette ligne n'est pas une formalité — à partir de la suivante, elle dira ce que celle-ci aura mal lu.",
    /* LE RELEVÉ EST PRIS SUR LA FICHE, ICI COMME AU FORMULAIRE. Recopié à la
       main, il aurait divergé de ce que le desk écrira — « 62,38 $ » contre
       « 62.38 USD » — et la première note écrite depuis l'écran aurait affiché
       cinq lignes « changées » qui n'avaient pas bougé. */
    releve: releveDuBudget(CAMEROUN),
    /* LES PIÈCES DE LA FICHE, PLUS CELLE QUI EST PROPRE À LA NOTE. Figées avec
       elle : relue dans deux ans, elle doit montrer ce qu'elle avait sous les
       yeux, et non ce que la fiche portera alors. */
    references: [
      ...(CAMEROUN.references ?? []),
      { titre: "Annonce d'une révision du budget par le ministre des Finances", editeur: "reprise de presse spécialisée", date: "2026-10" },
    ],
  },
];
