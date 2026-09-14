import type { Country } from "@/lib/domain/types";

/**
 * The seven companies listed on the BVMAC equity board: identity, shareholding,
 * documents published on the BVMAC site and the key figures of their certified
 * annual accounts. Figures come from the issuers' « fiches signalétiques » and
 * audited statements (sources quoted per year); they are refreshed when new
 * accounts are published (see src/lib/companies/collect.ts).
 */

export type Sector = "Agro-alimentaire" | "Agro-industrie" | "Banque" | "Réassurance" | "Holding bancaire";
export type DocKind = "fiche" | "etats_ohada" | "etats_ifrs" | "rapport_gestion" | "rapport_semestriel" | "note_information" | "autre";

export interface IssuerDocument {
  kind: DocKind;
  year: number; // exercice
  title: string;
  url: string; // BVMAC
}

export interface YearFigures {
  year: number;
  standard: "OHADA" | "IFRS";
  totalAssets: number; // total bilan, FCFA
  equity: number; // capitaux propres
  revenue: number; // chiffre d'affaires / produit net bancaire / primes acquises
  revenueLabel: "Chiffre d'affaires" | "Produit net bancaire" | "Primes acquises brutes";
  valueAdded?: number;
  netIncome: number; // résultat net
  dividendPerShare?: number | null; // brut, null = non distribué, undefined = inconnu
  source: string; // document title
}

export interface Company {
  mnemo: string;
  isin: string;
  name: string; // dénomination sociale
  shortName: string;
  sector: Sector;
  activity: string; // one plain sentence
  country: Country;
  city: string;
  listedOn: string; // YYYY-MM-DD
  ipoPrice?: number; // FCFA per share at listing
  shareCapital: number; // FCFA
  sharesTotal: number;
  sharesFloat: number;
  freeFloatPct: number;
  coreShareholders: { name: string; pct: number }[];
  chair?: string;
  ceo?: string;
  website?: string;
  contact?: string;
  fiscalYearEnd: "31/12";
  figures: YearFigures[]; // oldest → newest
  documents: IssuerDocument[];
  /** Plain-language notes the pages reuse: what the company does, what to watch. */
  reading: string[];
}

const U = "https://www.bvm-ac.org/wp-content/uploads";

export const COMPANIES: Company[] = [
  {
    mnemo: "SEMC",
    isin: "CM0000010009",
    name: "Société des Eaux Minérales du Cameroun",
    shortName: "SEMC",
    sector: "Agro-alimentaire",
    activity: "Produit et vend l'eau minérale Tangui et les eaux de source du groupe SABC (Castel) au Cameroun.",
    country: "Cameroun",
    city: "Douala",
    listedOn: "2006-06-30",
    shareCapital: 1_924_730_000,
    sharesTotal: 192_473,
    sharesFloat: 38_367,
    freeFloatPct: 19.93,
    coreShareholders: [
      { name: "Société Anonyme des Brasseries du Cameroun (SABC)", pct: 56.9 },
      { name: "Société Nationale d'Investissement (SNI)", pct: 17.51 },
      { name: "Nestlé Waters France", pct: 5.66 },
    ],
    chair: "Aïssatou Yaou",
    ceo: "Stéphane Descazeaud",
    website: "https://www.boissonsducameroun.com",
    fiscalYearEnd: "31/12",
    figures: [
      { year: 2021, standard: "OHADA", totalAssets: 8_584_602_374, equity: 1_900_342_515, revenue: 9_907_385_790, revenueLabel: "Chiffre d'affaires", valueAdded: 4_071_272_023, netIncome: 872_621_614, dividendPerShare: null, source: "Fiche signalétique SEMC 2025 (BVMAC)" },
      { year: 2022, standard: "OHADA", totalAssets: 6_891_925_812, equity: 2_405_262_981, revenue: 10_528_222_112, revenueLabel: "Chiffre d'affaires", valueAdded: 3_267_736_337, netIncome: 504_920_466, dividendPerShare: null, source: "Fiche signalétique SEMC 2025 (BVMAC)" },
      { year: 2023, standard: "OHADA", totalAssets: 6_243_670_659, equity: 3_385_320_228, revenue: 9_788_997_070, revenueLabel: "Chiffre d'affaires", valueAdded: 3_209_348_246, netIncome: 980_057_247, dividendPerShare: 600, source: "Fiche signalétique SEMC 2025 (BVMAC)" },
      { year: 2024, standard: "OHADA", totalAssets: 5_931_628_960, equity: 4_042_117_686, revenue: 10_104_143_421, revenueLabel: "Chiffre d'affaires", valueAdded: 3_048_600_671, netIncome: 772_281_258, dividendPerShare: 600, source: "Fiche signalétique SEMC 2025 (BVMAC)" },
      { year: 2025, standard: "OHADA", totalAssets: 7_848_354_395, equity: 4_767_320_406, revenue: 10_456_986_789, revenueLabel: "Chiffre d'affaires", valueAdded: 3_261_827_127, netIncome: 840_686_520, dividendPerShare: 800, source: "États financiers OHADA 2025 certifiés (Deloitte / Vinka Audit), AGO 2026" },
    ],
    documents: [
      { kind: "fiche", year: 2025, title: "Fiche signalétique 2025", url: `${U}/2025/07/FICHE-SIGNALETIQUE-SEMC-2025.pdf` },
      { kind: "etats_ohada", year: 2025, title: "États financiers OHADA 2025", url: `${U}/2026/07/Etats-financiers-OHADA-SEMC-2025.pdf` },
      { kind: "etats_ifrs", year: 2025, title: "États financiers IFRS 2025", url: `${U}/2026/07/Etats-financiers-IFRS-SEMC-2025.pdf` },
      { kind: "etats_ohada", year: 2024, title: "États financiers OHADA 2024", url: `${U}/2025/07/Etats-financiers-OHADA-SEMC.pdf` },
      { kind: "etats_ifrs", year: 2024, title: "États financiers IFRS 2024", url: `${U}/2025/07/Etats-financiers-IFRS-SEMC-2.pdf` },
      { kind: "rapport_semestriel", year: 2024, title: "Rapport d'activité semestriel 2024", url: `${U}/2024/11/SEMC-Rapport-semestriel-2024-SYSCOHADA.pdf` },
      { kind: "etats_ohada", year: 2023, title: "États financiers OHADA 2023", url: `${U}/2024/07/OHADA-SITE.pdf` },
      { kind: "etats_ifrs", year: 2023, title: "États financiers IFRS 2023", url: `${U}/2024/07/IFRSS-SITE-compresse.pdf` },
      { kind: "etats_ohada", year: 2022, title: "États financiers OHADA 2022", url: `${U}/2023/09/Etats-financiers-SEMC-2022.pdf` },
      { kind: "etats_ifrs", year: 2022, title: "États financiers IFRS 2022", url: `${U}/2024/08/SEMC-2022-IFRS.pdf` },
      { kind: "etats_ohada", year: 2021, title: "États financiers OHADA 2021", url: `${U}/2023/09/Etats-financiers-SEMC-2021.pdf` },
      { kind: "etats_ifrs", year: 2021, title: "États financiers IFRS 2021", url: `${U}/2024/08/SEMC-2021-IFRS.pdf` },
      { kind: "etats_ohada", year: 2020, title: "États financiers OHADA 2020", url: `${U}/2024/08/SEMC-2020-OHADA.pdf` },
      { kind: "etats_ifrs", year: 2020, title: "États financiers IFRS 2020", url: `${U}/2024/08/SEMC-2020-IFRS.pdf` },
      { kind: "etats_ohada", year: 2019, title: "États financiers OHADA 2019", url: `${U}/2023/09/Etats-financiers-SEMC-2019.pdf` },
      { kind: "etats_ifrs", year: 2019, title: "États financiers IFRS 2019", url: `${U}/2024/08/SEMC-2019-IFRSS.pdf` },
    ],
    reading: [
      "Une entreprise de consommation courante : les ventes suivent la demande d'eau embouteillée, peu sensible à la conjoncture.",
      "Les fonds propres ont plus que doublé entre 2021 et 2025 parce que la société a gardé une partie de ses bénéfices ; le dividende est revenu en 2023.",
      "Le flottant est étroit (moins de 20 % du capital) : peu de titres s'échangent, le cours bouge par à-coups.",
    ],
  },
  {
    mnemo: "SAF",
    isin: "CM0000010017",
    name: "Société Africaine Forestière et Agricole du Cameroun",
    shortName: "SAFACAM",
    sector: "Agro-industrie",
    activity: "Plantations de palmier à huile et d'hévéa à Dizangué (Cameroun) ; vend de l'huile de palme et du caoutchouc. Filiale du groupe Socfin.",
    country: "Cameroun",
    city: "Douala",
    listedOn: "2008-07-09",
    shareCapital: 6_210_000_000,
    sharesTotal: 1_242_000,
    sharesFloat: 248_400,
    freeFloatPct: 20,
    coreShareholders: [
      { name: "Société Anonyme Forestière et Agricole (SAFA, groupe Socfin)", pct: 68.84 },
      { name: "Société Nationale d'Investissement (SNI)", pct: 11.16 },
    ],
    chair: "Régis Helsmoortel",
    ceo: "Jean-François Pajot",
    website: "https://www.socfin.com/fr/implantations/safacam/",
    contact: "safacam@safacam.com",
    fiscalYearEnd: "31/12",
    figures: [
      { year: 2022, standard: "OHADA", totalAssets: 30_151_841_941, equity: 21_373_900_522, revenue: 23_224_733_981, revenueLabel: "Chiffre d'affaires", valueAdded: 10_961_193_659, netIncome: 2_747_697_994, dividendPerShare: 2_210, source: "Fiche signalétique SAFACAM 2026 (BVMAC)" },
      { year: 2023, standard: "OHADA", totalAssets: 31_708_610_667, equity: 19_241_624_597, revenue: 23_577_227_331, revenueLabel: "Chiffre d'affaires", valueAdded: 9_084_692_605, netIncome: 612_544_286, dividendPerShare: 490, source: "Fiche signalétique SAFACAM 2026 (BVMAC)" },
      { year: 2024, standard: "OHADA", totalAssets: 32_139_531_395, equity: 21_414_462_333, revenue: 29_510_124_866, revenueLabel: "Chiffre d'affaires", valueAdded: 12_325_346_505, netIncome: 2_781_417_736, dividendPerShare: 2_000, source: "Fiche signalétique SAFACAM 2026 (BVMAC)" },
      { year: 2025, standard: "OHADA", totalAssets: 33_435_932_621, equity: 22_149_885_911, revenue: 28_351_042_176, revenueLabel: "Chiffre d'affaires", valueAdded: 12_984_837_707, netIncome: 3_219_423_726, dividendPerShare: 2_200, source: "Fiche signalétique SAFACAM 2026 (BVMAC) — comptes 2025 certifiés" },
    ],
    documents: [
      { kind: "fiche", year: 2026, title: "Fiche signalétique 2026", url: `${U}/2026/07/FICHE-SIGNALETIQUE-SAFACAM-2026-Rev_page-0001.jpg` },
      { kind: "etats_ohada", year: 2025, title: "États financiers OHADA 2025", url: `${U}/2026/07/Etats-financiers-OHADA-2025-SAFACAM.pdf` },
      { kind: "etats_ifrs", year: 2025, title: "États financiers IFRS 2025", url: `${U}/2026/07/Etats-financiers-IFRS-2025-SAFACAM.pdf` },
      { kind: "etats_ohada", year: 2024, title: "États financiers OHADA 2024", url: `${U}/2025/07/Etats-financiers-OHADA-SAFACAM.pdf` },
      { kind: "etats_ifrs", year: 2024, title: "États financiers IFRS 2024", url: `${U}/2025/07/Etats-financiers-IFRS-SAFACAM-1.pdf` },
      { kind: "rapport_semestriel", year: 2024, title: "Rapport d'activité semestriel 2024", url: `${U}/2024/11/Rapport-semestriel-SAFACAM-2024.pdf` },
      { kind: "etats_ohada", year: 2023, title: "États financiers OHADA 2023", url: `${U}/2024/07/OHADA-SAFACAM-compresse.pdf` },
      { kind: "etats_ifrs", year: 2023, title: "États financiers IFRS 2023", url: `${U}/2024/07/IFRSS-SAFACAM-compresse.pdf` },
      { kind: "etats_ohada", year: 2022, title: "États financiers OHADA 2022", url: `${U}/2023/09/Etats-financiers-SAFACAM-2022.pdf` },
      { kind: "etats_ifrs", year: 2022, title: "États financiers IFRS 2022", url: `${U}/2024/08/IFRS-SAFACAM-2022_removed-1.pdf` },
      { kind: "etats_ohada", year: 2021, title: "États financiers OHADA 2021", url: `${U}/2023/09/Etats-financiers-SAFACAM-2021.pdf` },
      { kind: "etats_ifrs", year: 2021, title: "États financiers IFRS 2021", url: `${U}/2024/08/IFRS-2021_removed-1.pdf` },
      { kind: "etats_ohada", year: 2020, title: "États financiers OHADA 2020", url: `${U}/2023/09/Etats-financiers-SAFACAM-2020.pdf` },
      { kind: "etats_ifrs", year: 2020, title: "États financiers IFRS 2020", url: `${U}/2024/08/IFRS-2020_removed-1.pdf` },
      { kind: "etats_ohada", year: 2019, title: "États financiers OHADA 2019", url: `${U}/2023/09/Etats-financiers-SAFACAM-2019.pdf` },
      { kind: "etats_ifrs", year: 2019, title: "États financiers IFRS 2019", url: `${U}/2024/08/IFRS-SAFACAM-2019_removed-compresse.pdf` },
    ],
    reading: [
      "Ses revenus dépendent des cours mondiaux de l'huile de palme et du caoutchouc et de la récolte : une année comme 2023 (bénéfice divisé par quatre) peut suivre une bonne année.",
      "La société distribue une grande part de ses bénéfices : le dividende suit le résultat, il n'est pas stable d'une année sur l'autre.",
      "Rendement du dividende élevé aux cours actuels, mais à lire avec la volatilité du résultat.",
    ],
  },
  {
    mnemo: "SOCAP",
    isin: "CM0000010025",
    name: "Société Camerounaise de Palmeraies",
    shortName: "SOCAPALM",
    sector: "Agro-industrie",
    activity: "Premier producteur d'huile de palme du Cameroun : six plantations et huileries, huile brute vendue aux raffineurs locaux. Filiale du groupe Socfin, l'État camerounais reste actionnaire.",
    country: "Cameroun",
    city: "Douala",
    listedOn: "2009-04-07",
    shareCapital: 45_757_890_000,
    sharesTotal: 4_575_789,
    sharesFloat: 787_080,
    freeFloatPct: 17.2,
    coreShareholders: [
      { name: "Socfinaf SA (groupe Socfin)", pct: 60.44 },
      { name: "État du Cameroun", pct: 22.36 },
    ],
    chair: "Hamadou Sali",
    ceo: "Frédéric Auge",
    website: "https://www.socapalm.com",
    contact: "info-scp@socapalm.org",
    fiscalYearEnd: "31/12",
    figures: [
      { year: 2022, standard: "OHADA", totalAssets: 95_255_878_836, equity: 66_264_320_498, revenue: 74_025_856_390, revenueLabel: "Chiffre d'affaires", valueAdded: 33_528_441_628, netIncome: 10_671_602_107, dividendPerShare: 2_250, source: "Fiche signalétique SOCAPALM 2026 (BVMAC)" },
      { year: 2023, standard: "OHADA", totalAssets: 92_057_745_683, equity: 67_900_464_710, revenue: 84_620_196_144, revenueLabel: "Chiffre d'affaires", valueAdded: 34_100_468_185, netIncome: 11_934_489_201, dividendPerShare: 2_600, source: "Fiche signalétique SOCAPALM 2026 (BVMAC)" },
      { year: 2024, standard: "OHADA", totalAssets: 92_372_347_176, equity: 66_410_248_844, revenue: 101_249_387_422, revenueLabel: "Chiffre d'affaires", valueAdded: 37_240_872_283, netIncome: 10_757_514_108, dividendPerShare: 2_500, source: "Fiche signalétique SOCAPALM 2026 (BVMAC)" },
      { year: 2025, standard: "OHADA", totalAssets: 91_530_797_583, equity: 65_606_093_801, revenue: 91_291_925_835, revenueLabel: "Chiffre d'affaires", valueAdded: 35_599_860_481, netIncome: 10_638_137_196, dividendPerShare: 2_325, source: "Fiche signalétique SOCAPALM 2026 (BVMAC) — comptes 2025 certifiés" },
    ],
    documents: [
      { kind: "fiche", year: 2026, title: "Fiche signalétique 2026", url: `${U}/2026/07/2026-07-20-Fiche-signaletique-SCP-BVMAC.png` },
      { kind: "etats_ohada", year: 2024, title: "États financiers OHADA 2024", url: `${U}/2025/07/Etats-financiers-OHADA-2024.pdf` },
      { kind: "etats_ifrs", year: 2024, title: "États financiers IFRS 2024", url: `${U}/2025/07/Etats-financiers-IFRS-2024.pdf` },
      { kind: "etats_ohada", year: 2023, title: "États financiers OHADA 2023", url: `${U}/2024/07/OHADA-SOCAPALM-compresse.pdf` },
      { kind: "etats_ifrs", year: 2023, title: "États financiers IFRS 2023", url: `${U}/2024/07/IFRS-SOCAPALM-compresse.pdf` },
      { kind: "etats_ohada", year: 2022, title: "États financiers OHADA 2022", url: `${U}/2023/09/Etats-financiers-SOCAPALM-2022.pdf` },
      { kind: "etats_ifrs", year: 2022, title: "États financiers IFRS 2022", url: `${U}/2024/07/IFRS-SOCAPALM-2022-1-1.pdf` },
      { kind: "etats_ohada", year: 2021, title: "États financiers OHADA 2021", url: `${U}/2023/09/Etats-financiers-SOCAPALM-2021.pdf` },
      { kind: "etats_ifrs", year: 2021, title: "États financiers IFRS 2021", url: `${U}/2024/07/IFRS-SOCAPALM-2021.pdf` },
      { kind: "etats_ohada", year: 2020, title: "États financiers OHADA 2020", url: `${U}/2023/09/Etats-financiers-SOCAPALM-2020.pdf` },
      { kind: "etats_ifrs", year: 2020, title: "États financiers IFRS 2020", url: `${U}/2024/07/IFRS-SOCAPALM-2020.pdf` },
      { kind: "etats_ohada", year: 2019, title: "États financiers OHADA 2019", url: `${U}/2023/09/Etats-financiers-SOCAPALM-2019.pdf` },
      { kind: "etats_ifrs", year: 2019, title: "États financiers IFRS 2019", url: `${U}/2024/07/IFRSS-SOCAPALM-2019-1.pdf` },
    ],
    reading: [
      "La plus grosse société industrielle de la cote camerounaise : environ 90 milliards de chiffre d'affaires et un bénéfice stable autour de 10 à 12 milliards.",
      "Une marge nette d'environ 12 % et un dividende régulier (2 250 à 2 600 FCFA) : le profil « rendement » du marché.",
      "Le prix de l'huile de palme et les coûts de récolte font varier le résultat, mais l'ampleur des variations est bien moindre qu'à la SAFACAM.",
    ],
  },
  {
    mnemo: "REG",
    isin: "CM0000010041",
    name: "La Régionale Bank S.A.",
    shortName: "La Régionale",
    sector: "Banque",
    activity: "Banque de détail camerounaise née d'un établissement de microfinance, présente dans les grandes villes ; première société à s'introduire en bourse par augmentation de capital ouverte au public (2021).",
    country: "Cameroun",
    city: "Yaoundé",
    listedOn: "2021-07-16",
    ipoPrice: 35_900,
    shareCapital: 10_125_360_000,
    sharesTotal: 1_012_536,
    sharesFloat: 72_089,
    freeFloatPct: 7.12,
    coreShareholders: [
      { name: "Charles Rollin Ombang Ekath", pct: 59.73 },
      { name: "Nordic Microcap Investment", pct: 13.16 },
      { name: "Autres actionnaires du noyau dur", pct: 19.99 },
    ],
    chair: "Isaac Kul",
    ceo: "Charles Rollin Ombang Ekath",
    website: "https://www.laregionalebank.com",
    fiscalYearEnd: "31/12",
    figures: [
      { year: 2021, standard: "OHADA", totalAssets: 35_293_587_227, equity: 12_251_765_946, revenue: 5_271_190_748, revenueLabel: "Produit net bancaire", netIncome: 1_112_842_792, dividendPerShare: null, source: "Fiche signalétique La Régionale Bank 2025 (BVMAC)" },
      { year: 2022, standard: "OHADA", totalAssets: 40_005_863_069, equity: 13_472_883_815, revenue: 5_943_912_015, revenueLabel: "Produit net bancaire", netIncome: 1_221_117_869, dividendPerShare: 1_004.5, source: "Fiche signalétique La Régionale Bank 2025 (BVMAC)" },
      { year: 2023, standard: "OHADA", totalAssets: 45_682_771_845, equity: 13_292_712_110, revenue: 5_915_919_627, revenueLabel: "Produit net bancaire", netIncome: 814_020_480, dividendPerShare: 993.334, source: "Fiche signalétique La Régionale Bank 2025 (BVMAC)" },
      { year: 2024, standard: "OHADA", totalAssets: 64_170_053_150, equity: 12_455_210_665, revenue: 6_024_301_610, revenueLabel: "Produit net bancaire", netIncome: 162_498_555, dividendPerShare: null, source: "Fiche signalétique La Régionale Bank 2025 (BVMAC) — bénéfice réintégré" },
    ],
    documents: [
      { kind: "fiche", year: 2025, title: "Fiche signalétique 2025", url: `${U}/2025/07/FICHE-SIGNALETIQUE-LA-REGIONALE-BANK-2025.pdf` },
      { kind: "rapport_gestion", year: 2024, title: "Rapport de gestion 2024", url: `${U}/2025/07/RAPPORT-DE-GESTION-2024.pdf` },
      { kind: "etats_ohada", year: 2024, title: "États financiers 2024", url: `${U}/2025/07/Etats-financiers-REGIONALE-BANK.pdf` },
      { kind: "rapport_semestriel", year: 2024, title: "États financiers au 30 juin 2024", url: `${U}/2024/11/LA-REGIONALE-ETATS-FINANCIERS-30-06-24-2.pdf` },
      { kind: "etats_ohada", year: 2023, title: "États financiers 2023", url: `${U}/2024/08/Etats-financiers-2023-LA-REGIONALE-BANK_removed-compresse.pdf` },
      { kind: "etats_ohada", year: 2022, title: "États financiers 2022", url: `${U}/2024/08/Etats-financiers-2022-LA-REGIONALE-BANK_removed-1-1.pdf` },
      { kind: "rapport_gestion", year: 2021, title: "Rapport d'activités 2021", url: `${U}/2023/09/La-Regionale-Rapport-dactivites-exercice-2021.pdf` },
      { kind: "etats_ohada", year: 2020, title: "États financiers 2020", url: `${U}/2023/09/Etats-financiers-LA-REGIONALE-2020.pdf` },
      { kind: "etats_ohada", year: 2019, title: "États financiers 2019", url: `${U}/2023/09/Etats-Financiers-LA-REGIONALE-2019.pdf` },
    ],
    reading: [
      "Pour une banque, le « chiffre d'affaires » s'appelle produit net bancaire : marge d'intérêt plus commissions. Il progresse doucement (5,3 → 6,0 milliards).",
      "Le bilan grossit vite (35 → 64 milliards en trois ans) mais le bénéfice 2024 a chuté à 162 millions : la banque provisionne davantage ses crédits. Aucun dividende sur 2024.",
      "Flottant très étroit (7 %) et un actionnaire principal majoritaire : peu d'échanges, un cours qui reflète surtout les dernières transactions.",
    ],
  },
  {
    mnemo: "BANGE",
    isin: "GQ0000010050",
    name: "Banco Nacional de Guinea Ecuatorial S.A.",
    shortName: "BANGE",
    sector: "Banque",
    activity: "Première banque de Guinée équatoriale par le réseau, contrôlée par l'État équato-guinéen ; première société non camerounaise cotée à la BVMAC (2022).",
    country: "Guinée éq.",
    city: "Malabo",
    listedOn: "2022-09-28",
    ipoPrice: 206_220,
    shareCapital: 55_896_000_000,
    sharesTotal: 558_960,
    sharesFloat: 50_000,
    freeFloatPct: 8.94,
    coreShareholders: [
      { name: "République de Guinée équatoriale", pct: 64.1 },
      { name: "Abayak", pct: 5.37 },
      { name: "Bank of Commerce", pct: 3.07 },
      { name: "Autres actionnaires du noyau dur", pct: 18.52 },
    ],
    chair: "Martín Crisanto Ebe Mba",
    ceo: "Emilio Moyo Avoro",
    website: "https://www.bannge.com",
    fiscalYearEnd: "31/12",
    figures: [
      { year: 2021, standard: "OHADA", totalAssets: 379_535_385_750, equity: 34_331_542_919, revenue: 24_338_220_647, revenueLabel: "Produit net bancaire", netIncome: 2_578_239_953, dividendPerShare: null, source: "Fiche signalétique BANGE 2025 (BVMAC)" },
      { year: 2022, standard: "OHADA", totalAssets: 427_944_480_363, equity: 80_753_891_397, revenue: 31_281_043_130, revenueLabel: "Produit net bancaire", netIncome: 5_215_348_478, dividendPerShare: 8_397, source: "Fiche signalétique BANGE 2025 (BVMAC)" },
      { year: 2023, standard: "OHADA", totalAssets: 681_658_000_000, equity: 80_847_000_000, revenue: 29_295_246_649, revenueLabel: "Produit net bancaire", netIncome: 4_243_000_000, dividendPerShare: 5_043, source: "Fiche signalétique BANGE 2025 (BVMAC)" },
      { year: 2024, standard: "OHADA", totalAssets: 664_490_430_363, equity: 81_987_020_373, revenue: 33_356_617_515, revenueLabel: "Produit net bancaire", netIncome: 4_502_594_568, dividendPerShare: 4_472, source: "Fiche signalétique BANGE 2025 (BVMAC) · rapport de gestion 2024" },
    ],
    documents: [
      { kind: "fiche", year: 2025, title: "Fiche signalétique 2025", url: `${U}/2025/09/FICHE-SIGNALETIQUE-BANGE-FINANZAS-2025.pdf` },
      { kind: "rapport_gestion", year: 2024, title: "Informe de gestión 2024 (rapport de gestion)", url: `${U}/2025/07/RAPPORT-DE-GESTION-BANGE-2024.pdf` },
      { kind: "etats_ohada", year: 2023, title: "États financiers 2023", url: `${U}/2024/10/Etats-financiers-BANGE-2023-compresse.pdf` },
      { kind: "etats_ohada", year: 2022, title: "États financiers 2022", url: `${U}/2023/09/Etats-financiers-BANGE-2022.pdf` },
      { kind: "etats_ohada", year: 2021, title: "États financiers 2021", url: `${U}/2023/09/Etats-financiers-BANGE-2021.pdf` },
    ],
    reading: [
      "Un bilan de plus de 660 milliards, le plus grand de la cote après BGFI ; les fonds propres ont plus que doublé en 2022 grâce à l'introduction en bourse et aux bénéfices conservés.",
      "Le bénéfice tourne autour de 4 à 5 milliards ; le dividende a baissé de 8 397 à 4 472 FCFA entre 2022 et 2024, ce qui reste 2 % environ du cours.",
      "Une banque publique dans une économie dépendante du pétrole et du gaz : l'activité suit les finances de l'État et des entreprises du secteur.",
    ],
  },
  {
    mnemo: "SCGRE",
    isin: "GA0000010066",
    name: "Société Commerciale Gabonaise de Réassurance",
    shortName: "SCG-Ré",
    sector: "Réassurance",
    activity: "Réassureur national du Gabon : les compagnies d'assurance lui cèdent une part de leurs risques et de leurs primes. Détenue par l'État gabonais (via le FGIS) et les assureurs du pays.",
    country: "Gabon",
    city: "Libreville",
    listedOn: "2023-01-26",
    ipoPrice: 20_000,
    shareCapital: 15_000_000_000,
    sharesTotal: 1_500_000,
    sharesFloat: 300_000,
    freeFloatPct: 20,
    coreShareholders: [
      { name: "Groupe État gabonais (FGIS, FSRG, CDC)", pct: 55 },
      { name: "Compagnies d'assurance du Gabon", pct: 25 },
    ],
    ceo: "Thierry Abeloko (administrateur-directeur général)",
    website: "https://www.scg-re.ga",
    contact: "Infos@scg-reass.com",
    fiscalYearEnd: "31/12",
    figures: [
      { year: 2021, standard: "OHADA", totalAssets: 39_223_374_169, equity: 11_551_490_514, revenue: 14_643_569_322, revenueLabel: "Primes acquises brutes", netIncome: 1_018_138_609, dividendPerShare: 400, source: "Fiche signalétique SCG-Ré 2024 (BVMAC)" },
      { year: 2022, standard: "OHADA", totalAssets: 48_556_853_541, equity: 12_169_629_122, revenue: 17_671_523_490, revenueLabel: "Primes acquises brutes", netIncome: 1_442_174_000, dividendPerShare: 724, source: "Fiche signalétique SCG-Ré 2024 (BVMAC)" },
      { year: 2023, standard: "OHADA", totalAssets: 50_167_646_021, equity: 17_706_803_122, revenue: 19_644_862_830, revenueLabel: "Primes acquises brutes", netIncome: 1_524_415_047, dividendPerShare: 728, source: "Fiche signalétique SCG-Ré 2024 (BVMAC)" },
      { year: 2024, standard: "OHADA", totalAssets: 52_836_633_625, equity: 18_321_562_111, revenue: 22_181_448_836, revenueLabel: "Primes acquises brutes", netIncome: 1_504_514_887, dividendPerShare: 481.3, source: "Fiche signalétique SCG-Ré 2024 (BVMAC) · états financiers 2024 certifiés" },
    ],
    documents: [
      { kind: "fiche", year: 2024, title: "Fiche signalétique 2024", url: `${U}/2025/12/Fiche-signaletique-SCG-Re-2024.pdf` },
      { kind: "etats_ohada", year: 2024, title: "États financiers 2024", url: `${U}/2025/10/Etats-financiers-SCG-Re-2024.pdf` },
      { kind: "etats_ohada", year: 2023, title: "États financiers 2023", url: `${U}/2024/10/Etats-financiers-SCG-Re-2023-1-1.pdf` },
    ],
    reading: [
      "Les primes progressent de 50 % en trois ans (14,6 → 22,2 milliards) : l'obligation de cession légale aux réassureurs nationaux alimente la croissance.",
      "Le bénéfice plafonne autour de 1,5 milliard malgré la hausse des primes : la sinistralité et les frais absorbent la croissance.",
      "Introduite à 20 000 FCFA, l'action cote toujours autour de ce prix ; le dividende 2024 (481 FCFA) rapporte environ 2,4 %.",
    ],
  },
  {
    mnemo: "BHC",
    isin: "GA0000010074",
    name: "BGFI Holding Corporation S.A.",
    shortName: "BGFI Holding",
    sector: "Holding bancaire",
    activity: "Maison mère du groupe BGFIBank, premier groupe bancaire d'Afrique centrale, présent dans onze pays (banque, assurance, gestion d'actifs). Première multinationale admise au compartiment actions de la BVMAC (mai 2026).",
    country: "Gabon",
    city: "Libreville",
    listedOn: "2026-05-07",
    ipoPrice: 80_000,
    shareCapital: 147_283_850_000,
    sharesTotal: 14_728_385,
    sharesFloat: 566_561,
    freeFloatPct: 3.85,
    coreShareholders: [
      { name: "Institutionnels privés", pct: 28.08 },
      { name: "Investisseurs privés", pct: 21.15 },
      { name: "Sogafric Holding", pct: 12.02 },
      { name: "Salariés du groupe BGFIBank", pct: 9.62 },
      { name: "Delta Synergie", pct: 9.52 },
      { name: "Nahor Capital", pct: 9.23 },
      { name: "Groupe Carlo Tassara Assets Management", pct: 6.54 },
    ],
    chair: "Henri-Claude Oyima (président-directeur général)",
    ceo: "Henri-Claude Oyima",
    website: "https://www.groupebgfibank.com",
    contact: "eqc@bgfi.com",
    fiscalYearEnd: "31/12",
    figures: [
      { year: 2022, standard: "IFRS", totalAssets: 332_601_000_000, equity: 212_781_000_000, revenue: 18_485_000_000, revenueLabel: "Chiffre d'affaires", netIncome: 5_602_000_000, dividendPerShare: 15_850, source: "Fiche émetteur BHC 2026 (BVMAC) — comptes sociaux de la holding, en millions" },
      { year: 2023, standard: "IFRS", totalAssets: 340_696_000_000, equity: 222_728_000_000, revenue: 21_427_000_000, revenueLabel: "Chiffre d'affaires", netIncome: 34_888_000_000, dividendPerShare: 11_000, source: "Fiche émetteur BHC 2026 (BVMAC)" },
      { year: 2024, standard: "IFRS", totalAssets: 354_518_000_000, equity: 226_117_000_000, revenue: 23_540_000_000, revenueLabel: "Chiffre d'affaires", netIncome: 20_698_000_000, dividendPerShare: 12_500, source: "Fiche émetteur BHC 2026 (BVMAC)" },
      { year: 2025, standard: "IFRS", totalAssets: 371_801_000_000, equity: 265_937_000_000, revenue: 30_334_000_000, revenueLabel: "Chiffre d'affaires", netIncome: 59_489_000_000, dividendPerShare: 2_500, source: "Fiche émetteur BHC 2026 (BVMAC) — dividende 2025 après division du nominal" },
    ],
    documents: [{ kind: "fiche", year: 2026, title: "Fiche émetteur 2026", url: `${U}/2026/07/FICHE-EMETTEUR-BHC-Actualise_page-0001.jpg` }],
    reading: [
      "Les chiffres publiés sont ceux de la holding (comptes sociaux) : son « chiffre d'affaires » est surtout fait des dividendes que lui versent ses filiales bancaires, d'où un bénéfice qui varie beaucoup d'une année sur l'autre.",
      "Plus grosse capitalisation de la BVMAC (plus de 1 300 milliards) mais un flottant de 3,85 % seulement : les 566 561 actions cotées ont été placées à 80 000 FCFA en mai 2026.",
      "Le dividende 2025 de 2 500 FCFA n'est pas comparable aux années précédentes : le nominal a été divisé avant l'introduction. Les prochains comptes consolidés du groupe donneront la vraie mesure de l'activité.",
    ],
  },
];

export const companyByMnemo = (mnemo: string): Company | undefined => COMPANIES.find((c) => c.mnemo.toLowerCase() === mnemo.toLowerCase());
export const companyByIsin = (isin: string): Company | undefined => COMPANIES.find((c) => c.isin === isin);
export const SECTOR_LABEL: Record<Sector, string> = { "Agro-alimentaire": "Agro-alimentaire", "Agro-industrie": "Agro-industrie", Banque: "Banque", Réassurance: "Réassurance", "Holding bancaire": "Holding bancaire" };
