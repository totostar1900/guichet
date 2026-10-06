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

/** Ce qu'il faut d'une valeur liquidative pour mesurer une variation. */
export interface PointDeVL {
  navDate: string;
  nav: number;
}

export interface VariationMesuree {
  pct: number;
  /** La VL de départ réellement retenue, qui n'est jamais exactement à la date voulue. */
  depuis: string;
}

/**
 * LA VARIATION ENTRE UNE VL ET CELLE D'IL Y A N MOIS, mesurée sur notre
 * propre série.
 *
 * POURQUOI NOUS LA CALCULONS NOUS-MÊMES. Le bulletin publie sa table des
 * OPCVM quatre fois, par horizon de comparaison, et un fonds n'y reparaît
 * que si sa société de gestion l'a voulu. Mesuré le 6 octobre 2026 : sur
 * quarante-six fonds, ONZE portent une variation mensuelle, et ces onze
 * appartiennent à deux maisons sur douze, Harvest et ESS. Les trente-cinq
 * autres affichaient un tiret, non parce que le chiffre n'existe pas mais
 * parce que leur gérant ne l'a pas fait imprimer. Notre série, elle, vaut
 * pour tout le monde : trente des trente-cinq portent plus de dix VL.
 *
 * LA DATE DE DÉPART N'EST JAMAIS EXACTE, et c'est la règle déjà posée pour
 * le douze mois : on prend la dernière VL publiée AVANT la date visée, et
 * on refuse si elle est trop ancienne. La tolérance est le prix de
 * l'honnêteté : au-delà, la fenêtre s'étire en silence et « un mois »
 * finirait par en couvrir deux.
 */
export function variationSurMois(history: PointDeVL[], to: PointDeVL, mois: number, tolerance: number): VariationMesuree | undefined {
  if (!to.nav) return undefined;
  const cible = new Date(parseDate(to.navDate));
  cible.setMonth(cible.getMonth() - mois);
  const t = localIso(cible);
  const avant = history.filter((h) => h.navDate <= t && h.nav > 0).sort((a, b) => b.navDate.localeCompare(a.navDate))[0];
  if (!avant) return undefined;
  if ((parseDate(t).getTime() - parseDate(avant.navDate).getTime()) / 86_400_000 > tolerance) return undefined;
  return { pct: (to.nav / avant.nav - 1) * 100, depuis: avant.navDate };
}

/**
 * Les tolérances, et pourquoi elles ne sont pas proportionnelles.
 *
 * Un fonds hebdomadaire publie tous les sept jours : sa VL la plus proche
 * avant la date visée a donc au plus six jours de retard, et sept suffisent
 * à la couvrir exactement. Sur le trimestre on en accorde quatorze, parce
 * qu'une quinzaine d'écart sur quatre-vingt-dix jours ne déplace pas le sens
 * du chiffre, là où elle le déplacerait sur trente.
 */
export const TOLERANCE_MOIS = 7;
export const TOLERANCE_TRIMESTRE = 14;
