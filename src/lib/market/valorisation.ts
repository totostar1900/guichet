import { capitalisation, coursSurValeurComptable, rapportCoursBenefice, rendementDividendePct } from "@/lib/finance";

/**
 * LA SÉRIE DE VALORISATION D'UNE ACTION, SÉANCE PAR SÉANCE (fiche, onglet Émetteur, 9 novembre 2026).
 *
 * Des cotations (cours, titres, titres flottants de chaque séance) et des comptes par exercice (résultat net, capitaux propres, dividende), cette fonction tire la
 * capitalisation, la capitalisation flottante, le rapport cours / bénéfice, le cours / valeur comptable et le rendement du dividende de chaque séance. Les calculs
 * sont ceux de `finance.ts` ; ce fichier ne fait que choisir, pour chaque séance, l'exercice qui compte.
 *
 * L'EXERCICE N COMPTE À PARTIR DU 1ER JUILLET DE N+1 (hypothèse du 9 novembre 2026, après l'assemblée générale : nos données n'ont pas de date de publication des
 * comptes). Avant, c'est l'exercice précédent ; avant le premier exercice connu, les rapports n'existent pas (« null »). Pur : il ne lit rien, il est partagé avec le
 * navigateur.
 */
export interface CotationDeValorisation {
  d: string;
  c: number;
  titres?: number | null;
  flottants?: number | null;
}

export interface ComptesDeValorisation {
  year: number;
  netIncome: number;
  equity: number;
  dividendPerShare?: number | null;
}

export interface PointDeValorisation {
  d: string;
  /** Capitalisation, en FCFA. */
  cap: number;
  capFlottante: number | null;
  per: number | null;
  pb: number | null;
  rendement: number | null;
  /** L'exercice qui compte ce jour-là. */
  exercice: number | null;
}

/** Le jour où l'exercice N entre en vigueur : le 1er juillet de N+1. */
export const entreeEnVigueur = (annee: number): string => `${annee + 1}-07-01`;

/** L'exercice le plus récent déjà en vigueur à cette date, ou `undefined`. */
export function exerciceEnVigueur<T extends { year: number }>(comptes: T[], date: string): T | undefined {
  return [...comptes].filter((f) => entreeEnVigueur(f.year) <= date).sort((a, b) => b.year - a.year)[0];
}

export function serieDeValorisation(cotations: CotationDeValorisation[], comptes: ComptesDeValorisation[], repli: { titres: number; flottants: number | null }): PointDeValorisation[] {
  return cotations.map((q) => {
    const titres = q.titres ?? repli.titres;
    const flottants = q.flottants ?? repli.flottants;
    const cap = capitalisation(q.c, titres);
    const f = exerciceEnVigueur(comptes, q.d);
    return {
      d: q.d,
      cap,
      capFlottante: flottants != null ? capitalisation(q.c, flottants) : null,
      per: f ? rapportCoursBenefice(cap, f.netIncome) : null,
      pb: f ? coursSurValeurComptable(cap, f.equity) : null,
      rendement: f ? rendementDividendePct(f.dividendPerShare, q.c) : null,
      exercice: f?.year ?? null,
    };
  });
}

/** Les jours où l'exercice qui compte change, dans la fenêtre : de quoi marquer les paliers. */
export function paliersDExercice(serie: PointDeValorisation[]): { d: string; exercice: number }[] {
  const out: { d: string; exercice: number }[] = [];
  serie.forEach((p, i) => {
    if (i > 0 && p.exercice !== null && p.exercice !== serie[i - 1].exercice) out.push({ d: p.d, exercice: p.exercice });
  });
  return out;
}
