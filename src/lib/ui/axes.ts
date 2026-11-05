/**
 * LES GRADUATIONS D'UN AXE : des valeurs rondes, en nombre voulu, qui encadrent la série (9 novembre 2026).
 *
 * `ticksPropres(0, 621, 3)` rend [0, 400, 800] : le pas est un 1, 2 ou 5 fois une puissance de dix, et la dernière graduation couvre le maximum.
 * `bornesPropres` rend les bornes d'un axe dont le minimum n'est pas zéro (un cours) : elles encadrent aussi la série.
 */
export function pasPropre(etendue: number, n: number): number {
  if (!(etendue > 0)) return 1;
  const brut = etendue / Math.max(1, n - 1);
  const p = Math.pow(10, Math.floor(Math.log10(brut)));
  const f = brut / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export function ticksPropres(min: number, max: number, n = 3): number[] {
  if (max <= min) return [min];
  const pas = pasPropre(max - min, n);
  const debut = Math.floor(min / pas) * pas;
  const out: number[] = [];
  for (let v = debut; v < max + pas; v += pas) {
    out.push(Math.round(v * 1e6) / 1e6);
    if (v >= max) break;
  }
  return out;
}

/**
 * LE MOIS D'UN AXE DE TEMPS, AVEC SON ANNÉE QUAND ELLE CHANGE (9 novembre 2026).
 *
 * « juil. », « août », « sept. » sans année ne disent pas de quelle année on parle. L'étiquette porte l'année au premier repère et à chaque janvier : « juil. 2025 »,
 * « août », « sept. », … « janv. 2026 ». Les autres mois restent courts, pour que douze repères tiennent sur un téléphone.
 */
export function motDeMois(iso: string, avecAnnee: boolean): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", avecAnnee ? { month: "short", year: "numeric" } : { month: "short" });
}
