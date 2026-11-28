/** Un facial se lit comme le marché le dit : 500 M, 2 Md. Module sans dépendance, lu du serveur comme du navigateur. */
export const facialLisible = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`;
  if (a >= 1e6) return `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  return Math.round(n).toLocaleString("fr-FR");
};
