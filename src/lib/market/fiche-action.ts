import type { Quote } from "@/lib/domain/market";
import type { IndexPoint } from "./index";
import { RAPPORT_BRUT_MAX, RAPPORT_NET_MIN } from "./dividende-brut";
import { JOURS_DE_GRACE, PERIODES, debutDeFenetre, lirePeriode, type PeriodeCours, type PointCours } from "./periodes";

/**
 * CE QU'UNE FICHE D'ACTION AJOUTE (14 novembre 2026, planche 1A), ÉCRIT SANS BASE : trois lectures qui reçoivent les cotations,
 * jamais le dépôt. Elles viennent EN PLUS de la fiche (le cours, les chiffres clés, les séances, le dividende par exercice) et n'en
 * remplacent aucune.
 *
 *   - « contre l'indice » : la variation du titre et celle de l'indice sur la MÊME fenêtre, l'écart en points ;
 *   - les repères sur 52 semaines : plus bas et plus haut des CLÔTURES, et rien si la série ne couvre pas l'année ;
 *   - les dividendes versés : le montant brut publié par la société pour chaque exercice, et la date de paiement lue sur le bulletin.
 */

const jours = (de: string, a: string): number => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);

export const PERIODES_CONTRE_L_INDICE: PeriodeCours[] = ["3m", "6m", "1a"];

export interface LigneContreIndice {
  cle: PeriodeCours;
  libelle: string;
  titrePct: number;
  indicePct: number;
  /** Variation du titre moins celle de l'indice, en points de pourcentage. */
  ecartPts: number;
}

/**
 * UNE LIGNE N'EXISTE QUE SI LES DEUX SÉRIES COUVRENT LA PÉRIODE ET PARTENT DU MÊME JOUR (à la marge de grâce près) : un titre entré à la
 * cote en cours de période n'a pas de variation sur cette période, et l'indice dire le contraire serait comparer deux fenêtres.
 * Les points du titre vont du plus ancien au plus récent ; ceux de l'indice aussi.
 */
export function contreLIndice(titre: PointCours[], indice: IndexPoint[]): LigneContreIndice[] {
  const niveaux: PointCours[] = indice.map((p) => ({ d: p.date, c: p.value, v: 0 }));
  const out: LigneContreIndice[] = [];
  for (const cle of PERIODES_CONTRE_L_INDICE) {
    const a = lirePeriode(titre, cle);
    const b = lirePeriode(niveaux, cle);
    if (!a.disponible || !b.disponible || a.variationPct == null || b.variationPct == null || !a.depuis || !b.depuis) continue;
    if (Math.abs(jours(a.depuis, b.depuis)) > JOURS_DE_GRACE) continue;
    out.push({ cle, libelle: PERIODES.find((p) => p.cle === cle)?.libelle ?? cle, titrePct: a.variationPct, indicePct: b.variationPct, ecartPts: a.variationPct - b.variationPct });
  }
  return out;
}

export interface Reperes52 {
  bas: number;
  haut: number;
  /** La première séance lue de la fenêtre. */
  depuis: string;
}

/** Plus bas et plus haut des CLÔTURES sur douze mois civils, ou rien si la série ne les couvre pas (une ligne cotée depuis quelques mois n'a pas de « 52 semaines »). */
export function reperes52Semaines(points: PointCours[]): Reperes52 | undefined {
  if (points.length < 2) return undefined;
  const fin = points[points.length - 1].d;
  const debut = debutDeFenetre(fin, 12);
  const serie = points.filter((p) => p.d >= debut && p.c > 0);
  if (serie.length < 2 || jours(debut, serie[0].d) > JOURS_DE_GRACE) return undefined;
  const cours = serie.map((p) => p.c);
  return { bas: Math.min(...cours), haut: Math.max(...cours), depuis: serie[0].d };
}

export interface VersementDividende {
  exercice: number;
  /** Brut par action, tel que la société le publie ; `null` : aucun dividende pour cet exercice. */
  brut: number | null;
  /** La date de paiement, lue sur le bulletin de la bourse ; absente quand le bulletin ne la porte pas. */
  payeLe?: string;
}

/** Le bulletin porte parfois un montant net de retenue, et une séance a déjà porté le dividende d'une autre société : une date ne vaut que si son montant est voisin du brut publié. */

/**
 * Pour chaque exercice dont la société publie le dividende : le brut (chiffre de l'émetteur) et la date de paiement, la PLUS ANCIENNE vue
 * sur un bulletin pour cet exercice. Le bulletin recopie un versement passé avec une date plus récente : la première apparition fait foi.
 * Du plus récent au plus ancien. Les figures vont du plus ancien au plus récent.
 */
export function dividendesVerses(figures: { year: number; dividendPerShare?: number | null }[], quotes: Quote[]): VersementDividende[] {
  const out: VersementDividende[] = [];
  for (const f of figures) {
    if (f.dividendPerShare === undefined) continue;
    const brut = f.dividendPerShare;
    let payeLe: string | undefined;
    if (brut != null && brut > 0) {
      for (const q of quotes) {
        if (q.dividendYear !== f.year || !q.dividendDate || !q.lastDividend) continue;
        const rapport = q.lastDividend / brut;
        if (rapport < RAPPORT_NET_MIN || rapport > RAPPORT_BRUT_MAX) continue;
        if (!payeLe || q.dividendDate < payeLe) payeLe = q.dividendDate;
      }
    }
    out.push({ exercice: f.year, brut, ...(payeLe ? { payeLe } : {}) });
  }
  return out.sort((a, b) => b.exercice - a.exercice);
}

/** Les jours écoulés depuis la dernière séance publiée : au-delà de ce seuil, la fiche le dit au lieu de laisser croire que le cours est celui d'aujourd'hui. */
export const SEUIL_SANS_SEANCE = 5;
