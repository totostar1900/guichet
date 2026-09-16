import type { Country } from "@/lib/domain/types";

/**
 * Bond issuers of the BVMAC that are not listed companies — what their fiches
 * signalétiques (BVMAC, Espace émetteurs › Émetteurs obligations) say about
 * them. Figures are copied as printed, with the unit the fiche states.
 */
export interface IssuerFigures {
  year: number;
  totalAssets: number;
  revenue: number;
  revenueLabel: string;
  netIncome: number;
}

export interface BondIssuer {
  slug: string;
  name: string; // dénomination sociale
  shortName: string;
  mnemo: string;
  sector: string;
  activity: string;
  country: Country;
  city: string;
  shareCapital: number;
  shareholders: { name: string; pct: number }[];
  chair?: string;
  ceo?: string;
  contact?: string;
  website?: string;
  /** ISINs of the lines listed at the BVMAC (matched against the Guichet). */
  isins: string[];
  unit: 1 | 1_000 | 1_000_000; // multiplier of the figures below
  unitNote: string;
  figures: IssuerFigures[]; // oldest → newest
  documents: { title: string; year: number; url: string }[];
  reading: string[];
}

const U = "https://www.bvm-ac.org/wp-content/uploads/2026/09";

export const ISSUERS: BondIssuer[] = [
  {
    slug: "snpc",
    name: "Société Nationale des Pétroles du Congo",
    shortName: "SNPC",
    mnemo: "SNPC 1",
    sector: "Pétrole",
    activity: "Compagnie pétrolière nationale du Congo : elle porte les participations de l'État dans les permis d'exploration et de production, commercialise sa part de brut et opère des activités de raffinage et de distribution.",
    country: "Congo",
    city: "Brazzaville",
    shareCapital: 81_334_654_844,
    shareholders: [{ name: "État congolais (actionnaire unique)", pct: 100 }],
    chair: "Enoch Miatabouna (représentant la Présidence de la République)",
    ceo: "Maixent Raoul Ominga",
    isins: ["CG0000020584"],
    unit: 1,
    unitNote: "Montants en FCFA tels que publiés sur la fiche signalétique (arrêtés au 31 décembre).",
    figures: [
      { year: 2022, totalAssets: 4_764_254_303, revenue: 1_595_554_734, revenueLabel: "Chiffre d'affaires", netIncome: 110_507_439 },
      { year: 2023, totalAssets: 5_213_654_943, revenue: 1_260_850_516, revenueLabel: "Chiffre d'affaires", netIncome: 122_923_786 },
      { year: 2024, totalAssets: 5_927_488_903, revenue: 1_175_843_506, revenueLabel: "Chiffre d'affaires", netIncome: 34_121_923 },
      { year: 2025, totalAssets: 6_289_992_105, revenue: 1_057_484_290, revenueLabel: "Chiffre d'affaires", netIncome: 23_150_610 },
    ],
    documents: [{ title: "Fiche signalétique SNPC (mise à jour 2025)", year: 2025, url: `${U}/FICHE-SIGNALETIQUE-SNPC-2025-mis-a-jour-1_page-0001.jpg` }],
    reading: [
      "Un seul emprunt coté : SNPC 6,5 % NET 2024-2029, 32,1 milliards levés, 25,7 milliards restant dus, remboursés en quatre annuités égales chaque 31 décembre de 2026 à 2029.",
      "Le chiffre d'affaires publié recule chaque année depuis 2022 et le résultat net avec lui : la capacité de remboursement repose d'abord sur l'actionnaire unique, l'État, et sur les flux pétroliers qu'il lui confie.",
      "Les montants de la fiche paraissent bas pour une compagnie nationale ; ils sont repris tels quels, l'échelle exacte (FCFA ou milliers) sera confirmée avec les états financiers certifiés.",
    ],
  },
  {
    slug: "acep",
    name: "Agence de Crédit pour l'Entreprise Privée Cameroun SA",
    shortName: "ACEP Cameroun",
    mnemo: "ACEP 1",
    sector: "Microfinance",
    activity: "Établissement de microfinance de deuxième catégorie : crédits aux très petites et petites entreprises camerounaises, réseau d'agences à Yaoundé, Douala et en province.",
    country: "Cameroun",
    city: "Yaoundé",
    shareCapital: 1_444_000_000,
    shareholders: [
      { name: "BICEC", pct: 27 },
      { name: "Investisseurs & Partenaires (IPDEV)", pct: 20 },
      { name: "Société Nationale d'Investissement (SNI)", pct: 15 },
      { name: "ACEP International", pct: 13 },
      { name: "Petits porteurs", pct: 11 },
      { name: "CCIMA", pct: 10 },
      { name: "Groupement du personnel (GPAC)", pct: 4 },
    ],
    chair: "Ambroise Ondoa Onana",
    ceo: "Hack-Yann Akindele",
    contact: "info@acep-cameroun.org",
    isins: ["CM0000020545"],
    unit: 1,
    unitNote: "Montants en FCFA, comptes arrêtés au 31 décembre (fiche signalétique).",
    figures: [
      { year: 2022, totalAssets: 31_410_841_983, revenue: 6_153_733_712, revenueLabel: "Produit net financier", netIncome: 905_033_498 },
      { year: 2023, totalAssets: 33_588_478_125, revenue: 6_826_114_052, revenueLabel: "Produit net financier", netIncome: 536_566_549 },
      { year: 2024, totalAssets: 35_912_687_911, revenue: 7_745_408_679, revenueLabel: "Produit net financier", netIncome: 755_643_950 },
      { year: 2025, totalAssets: 41_045_733_577, revenue: 7_970_261_674, revenueLabel: "Produit net financier", netIncome: 803_621_227 },
    ],
    documents: [{ title: "Fiche signalétique ACEP Cameroun (mise à jour 2025)", year: 2025, url: `${U}/FICHE-SIGNALETIQUE-ACEP-2025-mis-a-jour_page-0001.jpg` }],
    reading: [
      "Emprunt ACEP 7 % BRUT 2024-2027 : 5 milliards levés (sursouscrit), 3 milliards restant dus, remboursés par semestre — 1 milliard le 30 décembre 2026, le 30 juin 2027 et le 30 décembre 2027.",
      "Un bilan qui grossit de 31 à 41 milliards en trois ans et un produit net financier de près de 8 milliards : la croissance de l'activité de crédit finance le service de la dette.",
      "Le coupon est « brut » : la retenue à la source s'applique, contrairement aux emprunts d'État cotés « NET ».",
    ],
  },
  {
    slug: "alios",
    name: "Société Camerounaise de Crédit Automobile (SOCCA) — Alios Finance Cameroun",
    shortName: "Alios Finance",
    mnemo: "AFC",
    sector: "Crédit-bail",
    activity: "Établissement financier spécialisé dans le crédit-bail et le financement d'équipements (véhicules, matériel) pour les entreprises au Cameroun ; filiale du groupe CREDAF.",
    country: "Cameroun",
    city: "Douala",
    shareCapital: 2_499_200_000,
    shareholders: [
      { name: "CREDAF Group", pct: 70.59 },
      { name: "RCI Banque", pct: 10.97 },
      { name: "MITCAM / SACAM", pct: 5.35 },
      { name: "BICEC", pct: 3.05 },
      { name: "SGC", pct: 1.77 },
      { name: "Autres privés camerounais", pct: 6.58 },
    ],
    chair: "Serge Bile",
    ceo: "Olivier Baman",
    contact: "cameroun@alios-finance.com",
    website: "https://www.alios-finance.com",
    isins: ["CM0000020412", "CM0000020610", "CM0000020628", "CM0000020404"],
    unit: 1_000_000,
    unitNote: "Montants en millions de FCFA, comptes arrêtés au 31 décembre (fiche signalétique).",
    figures: [
      { year: 2022, totalAssets: 64_130, revenue: 4_649, revenueLabel: "Produit net bancaire", netIncome: 1_049 },
      { year: 2023, totalAssets: 74_691, revenue: 4_902, revenueLabel: "Produit net bancaire", netIncome: 1_569 },
      { year: 2024, totalAssets: 68_494, revenue: 5_157, revenueLabel: "Produit net bancaire", netIncome: 1_101 },
      { year: 2025, totalAssets: 66_334, revenue: 5_174, revenueLabel: "Produit net bancaire", netIncome: 1_408 },
    ],
    documents: [{ title: "Fiche signalétique Alios Finance Cameroun (mise à jour 2026)", year: 2026, url: `${U}/FICHE-SIGNALETIQUE-ALIOS-FINANCE-CAMEROUN-2025-MAJ_page-0001.jpg` }],
    reading: [
      "Émetteur récurrent : six emprunts depuis 2018, trois encore en vie (ALIOS 03 à 6,5 % jusqu'en août 2028, ALIOS-05 à 6 % et ALIOS-06 à 7 % jusqu'en 2028 et 2030), remboursés par semestre ou par trimestre — les coupons tombent donc souvent, sur un nominal qui décroît.",
      "Un bilan stable autour de 65-75 milliards et un produit net bancaire en légère progression ; le résultat oscille entre 1 et 1,6 milliard.",
      "Les coupons sont « bruts » : retenue à la source applicable. Le nominal restant par titre est celui imprimé au bulletin de la BVMAC.",
    ],
  },
];

export const issuerBySlug = (slug: string): BondIssuer | undefined => ISSUERS.find((i) => i.slug === slug.toLowerCase());
export const issuerByIsin = (isin: string): BondIssuer | undefined => ISSUERS.find((i) => i.isins.includes(isin));
