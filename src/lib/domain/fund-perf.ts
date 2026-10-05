import type { Offer } from "./types";
import { parseDate } from "../finance";
import { localIso } from "../format";

export type Fund = NonNullable<Offer["fund"]>;

/**
 * POURQUOI LE DOUZE MOIS EST VIDE, QUAND IL L'EST.
 *
 * Deux raisons, que l'écran confondait sous un même tiret. Le fonds est trop
 * jeune : il n'y a pas de douze mois à mesurer, et c'est vrai jusqu'à son
 * anniversaire. Ou le fonds est assez vieux et ce sont NOS valeurs
 * liquidatives qui ne remontent pas assez loin : le chiffre existe, nous ne
 * l'avons pas encore lu, et le dire vaut mieux que de laisser croire à un
 * fonds de six mois.
 *
 * Mesuré sur la production le 5 octobre 2026 : dix fonds sans douze mois.
 * Huit sont trop jeunes, dont trois à UN JOUR près, nés le 26 septembre 2025
 * avec une VL du 25 septembre 2026. Les deux autres ont 1 519 et 417 jours,
 * et nous n'en lisons que 77 et 329.
 */
export type RaisonSansDouzeMois = "jeune" | "lecture-courte";

export function raisonSansDouzeMois(inceptionDate?: string, navDate?: string): RaisonSansDouzeMois | undefined {
  if (!inceptionDate || !navDate) return undefined;
  return (Date.parse(navDate) - Date.parse(inceptionDate)) / 86_400_000 < 365 ? "jeune" : "lecture-courte";
}

/**
 * Les deux performances d'un fonds, qui ne mesurent pas la même chose.
 *
 * « Sur 12 mois » est une variation, pas un rendement annualisé : la VL
 * d'il y a un an comparée à la dernière. Sur douze mois les deux coïncident
 * presque, et la nuance n'en est pas moins réelle, car la VL de référence est
 * la plus proche publiée avant la date anniversaire, à quarante-cinq jours
 * près : le chiffre couvre en pratique de 365 à 410 jours.
 *
 * L'annualisé depuis l'origine, lui, ramène toute la vie du fonds à un taux
 * constant. C'est le seul des deux qui compare un fonds né l'an dernier avec
 * un fonds né en 2019.
 */
export const fundYears = (f: Fund, now: Date): number =>
  (parseDate(localIso(now)).getTime() - parseDate(f.inceptionDate).getTime()) / (365.25 * 24 * 3600 * 1000);

/**
 * Le taux constant qui, composé sur la durée écoulée, donnerait la
 * performance cumulée depuis l'origine. Rien en dessous de six mois : sur
 * un trimestre l'annualisation multiplie le bruit par quatre.
 */
export function fundAnnualPct(f: Fund, now: Date): number | null {
  const years = fundYears(f, now);
  if (!(years > 0.5) || f.perfSinceInceptionPct == null) return null;
  return (Math.pow(1 + f.perfSinceInceptionPct / 100, 1 / years) - 1) * 100;
}
