/**
 * LES FICHES PAYS : LA SANTÉ ÉCONOMIQUE ET FINANCIÈRE D'UN ÉMETTEUR, EN FAITS SEULS (7 novembre 2026, planche « Fiches pays »).
 *
 * Trois sortes de matière, et chacune dit d'où elle vient :
 *
 *   LES INDICATEURS LUS    FMI (Perspectives de l'économie mondiale) et Banque mondiale, rafraîchis par un robot. Chaque valeur porte son année, sa source et le fait qu'elle
 *                          est estimée ou prévue (le FMI publie au-delà de la dernière année observée).
 *   LES FAITS SAISIS       notations des agences, chiffres des comptes d'une institution : saisis au Desk chaque trimestre,
 *                          chacun avec sa date et le lien de sa pièce.
 *   NOS PROPRES CHIFFRES   les titres publics en circulation (BEAC), le mur d'échéances, le calendrier : ils existent déjà au Desk.
 *
 * AUCUN COMMENTAIRE DE LA MAISON, décidé par le dirigeant le 7 novembre 2026 : ni phrase d'appréciation, ni feu rouge ou vert. Le seul jugement montré est celui d'une source, cité
 * avec elle (une note d'agence). Un chiffre qui n'existe pas à la source est nommé, jamais comblé.
 */
import type { Country } from "@/lib/domain/types";

export type SourceDIndicateur = "FMI" | "Banque mondiale";

export const INDICATEURS = [
  "dette_brute_pib",
  "solde_global_pib",
  "croissance_pib",
  "inflation",
  "compte_courant_pib",
  "dette_exterieure_rnb",
  "service_dette_exports",
] as const;
export type IndicateurPays = (typeof INDICATEURS)[number];

export interface PaysIndicateur {
  pays: Country;
  indicateur: IndicateurPays;
  annee: number;
  valeur: number;
  source: SourceDIndicateur;
  /** Une estimation ou une prévision du FMI, par opposition à une donnée observée. */
  estime: boolean;
  luLe: string;
}

/** Ce que chaque indicateur est : son libellé, son unité, sa source et le code à l'interroger. */
export const DEF_INDICATEUR: Record<IndicateurPays, { libelle: string; unite: string; source: SourceDIndicateur; code: string }> = {
  dette_brute_pib: { libelle: "Dette brute", unite: "% du PIB", source: "FMI", code: "GGXWDG_NGDP" },
  solde_global_pib: { libelle: "Solde global", unite: "% du PIB", source: "FMI", code: "GGXCNL_NGDP" },
  croissance_pib: { libelle: "Croissance du PIB", unite: "%", source: "FMI", code: "NGDP_RPCH" },
  inflation: { libelle: "Inflation", unite: "%", source: "FMI", code: "PCPIPCH" },
  compte_courant_pib: { libelle: "Compte courant", unite: "% du PIB", source: "FMI", code: "BCA_NGDPD" },
  dette_exterieure_rnb: { libelle: "Dette extérieure", unite: "% du RNB", source: "Banque mondiale", code: "DT.DOD.DECT.GN.ZS" },
  service_dette_exports: { libelle: "Service de la dette", unite: "% des exportations", source: "Banque mondiale", code: "DT.TDS.DECT.EX.ZS" },
};

/** Les six États, leur code à trois lettres chez le FMI et la Banque mondiale, et l'adresse de leur fiche. */
export const ETATS: { pays: Country; iso: string; slug: string; entite: string }[] = [
  { pays: "Cameroun", iso: "CMR", slug: "cameroun", entite: "etat-cameroun" },
  { pays: "Gabon", iso: "GAB", slug: "gabon", entite: "etat-gabon" },
  { pays: "Congo", iso: "COG", slug: "congo", entite: "etat-congo" },
  { pays: "Tchad", iso: "TCD", slug: "tchad", entite: "etat-tchad" },
  { pays: "RCA", iso: "CAF", slug: "centrafrique", entite: "etat-rca" },
  { pays: "Guinée éq.", iso: "GNQ", slug: "guinee-equatoriale", entite: "etat-guinee-equatoriale" },
];

/** Les institutions de la zone qui ont leur fiche, plus légère : l'identité, les notes, les chiffres de leurs comptes. */
export const INSTITUTIONS: { slug: string; entite: string; nom: string }[] = [
  { slug: "beac", entite: "beac", nom: "BEAC" },
  { slug: "bdeac", entite: "bdeac", nom: "BDEAC" },
];

export const etatParSlug = (slug: string) => ETATS.find((e) => e.slug === slug);
export const etatParPays = (pays: string) => ETATS.find((e) => e.pays === pays);
export const institutionParSlug = (slug: string) => INSTITUTIONS.find((i) => i.slug === slug);

/* ─── Les faits saisis ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export const GENRES = ["notation", "chiffre"] as const;
export type GenreDeFait = (typeof GENRES)[number];

export interface EntiteFait {
  id: string;
  /** L'entité : « etat-cameroun », « beac »… */
  entite: string;
  genre: GenreDeFait;
  /** Qui le dit : S&P, Moody's, Fitch, FMI, le Trésor, la BDEAC… */
  organisme: string;
  /** La note, l'évaluation, la valeur du chiffre, telle que la pièce l'écrit. */
  valeur: string;
  /** Pour une notation : la perspective. Pour un chiffre : son libellé. */
  perspective?: string;
  unite?: string;
  dateFait: string;
  url: string;
  saisiPar: string;
  saisiLe: string;
}
export type NouveauFait = Omit<EntiteFait, "id" | "saisiLe">;

/* ─── Les échelles officielles des agences ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Les échelles de notation à long terme, de la meilleure à la pire, telles que les agences les publient. Le dernier cran de la catégorie d'investissement est BBB− chez S&P et Fitch, Baa3 chez Moody's. */
export const ECHELLES: Record<string, { crans: string[]; dernierInvestissement: string }> = {
  "S&P": { crans: ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C", "SD", "D"], dernierInvestissement: "BBB-" },
  Fitch: { crans: ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-", "CCC+", "CCC", "CCC-", "CC", "C", "RD", "D"], dernierInvestissement: "BBB-" },
  Moody: { crans: ["Aaa", "Aa1", "Aa2", "Aa3", "A1", "A2", "A3", "Baa1", "Baa2", "Baa3", "Ba1", "Ba2", "Ba3", "B1", "B2", "B3", "Caa1", "Caa2", "Caa3", "Ca", "C"], dernierInvestissement: "Baa3" },
};

/** La clef d'échelle d'un organisme, tel qu'il s'écrit : « Moody's » comme « Moodys » retrouvent la leur. */
export function cleDEchelle(organisme: string): string | undefined {
  const o = organisme.toLowerCase().replace(/[^a-z&]/g, "");
  if (o.startsWith("moody")) return "Moody";
  if (o.startsWith("fitch")) return "Fitch";
  if (o.startsWith("s&p") || o.startsWith("sp") || o.startsWith("standard")) return "S&P";
  return undefined;
}

/** La place d'une note sur son échelle : son rang, et si elle est dans la catégorie d'investissement. Une note hors échelle n'a pas de place. */
export function placeSurLEchelle(organisme: string, note: string): { cle: string; rang: number; investissement: boolean } | undefined {
  const cle = cleDEchelle(organisme);
  if (!cle) return undefined;
  const e = ECHELLES[cle];
  const n = note.trim().replace(/−/g, "-").replace(/\s+/g, "");
  const rang = e.crans.findIndex((c) => c.toLowerCase() === n.toLowerCase());
  if (rang < 0) return undefined;
  return { cle, rang, investissement: rang <= e.crans.indexOf(e.dernierInvestissement) };
}

/* ─── La lecture des deux sources ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Les valeurs d'un indicateur du FMI pour les six États, depuis la réponse de son API (« values » → indicateur → code ISO → année → valeur).
 * `anneeLecture` sert à dire ce qui est estimé ou prévu : le FMI n'indique pas, dans cette réponse, la dernière année observée, donc la nôtre est
 * « l'année avant celle de la lecture, et les suivantes ».
 */
export function lireFmi(reponse: unknown, code: string, indicateur: IndicateurPays, luLe: string, anneeLecture: number): PaysIndicateur[] {
  const valeurs = (reponse as { values?: Record<string, Record<string, Record<string, number | null>>> })?.values?.[code];
  if (!valeurs) return [];
  const out: PaysIndicateur[] = [];
  for (const e of ETATS) {
    for (const [a, v] of Object.entries(valeurs[e.iso] ?? {})) {
      const annee = Number(a);
      if (v == null || !Number.isFinite(v) || !Number.isFinite(annee)) continue;
      out.push({ pays: e.pays, indicateur, annee, valeur: v, source: "FMI", estime: annee >= anneeLecture - 1, luLe });
    }
  }
  return out;
}

/** Les valeurs d'un indicateur de la Banque mondiale, depuis la réponse de son API (un tableau : métadonnées, puis les lignes). */
export function lireBanqueMondiale(reponse: unknown, indicateur: IndicateurPays, luLe: string): PaysIndicateur[] {
  const lignes = Array.isArray(reponse) ? (reponse[1] as { countryiso3code?: string; date?: string; value?: number | null }[] | null) : null;
  if (!lignes) return [];
  const out: PaysIndicateur[] = [];
  for (const l of lignes) {
    const e = ETATS.find((x) => x.iso === l.countryiso3code);
    const annee = Number(l.date);
    if (!e || l.value == null || !Number.isFinite(l.value) || !Number.isFinite(annee)) continue;
    out.push({ pays: e.pays, indicateur, annee, valeur: Math.round(l.value * 10) / 10, source: "Banque mondiale", estime: false, luLe });
  }
  return out;
}

/* ─── La lecture d'un pays ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** La valeur la plus récente d'un indicateur, estimée ou prévue comprise. */
export function dernier(rows: PaysIndicateur[], pays: string, indicateur: IndicateurPays): PaysIndicateur | undefined {
  return rows.filter((r) => r.pays === pays && r.indicateur === indicateur).sort((a, b) => b.annee - a.annee)[0];
}

/** La dernière année avec une valeur, au plus l'année donnée : pour « dette en 2025 » plutôt que « la dette de 2031 ». */
export function derniereJusqua(rows: PaysIndicateur[], pays: string, indicateur: IndicateurPays, annee: number): PaysIndicateur | undefined {
  return rows
    .filter((r) => r.pays === pays && r.indicateur === indicateur && r.annee <= annee)
    .sort((a, b) => b.annee - a.annee)[0];
}

export function serie(rows: PaysIndicateur[], pays: string, indicateur: IndicateurPays): PaysIndicateur[] {
  return rows.filter((r) => r.pays === pays && r.indicateur === indicateur).sort((a, b) => a.annee - b.annee);
}

/* ─── La fraîcheur trimestrielle ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Un bloc saisi est « à jour » dans le trimestre de sa dernière saisie et le suivant ; au-delà, il passe à « à vérifier ». */
export const JOURS_DE_FRAICHEUR = 92;

export type EtatDeFraicheur = "a_jour" | "a_verifier" | "jamais";

export function fraicheurDeLaSaisie(dernierJour: string | undefined, aujourdhui: string): { etat: EtatDeFraicheur; jours?: number } {
  if (!dernierJour) return { etat: "jamais" };
  const jours = Math.round((Date.parse(`${aujourdhui}T00:00:00Z`) - Date.parse(`${dernierJour}T00:00:00Z`)) / 86_400_000);
  return { etat: jours <= JOURS_DE_FRAICHEUR ? "a_jour" : "a_verifier", jours };
}

/** Le jour de la dernière saisie d'une entité, toutes sortes de faits confondues : c'est la date de la revue trimestrielle. */
export function derniereRevue(faits: EntiteFait[], entite: string): string | undefined {
  return faits
    .filter((f) => f.entite === entite)
    .map((f) => f.saisiLe.slice(0, 10))
    .sort()
    .at(-1);
}
