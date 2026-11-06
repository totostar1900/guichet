import { capitalisation, coursSurValeurComptable, rapportCoursBenefice, rendementDividendePct, rotationDuFlottantPct } from "@/lib/finance";

/**
 * LA SÉRIE DE VALORISATION D'UNE ACTION, SÉANCE PAR SÉANCE (fiche, onglet Émetteur, 9 novembre 2026).
 *
 * Des cotations (cours, titres, titres flottants, valeur échangée de chaque séance) et des comptes par exercice (résultat net, capitaux propres, dividende), cette fonction
 * tire la capitalisation, la capitalisation flottante, le rapport cours / bénéfice, le cours / valeur comptable et le rendement du dividende de chaque séance. Les calculs
 * sont ceux de `finance.ts` ; ce fichier ne fait que choisir, pour chaque séance, l'exercice qui compte. Pur : il ne lit rien, il est partagé avec le navigateur.
 *
 * QUAND L'EXERCICE N ENTRE EN VIGUEUR (décision du client, 9 novembre 2026), DANS L'ORDRE : la date de publication EXISTANTE dans la donnée (`publieLe`), sinon la date
 * SAISIE PAR LE DESK (`publieLeDesk`), sinon LE 1ER AVRIL DE N+1. Avant, c'est l'exercice précédent ; avant le premier exercice connu, les rapports n'existent pas
 * (« null »). Une date mal écrite est ignorée : on passe au rang suivant.
 */
export interface CotationDeValorisation {
  d: string;
  c: number;
  titres?: number | null;
  flottants?: number | null;
  /** Valeur échangée ce jour-là, en FCFA. */
  valeur?: number | null;
}

export interface ComptesDeValorisation {
  year: number;
  netIncome: number;
  equity: number;
  dividendPerShare?: number | null;
  publieLe?: string | null;
  publieLeDesk?: string | null;
}

export interface PointDeValorisation {
  d: string;
  /** Capitalisation, en FCFA. */
  cap: number;
  capFlottante: number | null;
  /** Valeur échangée ce jour-là, en FCFA. */
  valeur: number;
  per: number | null;
  pb: number | null;
  rendement: number | null;
  /** L'exercice qui compte ce jour-là. */
  exercice: number | null;
  /** L'exercice dont vient le dividende du rendement : le dernier qui en a un, pas forcément « exercice ». */
  exerciceDuDividende: number | null;
}

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

/** Le jour où l'exercice N entre en vigueur à défaut de toute date : le 1er avril de N+1. */
export const entreeParDefaut = (annee: number): string => `${annee + 1}-04-01`;

/** Le jour où cet exercice entre en vigueur : la date existante, sinon celle du desk, sinon le 1er avril de N+1. */
export function dateDEntree(f: { year: number; publieLe?: string | null; publieLeDesk?: string | null }): string {
  if (f.publieLe && JOUR.test(f.publieLe)) return f.publieLe;
  if (f.publieLeDesk && JOUR.test(f.publieLeDesk)) return f.publieLeDesk;
  return entreeParDefaut(f.year);
}

/** L'exercice le plus récent déjà en vigueur à cette date, ou `undefined`. */
export function exerciceEnVigueur<T extends { year: number; publieLe?: string | null; publieLeDesk?: string | null }>(comptes: T[], date: string): T | undefined {
  return [...comptes].filter((f) => dateDEntree(f) <= date).sort((a, b) => b.year - a.year)[0];
}

/**
 * LE DIVIDENDE DE RÉFÉRENCE D'UN JOUR (6 novembre 2026) : celui du dernier exercice en vigueur QUI EN A UN.
 * Quand l'exercice le plus récent n'a pas de dividende (« non distribué », ou pas encore publié), le rendement ne s'efface pas : il garde le dernier dividende connu, et
 * `exerciceDuDividende` dit de quel exercice il vient, pour que l'écran l'écrive. La page de La Régionale affichait « — » et des graduations toutes à 0 pour son exercice 2024.
 */
export function dividendeDeReference<T extends { year: number; dividendPerShare?: number | null; publieLe?: string | null; publieLeDesk?: string | null }>(comptes: T[], date: string): T | undefined {
  return [...comptes].filter((f) => dateDEntree(f) <= date && typeof f.dividendPerShare === "number").sort((a, b) => b.year - a.year)[0];
}

export function serieDeValorisation(cotations: CotationDeValorisation[], comptes: ComptesDeValorisation[], repli: { titres: number; flottants: number | null }): PointDeValorisation[] {
  return cotations.map((q) => {
    const titres = q.titres ?? repli.titres;
    const flottants = q.flottants ?? repli.flottants;
    const cap = capitalisation(q.c, titres);
    const f = exerciceEnVigueur(comptes, q.d);
    const g = dividendeDeReference(comptes, q.d);
    return {
      d: q.d,
      cap,
      capFlottante: flottants != null ? capitalisation(q.c, flottants) : null,
      valeur: q.valeur ?? 0,
      per: f ? rapportCoursBenefice(cap, f.netIncome) : null,
      pb: f ? coursSurValeurComptable(cap, f.equity) : null,
      rendement: g ? rendementDividendePct(g.dividendPerShare, q.c) : null,
      exercice: f?.year ?? null,
      exerciceDuDividende: g?.year ?? null,
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

/**
 * LA ROTATION DU FLOTTANT, SUR UNE PÉRIODE ET MOIS PAR MOIS (9 novembre 2026).
 *
 * Sur la période : la valeur échangée de toutes les séances ÷ la capitalisation flottante de la dernière. Mois par mois : la valeur échangée du mois ÷ la capitalisation
 * flottante de sa dernière séance, pour voir si le titre se négocie plus ou moins qu'avant. Un mois sans flottant connu rend `null`.
 */
export function rotationSurPeriode(serie: PointDeValorisation[]): { valeur: number; rotationPct: number | null } {
  const valeur = serie.reduce((s, p) => s + p.valeur, 0);
  const fin = serie[serie.length - 1];
  return { valeur, rotationPct: fin?.capFlottante != null ? rotationDuFlottantPct(valeur, fin.capFlottante) : null };
}

export function rotationParMois(serie: PointDeValorisation[]): { mois: string; valeur: number; rotationPct: number | null }[] {
  const out: { mois: string; valeur: number; fin: PointDeValorisation }[] = [];
  for (const p of serie) {
    const mois = p.d.slice(0, 7);
    const dernier = out[out.length - 1];
    if (dernier && dernier.mois === mois) {
      dernier.valeur += p.valeur;
      dernier.fin = p;
    } else out.push({ mois, valeur: p.valeur, fin: p });
  }
  return out.map((m) => ({ mois: m.mois, valeur: m.valeur, rotationPct: m.fin.capFlottante != null ? rotationDuFlottantPct(m.valeur, m.fin.capFlottante) : null }));
}
