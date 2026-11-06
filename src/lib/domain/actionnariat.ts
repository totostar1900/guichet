/**
 * L'ACTIONNARIAT TOUJOURS TOTAL (6 novembre 2026) : la fiche d'une action et la page de la société montrent 100 % du capital.
 * `coreShareholders` ne porte que les actionnaires connus ; le reste s'écrit « Flottant et autres » (même règle partout).
 */
export type Part = { name: string; pct: number };

/** Les actionnaires connus, puis le reste du capital s'il dépasse 0,05 point. */
export function actionnariatTotal(parts: Part[], nomDuReste: string): Part[] {
  const total = parts.reduce((s, p) => s + p.pct, 0);
  const reste = Math.max(0, 100 - total);
  return reste > 0.05 ? [...parts, { name: nomDuReste, pct: reste }] : parts;
}
