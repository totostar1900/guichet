import type { BudgetEtat, Reference } from "@/lib/domain/types";
import { SEED_BUDGETS } from "./budgets-seed";

/**
 * LE RELEVÉ DES BUDGETS 2026 DANS LES PIÈCES OFFICIELLES (7 novembre 2026, demande du dirigeant : « 3B, seulement les pièces officielles »).
 *
 * Chaque montant vient d'une pièce publiée par l'État lui-même : la loi de finances, son fascicule, la note d'information du Trésor aux investisseurs, ou la page du
 * ministère. Montants en MILLIONS de FCFA, comme partout. Ce que la pièce ne dit pas, ou dit de deux façons, est NOMMÉ dans `aRelever` plutôt que tranché.
 *
 * LE GABON y est depuis l'ouverture du Journal officiel n° 123 bis (loi n° 002/2026), publié par le ministère : sa loi rectificative est lue dans ses tableaux d'équilibre.
 *
 * Un bouton du Desk charge ce relevé, sous le nom de celui qui clique et avec l'audit habituel ; il ne se charge pas tout seul.
 */
const LE = "2026-11-07";
const ref = (titre: string, editeur: string, url: string, date?: string): Reference => ({ titre, editeur, url, date, verifieLe: LE });

const TCHAD: BudgetEtat = {
  pays: "Tchad",
  exercice: 2026,
  millesime: "vote",
  loi: "Loi n° 008/AN/SÉNAT/2025 portant loi de finances pour l'exercice 2026",
  promulgueeLe: "2025-12-29",
  hypotheses: [],
  recettes: [
    { cle: "fiscales", libelle: "Recettes fiscales (dont pétrole 445 022)", montant: 1_446_058 },
    { cle: "dons", libelle: "Dons, legs et fonds de concours", montant: 401_063 },
    { cle: "autres", libelle: "Autres recettes (dont pétrole 334 844)", montant: 427_879 },
  ],
  depenses: [
    { cle: "interets", libelle: "Charges financières de la dette", montant: 125_500 },
    { cle: "personnel", libelle: "Dépenses de personnel", montant: 693_450 },
    { cle: "biens", libelle: "Dépenses de biens et services", montant: 231_152 },
    { cle: "transferts", libelle: "Dépenses de transferts", montant: 302_759 },
    { cle: "investissement", libelle: "Dépenses d'investissement", montant: 1_177_759 },
  ],
  budgetTotal: 2_530_620,
  soldeDeclare: -255_620,
  besoinDeFinancement: 824_015,
  financement: [
    { cle: "fmi", libelle: "Financement du FMI", montant: 377_000 },
    { cle: "prets_projets", libelle: "Prêts projets", montant: 153_015 },
    { cle: "prets_budgetaires", libelle: "Prêts budgétaires", montant: 269_000 },
    { cle: "titres", libelle: "Titres publics", montant: 15_000, titres: true },
    { cle: "banques", libelle: "Banques commerciales (dépôts)", montant: 10_000 },
  ],
  source: { texte: "Loi n° 008/AN/SÉNAT/2025 (adoptée les 17 et 26 décembre 2025, décret n° 3151/PR/2025 du 29 décembre 2025), articles 75 à 78, tableaux n° 1 à 4", releveLe: LE, url: "https://ecofinances.gouv.td/wp-content/uploads/2026/06/Loi-n008-AN-SENAT-2025-Portant-loi-de-Finances-2026-LF-2026.pdf" },
  references: [
    ref("Loi n° 008/AN/SÉNAT/2025 portant loi de finances 2026", "Ministère des Finances, du Budget, de l'Économie et du Plan", "https://ecofinances.gouv.td/wp-content/uploads/2026/06/Loi-n008-AN-SENAT-2025-Portant-loi-de-Finances-2026-LF-2026.pdf", "2025-12-29"),
    ref("Budget général de l'État, gestion 2026 (fascicule budgétaire)", "Ministère des Finances, du Budget, de l'Économie et du Plan", "https://ecofinances.gouv.td/wp-content/uploads/2026/06/Fascicule-budgAtaire-2026-VF.pdf"),
  ],
  aRelever: [
    "Le fascicule budgétaire donne un total général de 2 531,5 milliards, la loi 2 530,6 : écart de 0,9 non expliqué par les pièces.",
    "La loi prévoit 15,0 milliards de titres publics ; le programme annuel BEAC 2026 du Tchad en annonce 520,0 (BTA 120, OTA 400). Les deux ne se recoupent pas : à expliquer avant tout rapprochement.",
    "Le total des besoins de financement (824,0) comprend le solde global (255,6), l'amortissement (150,0), la recapitalisation des banques et le remboursement de prêts (147,0), le décaissement FMI (58,0), BEAC et banques (110,0) et les instances de paiement (103,4).",
  ],
};

const CONGO: BudgetEtat = {
  pays: "Congo",
  exercice: 2026,
  millesime: "revise",
  loi: "Loi de finances rectificative pour 2026, adoptée par le Parlement le 23 juillet 2026",
  hypotheses: [
    { cle: "baril", libelle: "Prix du baril retenu", valeur: "67 $", constate: "60,3 $ dans la loi initiale" },
    { cle: "croissance", libelle: "Croissance", valeur: "5,5 %" },
  ],
  recettes: [{ cle: "totales", libelle: "Recettes budgétaires", montant: 2_778_016 }],
  depenses: [{ cle: "totales", libelle: "Dépenses budgétaires", montant: 2_561_069 }],
  soldeDeclare: 216_947,
  besoinDeFinancement: 1_812_306,
  financement: [
    { cle: "titres", libelle: "Titres publics (BTA et OTA)", montant: 1_041_574, titres: true },
    { cle: "autres_ressources", libelle: "Autres ressources de trésorerie", montant: 553_786 },
    { cle: "excedent", libelle: "Excédent budgétaire", montant: 216_947 },
  ],
  source: { texte: "Ministère des Finances, du Budget et du Portefeuille public : présentation du 14 juillet 2026 et adoption du 23 juillet 2026", releveLe: LE, url: "https://www.finances.gouv.cg/en/node/4975" },
  references: [
    ref("Adoption du projet de loi de finances rectificative 2026 à l'Assemblée nationale et au Sénat", "Ministère des Finances du Congo", "https://www.finances.gouv.cg/en/node/4975", "2026-07-23"),
    ref("Présentation du projet de loi de finances rectificative 2026", "Ministère des Finances du Congo", "https://www.finances.gouv.cg/fr/articles/pr%C3%A9sentation-du-projet-de-loi-de-finances-rectificative-2026", "2026-07-14"),
    ref("Loi n° 42-2025 du 31 décembre 2025 portant loi de finances pour l'année 2026 (loi initiale)", "Ministère des Finances du Congo", "https://www.finances.gouv.cg/sites/default/files/documents/LOI%20DE%20FINANCES_2026.pdf", "2025-12-31"),
  ],
  aRelever: [
    "Le texte de la loi rectificative n'est pas publié en PDF sur le site du ministère : les montants viennent de ses deux pages d'annonce. Date de promulgation non relevée.",
    "Recettes et dépenses : totaux seuls ; le détail par poste n'est pas dans les pages d'annonce.",
    "Loi initiale : recettes 2 550,5, dépenses 2 320,2, excédent 230,4 ; ressources de trésorerie 1 240,4, charges de trésorerie 1 470,7.",
    "Les charges de trésorerie (1 812,3) sont financées par 1 595,4 de ressources de trésorerie, dont 1 041,6 de titres, et par l'excédent budgétaire (216,9).",
  ],
};

const GUINEE: BudgetEtat = {
  pays: "Guinée éq.",
  exercice: 2026,
  millesime: "vote",
  loi: "Ley n° 9/2025 du 9 décembre 2025 des Presupuestos Generales del Estado, exercice 2026",
  promulgueeLe: "2025-12-09",
  hypotheses: [],
  recettes: [
    { cle: "non_petrolieres", libelle: "Recettes non pétrolières", montant: 295_445 },
    { cle: "petrolieres", libelle: "Recettes pétrolières", montant: 998_837 },
  ],
  depenses: [
    { cle: "interets", libelle: "Intérêts et charges financières de la dette", montant: 86_000 },
    { cle: "personnel", libelle: "Dépenses de personnel", montant: 243_028 },
    { cle: "biens", libelle: "Biens et services courants", montant: 385_515 },
    { cle: "transferts", libelle: "Subventions et transferts", montant: 228_803 },
    { cle: "autres", libelle: "Autres dépenses", montant: 6_555 },
    { cle: "investissement", libelle: "Dépenses d'investissement", montant: 344_382 },
  ],
  budgetTotal: 1_294_282,
  soldeDeclare: 0,
  besoinDeFinancement: 542_600,
  financement: [
    { cle: "titres", libelle: "Titres publics (bons du Trésor 200 000, obligations du Trésor 100 000)", montant: 300_000, titres: true },
    { cle: "prets_internes", libelle: "Prêts internes (BDEAC 15 000, entreprises locales 48 000)", montant: 63_000 },
    { cle: "prets_externes", libelle: "Prêts extérieurs (Eximbank de Chine 60 000, BAD 30 000, BADEA 10 000, Afreximbank 79 600)", montant: 179_600 },
  ],
  source: { texte: "Loi n° 9/2025 du 9 décembre 2025, éditée par la Direction générale des budgets et des classes passives (Ministère des Finances), cuadros 3 et annexe III « Financiación »", releveLe: LE, url: "https://ahoraeg.com/wp-content/uploads/2026/01/PRESUPUESTOS_GE_2026-PARTE1.pdf" },
  references: [
    ref("Ley de Presupuestos Generales del Estado 2026 (Ley n° 9/2025)", "Direction générale des budgets et des classes passives — copie hébergée par ahoraeg.com, le ministère n'ayant pas été joignable", "https://ahoraeg.com/wp-content/uploads/2026/01/PRESUPUESTOS_GE_2026-PARTE1.pdf", "2025-12-09"),
  ],
  aRelever: [
    "Le texte est celui de la loi, édité par le ministère ; l'hébergeur de la copie n'est pas un site officiel.",
    "Besoin de financement : le total des dépenses de trésorerie (542,6) est surtout de l'amortissement (379,3), plus des fonds spéciaux (151,3), des prêts (2,0) et des participations (10,0).",
    "La loi prévoit 300,0 de titres publics ; le programme annuel BEAC 2026 de la Guinée équatoriale en annonce 419,0 (BTA 319, OTA 100). Les deux ne se recoupent pas.",
  ],
};

const RCA: BudgetEtat = {
  pays: "RCA",
  exercice: 2026,
  millesime: "revision_annoncee",
  loi: "Loi de finances pour 2026",
  hypotheses: [],
  recettes: [
    { cle: "interieures", libelle: "Recettes intérieures", montant: 206_800 },
    { cle: "appuis", libelle: "Appuis budgétaires", montant: 29_230 },
    { cle: "dons_projets", libelle: "Dons projets", montant: 125_400 },
    { cle: "emprunts_ext", libelle: "Tirages sur emprunts extérieurs", montant: 7_000 },
  ],
  depenses: [{ cle: "totales", libelle: "Dépenses totales", montant: 396_350 }],
  budgetTotal: 368_430,
  soldeDeclare: -27_920,
  besoinDeFinancement: 95_333,
  financement: [
    { cle: "titres", libelle: "Titres publics sur le marché régional (OTA)", montant: 66_100, titres: true },
    { cle: "appui", libelle: "Appui budgétaire", montant: 29_233 },
  ],
  source: { texte: "Note d'information 2026 du marché des titres publics, Ministère des Finances et du Budget (tableaux 2, 3, 4 et 10, d'après la LF 2026 — DGB/MFB)", releveLe: LE, url: "https://finances.gouv.cf/sites/default/files/2026-02/RCA%20NOTE_D'INFORMATION_2026.pdf" },
  references: [
    ref("Note d'information 2026 du marché des titres publics de la République centrafricaine", "Ministère des Finances et du Budget de la RCA", "https://finances.gouv.cf/sites/default/files/2026-02/RCA%20NOTE_D'INFORMATION_2026.pdf", "2026-02"),
  ],
  aRelever: [
    "Les trois lignes de dépenses du tableau 4 (237,04 primaires + 26,92 charges financières + 142,20 investissement) totalisent 406,16, pas 396,35 : seul le total est repris.",
    "Le budget total (368,43) est celui des ressources ; les dépenses sont à 396,35, d'où le solde de −27,92 (1,2 % du PIB).",
    "La note donne deux besoins de financement : 172,66 dans son introduction, 72,73 net / 95,33 brut dans le tableau 10. C'est le brut du tableau 10 qui est repris, parce qu'il égale les sources de financement.",
    "Le déficit vaut 1,2 % du PIB selon l'État et 3,5 à 4 % selon la Banque africaine de développement.",
  ],
};

const GABON: BudgetEtat = {
  pays: "Gabon",
  exercice: 2026,
  millesime: "revise",
  loi: "Loi n° 002/2026 du 17 juillet 2026 portant loi de finances rectificative de l'année 2026 (décret de promulgation n° 0322/PR du 17 juillet 2026)",
  promulgueeLe: "2026-07-17",
  hypotheses: [],
  recettes: [
    { cle: "fiscales", libelle: "Recettes fiscales", montant: 1_767_678 },
    { cle: "dons", libelle: "Dons, legs et fonds de concours", montant: 36_194 },
    { cle: "cotisations", libelle: "Cotisations sociales", montant: 10_780 },
    { cle: "autres", libelle: "Autres recettes", montant: 1_351_620 },
    { cle: "prelevements", libelle: "Prélèvements (collectivités, organisations internationales, établissements publics, prestations sociales, autres)", montant: -412_106 },
    { cle: "comptes_speciaux", libelle: "Recettes des comptes spéciaux", montant: 174_070 },
  ],
  depenses: [
    { cle: "interets", libelle: "Charges financières de la dette", montant: 487_551 },
    { cle: "personnel", libelle: "Dépenses de personnel", montant: 958_580 },
    { cle: "biens", libelle: "Dépenses de biens et services", montant: 562_442 },
    { cle: "transferts", libelle: "Dépenses de transfert", montant: 428_169 },
    { cle: "investissement", libelle: "Dépenses d'investissement", montant: 1_169_122 },
    { cle: "autres", libelle: "Autres dépenses", montant: 63_921 },
    { cle: "comptes_speciaux", libelle: "Dépenses des comptes spéciaux", montant: 174_070 },
  ],
  budgetTotal: 5_495_234,
  soldeDeclare: -915_619,
  besoinDeFinancement: 915_619,
  financement: [
    { cle: "titres", libelle: "Émissions de titres publics", montant: 1_282_754, titres: true },
    { cle: "bancaire", libelle: "Financement bancaire", montant: 266_265 },
    { cle: "tirages", libelle: "Tirages", montant: 122_653 },
    { cle: "prets_programmes", libelle: "Tirages sur conventions de prêts programmes", montant: 36_102 },
    { cle: "autres_ressources", libelle: "Autres ressources de trésorerie", montant: 544_000 },
    { cle: "charges", libelle: "Moins les charges de trésorerie (amortissements de la dette extérieure, des prêts bancaires et autres, autres opérations)", montant: -1_336_154 },
  ],
  programmeBeac: SEED_BUDGETS.find((b) => b.pays === "Gabon")!.programmeBeac,
  source: { texte: "Loi n° 002/2026 du 17 juillet 2026, Journal officiel n° 123 bis, articles 62, 77, 79, 83 et 84 (tableaux d'équilibre)", releveLe: LE, url: "https://budget.gouv.ga/wp-content/uploads/budget-source/85c30d2292bd57008059.pdf" },
  references: [
    ref("Loi n° 002/2026 portant loi de finances rectificative de l'année 2026 (Journal officiel n° 123 bis du 17 juillet 2026)", "Ministère de l'Économie, des Finances, de la Dette et des Participations du Gabon", "https://budget.gouv.ga/wp-content/uploads/budget-source/85c30d2292bd57008059.pdf", "2026-07-17"),
    ref("Loi de finances rectificative 2026 (page du ministère)", "Ministère de l'Économie, des Finances, de la Dette et des Participations du Gabon", "https://www.budget.gouv.ga/9-actualites/2617-loi-de-finances-rectificative-2026/", "2026-07-21"),
    ref("Loi n° 041/2025 du 29 décembre 2025 portant loi de finances pour 2026 (loi initiale, Journal officiel n° 96 quater)", "Gouvernement du Gabon", "https://gouvernement.ga/wp-content/uploads/2026/02/Journal-Officiel_n%C2%B096-Quater-du-30-decembre-2025_LOI-FIN-2026-1.pdf", "2025-12-30"),
  ],
  aRelever: [
    "Trois montants se suivent : 7 233,3 milliards au projet de loi de finances (octobre 2025), 6 358,2 à la loi initiale votée, 5 495,2 à la loi rectificative (−863,0). Le relevé du 25 octobre donnait le premier comme initial : il est corrigé.",
    "Le budget total (5 495,2) comprend les ristournes (315,2) ; les dépenses budgétaires sont de 3 843,9 (budget général 3 669,8 et comptes spéciaux 174,1), et l'ensemble des dépenses de l'État de 5 180,0 avec les opérations de trésorerie.",
    "Le besoin de financement est celui du budget général (article 79) : 915,6. Il est couvert par 2 251,8 de ressources de trésorerie, dont 1 282,8 de titres publics, moins 1 336,2 de charges de trésorerie.",
    "L'article 82 autorise jusqu'à 1,5 milliard de dollars (857,9 milliards de FCFA) de financements extérieurs, en plus des titres publics du marché régional.",
    "Le programme annuel BEAC 2026 du Gabon annonce 1 046,0 de titres (BTA 566, OTA 480) ; la loi prévoit 1 282,8 d'émissions de titres publics. Les deux ne se recoupent pas.",
  ],
};

const CAMEROUN: BudgetEtat = {
  ...SEED_BUDGETS.find((b) => b.pays === "Cameroun")!,
  source: { ...SEED_BUDGETS.find((b) => b.pays === "Cameroun")!.source, url: "https://www.dgb.cm/wp-content/uploads/2025/12/Expose-des-Motifs_LF-2026_fr.pdf" },
  references: [
    ref("Exposé des motifs du projet de loi de finances 2026", "Direction générale du budget (DGB), Cameroun", "https://www.dgb.cm/wp-content/uploads/2025/12/Expose-des-Motifs_LF-2026_fr.pdf", "2025-11"),
    ...(SEED_BUDGETS.find((b) => b.pays === "Cameroun")!.references ?? []),
  ],
};

/** Les six États, chacun lu dans une pièce officielle ouverte. */
export const RELEVE_OFFICIEL: BudgetEtat[] = [CAMEROUN, GABON, CONGO, TCHAD, RCA, GUINEE];
