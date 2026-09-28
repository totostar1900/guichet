import type { Country } from "@/lib/domain/types";

/**
 * Une couleur par Trésor, tenue en un seul endroit.
 *
 * Elle sert sur la courbe, dans les tableaux, sur les barres d'exécution et
 * dans les pastilles de légende. Une couleur suit un émetteur et jamais un
 * rang : si le Congo passe en tête d'un classement, il ne change pas de
 * couleur, sans quoi le lecteur croit avoir changé de pays.
 *
 * Elle vivait dans le composant de la courbe, qui est du rendu ; un module de
 * données la rend lisible depuis un composant client sans entraîner la moitié
 * du serveur avec elle.
 */
export const COUNTRY_COLOR: Record<Country, string> = {
  Cameroun: "#0b2545",
  Congo: "#0e7490",
  Gabon: "#15803d",
  Tchad: "#a16207",
  "Guinée éq.": "#be185d",
  RCA: "#6d28d9",
};

/** La zone prise ensemble : l'or de la maison, pour ne se confondre avec aucun Trésor. */
export const CEMAC_COLOR = "#b8860b";
