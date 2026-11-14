/**
 * LE DIVIDENDE « BRUT » SE LIT UNE SEULE FOIS (14 novembre 2026, décision du client : brut).
 *
 * Le tableau de capitalisation du bulletin porte « le dernier dividende ». Pour quatre sociétés (SOCAP, BANGE, SCGRE, SAF) il vaut exactement 89 % ou 90 % du brut que la
 * société publie dans ses chiffres clés : un montant net de retenue, que la fiche écrivait « dividende brut ». Une même fiche disait donc 433 FCFA d'un côté et 481 de l'autre.
 *
 * LA RÈGLE : quand la société publie un brut pour l'exercice que porte le bulletin, et que le montant du bulletin lui est voisin (le même versement, net ou brut), c'est le brut
 * publié qui s'écrit. Sinon, le montant du bulletin tel qu'il est. Aucun taux de retenue n'est supposé : on lit les deux chiffres, on ne calcule pas l'un à partir de l'autre.
 */
export const RAPPORT_NET_MIN = 0.85;
export const RAPPORT_BRUT_MAX = 1.02;

export interface DividendeLu {
  lastDividend?: number | null;
  dividendYear?: number | null;
}
export interface ExerciceDividende {
  year: number;
  dividendPerShare?: number | null;
}

/** Le brut à écrire pour ce que le bulletin porte, ou `undefined` quand le bulletin ne porte aucun dividende. */
export function dividendeBrut(lu: DividendeLu, exercices: ExerciceDividende[] | undefined): number | undefined {
  const bulletin = lu.lastDividend;
  if (bulletin == null) return undefined;
  const voisin = (brut: number) => brut > 0 && bulletin / brut >= RAPPORT_NET_MIN && bulletin / brut <= RAPPORT_BRUT_MAX;
  const publies = (exercices ?? []).filter((f): f is { year: number; dividendPerShare: number } => typeof f.dividendPerShare === "number" && f.dividendPerShare > 0);
  /* L'exercice que le bulletin nomme ; sans lui, le plus récent qui en a un. */
  const f = lu.dividendYear != null ? publies.find((x) => x.year === lu.dividendYear) : [...publies].sort((a, b) => b.year - a.year)[0];
  return f && voisin(f.dividendPerShare) ? f.dividendPerShare : bulletin;
}
