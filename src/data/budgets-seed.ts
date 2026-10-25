import type { BudgetEtat, NoteBudget, Reference } from "@/lib/domain/types";

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
 * (5 686,9 de recettes propres, 6 210,5 de dépenses hors principal) donnent
 * −523,6, quand le document annonce −631,0 : le solde porte aussi les comptes
 * d'affectation spéciale (−23,5), et
 * trancher demanderait les annexes officielles. On garde donc le chiffre ÉCRIT
 * et on laisse la question ouverte dans « à relever ». Un écart assumé vaut
 * mieux qu'une soustraction qui a l'air juste.
 */

/**
 * LES DEUX PIÈCES QUE LA BEAC PUBLIE POUR CHAQUE ÉTAT.
 *
 * Elles existent pour les six, aux mêmes adresses à un nom près, et toutes
 * dix ont répondu le 25 octobre 2026. Elles ne sont pas là pour nous : ce sont
 * des SCANS — Xerox, Genius Scan, aucune couche de texte —, donc aucun chiffre
 * n'en est tiré ici. Elles sont là pour que le desk les ouvre, les lise de ses
 * yeux, et puisse écrire une note sur un État sans avoir à chercher d'abord où
 * se trouve la pièce. C'était le frein nommé par le formulaire lui-même :
 * « cette fiche ne nomme aucune pièce ».
 */
/**
 * LES PIÈCES DE LA ZONE, qui n'appartiennent à aucun État.
 *
 * Le marché des titres publics est tenu par la BEAC pour les six : ses
 * bulletins, ses statistiques et son cadre réglementaire valent pour tous, et
 * les ranger sous un seul pays les aurait rendus introuvables depuis les cinq
 * autres. Elles ont toutes été ouvertes le 25 octobre 2026.
 */
const MTP = "https://www.beac.int/m-des-titres-publics";
export const REFERENCES_ZONE: Reference[] = [
  { titre: "Bulletins du marché des titres publics", editeur: "BEAC", url: `${MTP}/bulletins-marche-titres-publics/`, verifieLe: "2026-10-25" },
  { titre: "Annonces et communiqués d'adjudication", editeur: "BEAC", url: `${MTP}/annonces-et-communiques/`, verifieLe: "2026-10-25" },
  { titre: "Statistiques mensuelles du marché des valeurs du Trésor", editeur: "BEAC", url: `${MTP}/statistiques-mensuelles-marche-valeurs-tresor/`, verifieLe: "2026-10-25" },
  { titre: "Présentation générale du marché des titres publics", editeur: "BEAC", url: `${MTP}/presentation-generale/`, verifieLe: "2026-10-25" },
  { titre: "Cadre réglementaire du marché des titres publics", editeur: "BEAC", url: `${MTP}/cadre-reglementaire/`, verifieLe: "2026-10-25" },
  { titre: "Statistiques des titres publics", editeur: "BEAC", url: "https://www.beac.int/economie-stats/statistiques-titres-publics/", verifieLe: "2026-10-25" },
];

const BEAC = "https://www.beac.int/wp-content/uploads/2019/06";
const piecesBeac = (nom: string, pays: string): Reference[] => [
  {
    titre: `Programme annuel des émissions de titres publics 2026 — ${pays}`,
    editeur: "BEAC",
    date: "2026",
    url: `${BEAC}/PROGRAMME-ANNUEL-DES-EMISSIONS-2026-${nom}.pdf`,
    verifieLe: "2026-10-25",
  },
  {
    titre: `Calendrier des émissions du premier trimestre 2026 — ${pays}`,
    editeur: "BEAC",
    date: "2026",
    url: `${BEAC}/CALENDRIER-DES-EMISSIONS-DU-PREMIER-TRIMESTRE-2026-${nom}.pdf`,
    verifieLe: "2026-10-25",
  },
];

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
  /* LES POSTES DE LA LOI PROMULGUÉE, et non plus ceux du projet. Le
     « lancement du budget 2026 » de la DGB, janvier 2026, publie les deux
     colonnes du budget général : impôts et douanes y sont SÉPARÉS, comme ici.
     Les emprunts figurent dans ses recettes — 2 996,8 — et n'y sont pas repris :
     une ressource d'emprunt rangée en recette rendrait le solde muet. */
  recettes: [
    { cle: "impots", libelle: "Recettes des impôts et taxes", montant: 3_446_200 },
    { cle: "douanes", libelle: "Recettes douanières", montant: 1_243_200 },
    { cle: "petrolieres", libelle: "Recettes pétrolières et gazières", montant: 523_700 },
    { cle: "non_fiscales", libelle: "Recettes non fiscales", montant: 400_000 },
    { cle: "dons", libelle: "Dons", montant: 73_800 },
  ],
  depenses: [
    { cle: "investissement", libelle: "Dépenses d'investissement", montant: 2_031_200 },
    { cle: "personnel", libelle: "Dépenses de personnel", montant: 1_626_200 },
    { cle: "biens", libelle: "Dépenses de biens et services", montant: 1_192_700 },
    { cle: "transferts", libelle: "Transferts et subventions", montant: 827_900 },
    { cle: "interets", libelle: "Intérêts de la dette", montant: 532_500 },
  ],
  soldeDeclare: -631_000,
  besoinDeFinancement: 3_104_200,
  /* PUBLIÉ par la loi : « dépenses de la dette 2 473,4 ». La déduction
     besoin − déficit donnait 2 473,2 ; on montre le chiffre lu. */
  amortissementPublie: 2_473_400,
  financement: [
    { cle: "exterieurs", libelle: "Emprunts extérieurs", montant: 1_000_000, suppose: "marchés internationaux et bilatéraux ouverts" },
    { cle: "projets", libelle: "Tirages sur prêts projets", montant: 826_700, suppose: "des projets qui avancent au rythme prévu" },
    { cle: "bancaires", libelle: "Emprunts bancaires", montant: 589_700, suppose: "des banques locales qui ont la place" },
    { cle: "titres", libelle: "Titres publics · marché monétaire", montant: 400_000, titres: true, suppose: "des séances servies au prix attendu" },
    { cle: "exceptionnels", libelle: "Financements exceptionnels", montant: 167_800, suppose: "non récurrents, par nature incertains" },
    { cle: "appuis", libelle: "Appuis budgétaires", montant: 120_000, suppose: "un décaissement de la Banque mondiale — le FMI est à zéro au tableau" },
  ],
  programmeBeac: { bta: 765_000, ota: 400_000, total: 1_165_000 },
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
      titre: "Présentation du budget 2026 — lancement, après promulgation",
      editeur: "Direction générale du Budget (DGB)",
      date: "2026-01",
      url: "https://dgtcfm.cm/wp-content/uploads/2026/01/expose-dgb-lancement-2026-version-finale1201202520h27-1.pdf",
      verifieLe: "2026-10-24",
    },
    ...piecesBeac("CAMEROUN", "Cameroun"),
    {
      titre: "Avis d'émission",
      editeur: "Direction générale du Trésor (DGTCFM)",
      url: "https://dgtcfm.cm/avis-demission/",
      verifieLe: "2026-10-24",
    },
  ],
  aRelever: [
    /* TROIS POINTS SONT TOMBÉS LE 24 OCTOBRE, sur deux pièces de la DGB.
       Le périmètre du solde : budget général −607,5 et comptes d'affectation
       spéciale −23,5 font −631,0. La base 2025 : le budget général monte de
       1 014,9 et les CAS de 65,6, soit 1 080,5 sur 8 816,4, donc 7 735,9 — et
       non 7 801,5. Et les postes sont désormais ceux de la LOI, non du projet :
       la présentation de lancement de janvier 2026 publie les deux colonnes. */
    "Le budget promulgué inscrit 2 996,8 d'emprunts en recettes, quand l'exposé des motifs chiffre le besoin de financement à 3 104,2 et détaille six portes qui y sombrent exactement. L'écart, 107,4, n'est pas expliqué par les documents relevés : les six portes restent celles du projet, faute d'un détail publié avec la loi.",
    "Le total du budget, 8 816,4, couvre le budget général (8 683,9) ET les comptes d'affectation spéciale (132,5). Les recettes et dépenses relevées ici sont celles du budget général seul : les CAS ont leurs propres lignes, non relevées.",
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
  programmeBeac: { bta: 566_000, ota: 480_000, total: 1_046_000 },
  source: { texte: "Reprise de presse spécialisée · budget initial annoncé à 7 233,3 milliards", releveLe: "2026-10-25" },
  references: piecesBeac("GABON", "Gabon"),
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
  financement: [],
  programmeBeac: { bta: 285_000, ota: 405_000, total: 690_000 },
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  references: piecesBeac("CONGO", "Congo"),
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
  financement: [],
  programmeBeac: { bta: 120_000, ota: 400_000, total: 520_000 },
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  references: piecesBeac("TCHAD", "Tchad"),
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
  programmeBeac: { bta: 0, ota: 66_500, total: 66_500 },
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  references: piecesBeac("RCA", "RCA"),
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
  programmeBeac: { bta: 319_000, ota: 100_000, total: 419_000 },
  source: { texte: "Reprise de presse spécialisée", releveLe: "2026-10-25" },
  references: piecesBeac("GUINEE-EQUATORIALE", "Guinée éq."),
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
    /* LE RELEVÉ D'UNE NOTE EST FIGÉ, et c'est tout son intérêt.
       Il a d'abord été écrit « releveDuBudget(CAMEROUN) », pour que ses clefs
       ne divergent pas de celles de la fiche. Mal : il se RECALCULAIT à chaque
       chargement, donc la note suivait en silence tout changement du budget —
       une note réécrite sous elle-même, et un carnet qui ne verrait jamais
       rien bouger. Les valeurs sont donc celles du 25 octobre, en dur ; les
       CLEFS, elles, restent gardées contre celles de la fiche par un essai. */
    releve: [
      { cle: "millesime", libelle: "Millésime en vigueur", valeur: "LFI 2026, révision annoncée" },
      { cle: "baril_loi", libelle: "Prix du baril retenu", valeur: "62,38 $" },
      { cle: "baril_constate", libelle: "Prix du baril retenu \u00b7 constaté", valeur: "\u2248 100 $ au printemps 2026" },
      { cle: "solde", libelle: "Solde déclaré", valeur: "-631,0 Md" },
      { cle: "besoin", libelle: "Besoin de financement", valeur: "3\u202f104,2 Md" },
      { cle: "programme_titres", libelle: "Programme de titres publics", valeur: "400,0 Md" },
    ],
    /* LES PIÈCES DE LA FICHE, PLUS CELLE QUI EST PROPRE À LA NOTE. Figées avec
       elle : relue dans deux ans, elle doit montrer ce qu'elle avait sous les
       yeux, et non ce que la fiche portera alors. */
    references: [
      ...(CAMEROUN.references ?? []),
      { titre: "Annonce d'une révision du budget par le ministre des Finances", editeur: "reprise de presse spécialisée", date: "2026-10" },
    ],
  },
  {
    /* ÉCRITE PAR CLAUDE, À LA DEMANDE DE GEORGES, ET SIGNÉE DE SON NOM.
       Il l'a demandé explicitement après qu'on lui a dit qu'une note engage
       une lecture et que son auteur en répond. La main qui a tenu le stylo
       est donc écrite ici, là où un relecteur la cherchera : le champ
       « rédigée par » dit le desk, cette ligne dit le reste. */
    id: "nb-cmr-2026-2",
    pays: "Cameroun",
    exercice: 2026,
    numero: 2,
    titre: "La loi votée publie ce que nous déduisions",
    enUnePhrase:
      "La présentation de lancement du budget, publiée après promulgation, imprime les colonnes du budget général : le remboursement du principal y est écrit 2 473,4 là où nous le déduisions, et les dépenses votées sont redistribuées sans que le total bouge.",
    motif: "Relevé de la loi promulguée du 17 décembre, après travail sur le projet",
    demandeePar: "Georges Nitcheu",
    redigeePar: "Desk Purpose Capital",
    closeLe: "2026-10-25",
    corps: [
      {
        genre: "constat",
        texte:
          "Le remboursement du principal est désormais PUBLIÉ : la loi écrit « dépenses de la dette 2 473,4 ». La note n° 1 raisonnait sur une déduction — besoin moins déficit — qui donnait 2 473,2. L'écart est de deux dixièmes, et la leçon ne tient plus à une soustraction.",
      },
      {
        genre: "constat",
        texte:
          "Le vote a redistribué les dépenses sans toucher au total : 13,3 milliards ont quitté les biens et services pour les transferts et l'investissement. Le total hors principal reste 6 210,5, au centime, comme au projet.",
      },
      {
        genre: "constat",
        texte:
          "Le budget voté inscrit 2 996,8 milliards d'emprunts dans ses recettes, quand l'exposé des motifs chiffre le besoin de financement à 3 104,2 et détaille six portes qui y tombent exactement. L'écart est de 107,4, et aucune pièce relevée ne le ventile.",
      },
      {
        genre: "lecture",
        texte:
          "Si les 107,4 correspondent à des ressources de trésorerie ou aux comptes d'affectation spéciale, alors le besoin couvert par emprunt est 2 996,8 et la ligne des titres publics y pèse 13,3 % plutôt que 12,9 %. Nous ne savons pas laquelle des deux lectures est la bonne : les deux dénominateurs sont écrits dans des documents officiels, et aucun des deux ne dit l'autre faux.",
      },
      {
        genre: "lecture",
        texte:
          "Si la révision annoncée est déposée, alors la redistribution des dépenses est le premier endroit à relire : le vote a déjà déplacé 13,3 milliards entre postes à total constant, sans que rien ne le signale, et une révision peut en déplacer bien davantage de la même manière.",
      },
    ],
    surveiller: [
      "La ventilation des 107,4 milliards : elle devrait figurer aux annexes de la loi, que nous n'avons pas relevées.",
      "Les lignes des comptes d'affectation spéciale, 132,5 milliards, non relevées à ce jour.",
      "Le dépôt du collectif budgétaire — la note n° 1 l'attendait en novembre, et il n'était ni déposé ni voté au 25 octobre.",
      "Le programme annuel d'émissions publié par la BEAC : il est en ligne, mais c'est un scan sans texte.",
    ],
    malLu:
      "La note n° 1 citait la loi n° 2025/012 du 17 décembre comme sa source alors que ses chiffres venaient de l'exposé des motifs du PROJET, daté de novembre. Les deux diffèrent sur la répartition des dépenses, et le principal y était déduit quand la loi le publie. Nous présentions comme voté ce qui n'était que proposé.",
    releve: [
      { cle: "millesime", libelle: "Millésime en vigueur", valeur: "LFI 2026, révision annoncée" },
      { cle: "budget_total", libelle: "Total du budget", valeur: "8 816,4 Md" },
      { cle: "baril_loi", libelle: "Prix du baril retenu", valeur: "62,38 $" },
      { cle: "baril_constate", libelle: "Prix du baril retenu \u00b7 constaté", valeur: "\u2248 100 $ au printemps 2026" },
      { cle: "solde", libelle: "Solde déclaré", valeur: "-631,0 Md" },
      { cle: "amortissement", libelle: "Remboursement du principal", valeur: "2\u202f473,4 Md" },
      { cle: "besoin", libelle: "Besoin de financement", valeur: "3\u202f104,2 Md" },
      { cle: "programme_titres", libelle: "Programme de titres publics", valeur: "400,0 Md" },
    ],
    /* Les pièces de la fiche, qui portent déjà la présentation de lancement :
       la reprendre ici l'aurait mise deux fois sous la même note. */
    references: [...(CAMEROUN.references ?? [])],
  },
];
