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
export type RaisonSansDouzeMois = "jeune" | "cote-recente" | "lecture-courte";

/**
 * LA PREMIÈRE SÉANCE QUE LE DÉPÔT CONNAÎT. Avant elle, nous ne lisions pas
 * encore ; après, nous avons lu toutes les séances. Un fonds dont la série
 * commence nettement après cette date n'a donc pas été manqué : il n'était
 * pas à la cote.
 */
export const PREMIERE_SEANCE_LUE = "2023-03-03";

/**
 * POURQUOI UN DOUZE MOIS EST VIDE, ET POURQUOI « NOS VL » N'EST PAS TOUJOURS
 * LA BONNE RÉPONSE.
 *
 * Audit du 6 octobre 2026 : dix fonds sur quarante-cinq n'ont pas de douze
 * mois. Huit sont trop jeunes, dont TROIS à un jour près, nés le 26 septembre
 * 2025 avec une VL du 25 septembre 2026. Les deux autres ont 431 et 1 519
 * jours, et nous leur disions « VL lues sur moins d'un an », ce qui accuse
 * notre lecture.
 *
 * C'EST FAUX, ET VÉRIFIÉ DANS LES BULLETINS EUX-MÊMES. Le mot « KORI »
 * n'apparaît dans aucun bulletin avant le 30 octobre 2025, « PREMIUM » dans
 * aucun avant le 6 juillet 2026 : ces fonds existaient, ils n'étaient pas
 * cotés. Leur série commence quand la bourse a commencé à les publier, et il
 * n'y a rien à rattraper. Dire le contraire envoyait relire des séances qui
 * ne portent pas la ligne.
 *
 * Reste « lecture-courte » pour le vrai cas, celui d'un fonds coté avant
 * notre première séance et dont la série serait pourtant courte. Il est vide
 * aujourd'hui, et c'est une bonne nouvelle qu'on veut pouvoir constater.
 */
export function raisonSansDouzeMois(inceptionDate?: string, navDate?: string, premiereVL?: string): RaisonSansDouzeMois | undefined {
  return raisonSansFenetre(12, inceptionDate, navDate, premiereVL);
}

/**
 * LA MÊME QUESTION, POUR N'IMPORTE QUELLE FENÊTRE.
 *
 * La liste offre désormais trois mois, six mois, un an et trois ans : le
 * tiret peut tomber sur chacune, et pour les mêmes trois raisons. Les écrire
 * une fois par fenêtre serait quatre endroits où elles se contrediraient. La
 * seule chose qui change est la durée exigée.
 *
 * LE RECUL SE COMPTE EN MOIS DE CALENDRIER, exactement comme la mesure le
 * compte. Une moyenne de trente jours et demi paraissait suffire puisqu'on
 * ne décide pas d'un chiffre mais d'une phrase : elle a fait rater la borne
 * d'un an d'un quart de jour, et un fonds né il y a tout juste un an est
 * redevenu « trop jeune ». L'explication doit tomber au même endroit que le
 * chiffre qu'elle explique.
 */
export function raisonSansFenetre(mois: number, inceptionDate?: string, navDate?: string, premiereVL?: string): RaisonSansDouzeMois | undefined {
  if (!inceptionDate || !navDate) return undefined;
  const cible = new Date(parseDate(navDate));
  cible.setMonth(cible.getMonth() - mois);
  if (parseDate(inceptionDate).getTime() > cible.getTime()) return "jeune";
  /* Un mois de marge : un fonds coté la semaine où nous avons commencé n'est
     pas un fonds que nous aurions manqué. */
  if (premiereVL && Date.parse(premiereVL) > Date.parse(PREMIERE_SEANCE_LUE) + 31 * 86_400_000) return "cote-recente";
  return "lecture-courte";
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
export const fundYears = (f: Pick<Fund, "inceptionDate">, now: Date): number =>
  (parseDate(localIso(now)).getTime() - parseDate(f.inceptionDate).getTime()) / (365.25 * 24 * 3600 * 1000);

/**
 * Le taux constant qui, composé sur la durée écoulée, donnerait la
 * performance cumulée depuis l'origine. Rien en dessous de six mois : sur
 * un trimestre l'annualisation multiplie le bruit par quatre.
 */
export function fundAnnualPct(f: Pick<Fund, "inceptionDate" | "perfSinceInceptionPct">, now: Date): number | null {
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
/**
 * Au-delà d'un an, quarante-cinq jours et pas davantage.
 *
 * C'est la tolérance que l'ingestion applique déjà aux douze mois, et il n'y
 * a pas de raison de l'élargir sur trois ans : la borne est de toute façon
 * lointaine, l'élargir n'ajouterait que de l'imprécision à un chiffre qu'on
 * nomme « 3 ans ». Un quart d'année de jeu sous ce nom-là serait un abus.
 */
export const TOLERANCE_AN = 45;

/**
 * LES FENÊTRES D'OBSERVATION DE LA LISTE DES FONDS.
 *
 * Mesuré le 6 octobre 2026 sur les 28 fonds comparables aux trois fenêtres :
 * la corrélation des rangs entre un an et trois ans vaut 0,83, le
 * déplacement moyen est de 6,5 places sur 28, et VINGT FONDS SUR VINGT-HUIT
 * bougent d'au moins cinq places. Entre trois mois et un an la corrélation
 * tombe à 0,68. La fenêtre n'est donc pas un confort : elle change la
 * réponse pour sept fonds sur dix, et une liste qui n'en offre qu'une en
 * cache neuf autres.
 *
 * CINQ ANS N'EST PAS OFFERT, et ce n'est pas un oubli : la plus ancienne VL
 * du dépôt est du 5 janvier 2023, donc aucun fonds ne peut en porter avant
 * janvier 2028. Un bouton éteint le dit ; un curseur ne l'aurait pas pu.
 *
 * UN MOIS N'EST PAS OFFERT NON PLUS, ici. Quarante fonds sur quarante-cinq
 * publient une VL par semaine : un mois, c'est quatre points, et classer
 * quarante fonds sur quatre points, c'est classer du bruit. Sur la fiche
 * d'un fonds, où l'on regarde une courbe et non un rang, il garde son sens
 * et il y reste.
 */
export type FenetreId = "m3" | "m6" | "a1" | "a3";

export const FENETRES: { id: FenetreId; mois: number; tolerance: number; nom: string }[] = [
  { id: "m3", mois: 3, tolerance: TOLERANCE_TRIMESTRE, nom: "3 mois" },
  /* Vingt-huit jours sur six mois tient le même rapport que quatorze sur
     trois : c'est la règle de la tolérance, pas un chiffre rond. */
  { id: "m6", mois: 6, tolerance: 28, nom: "6 mois" },
  { id: "a1", mois: 12, tolerance: TOLERANCE_AN, nom: "1 an" },
  { id: "a3", mois: 36, tolerance: TOLERANCE_AN, nom: "3 ans" },
];

export const FENETRE_PAR_DEFAUT: FenetreId = "a1";
export const estFenetre = (v: string | null | undefined): v is FenetreId => FENETRES.some((f) => f.id === v);

/**
 * Les quatre fenêtres d'un fonds, mesurées sur sa série datée complète.
 *
 * Elles se calculent LÀ OÙ LA SÉRIE EST ENTIÈRE, et jamais depuis la courbe
 * qui voyage avec la page : celle-ci ne garde que les soixante dernières VL
 * et ne transporte pas leurs dates. Y chercher la borne d'il y a trois ans
 * reviendrait à interpoler, c'est-à-dire à inventer un chiffre.
 */
export function fenetresDe(history: PointDeVL[], to: PointDeVL): Partial<Record<FenetreId, VariationMesuree>> {
  const out: Partial<Record<FenetreId, VariationMesuree>> = {};
  for (const f of FENETRES) {
    const v = variationSurMois(history, to, f.mois, f.tolerance);
    if (v) out[f.id] = v;
  }
  return out;
}

/** Le rythme auquel un fonds publie réellement, lu sur ses dates. */
export type Rythme = "quotidienne" | "hebdomadaire" | "mensuelle" | "trimestrielle" | "?";

/**
 * LA FRÉQUENCE DÉCLARÉE N'EST PAS LA FRÉQUENCE OBSERVÉE, et le bulletin ne
 * permet pas de les distinguer.
 *
 * Le lecteur range un fonds dans la section où il paraît d'abord :
 * quotidiennes, hebdomadaires, mensuelles, trimestrielles. On a longtemps
 * lu cela comme son rythme de valorisation. C'est faux : ces sections sont
 * des HORIZONS DE COMPARAISON, et un fonds y reparaît si son gérant le
 * veut. La preuve est dans le bulletin du 25 septembre 2026, où FCP HARVEST
 * DIVERSIFIE, fonds quotidien, figure aussi au mensuel et au trimestriel :
 * un fonds valorisé chaque jour ne peut pas l'être chaque mois.
 *
 * Le rythme réel, lui, se lit sur l'écart entre deux VL successives, et
 * nous l'avons pour tout le monde. Mesuré le 6 octobre 2026 sur les vingt
 * dernières VL de chaque fonds : 36 sur 45 concordent avec leur
 * déclaration ; deux fonds dits mensuels publient chaque semaine, un fonds
 * dit quotidien publie chaque semaine, et deux fonds dits hebdomadaires ne
 * publient que tous les quarante-neuf jours.
 *
 * On rend « ? » en deçà de cinq écarts : trois dates ne font pas un rythme.
 */
export function rythmeObserve(history: PointDeVL[], sur = 20): Rythme {
  const dates = [...new Set(history.map((h) => h.navDate))].sort().slice(-sur);
  if (dates.length < 6) return "?";
  const ecarts = dates.slice(1).map((d, i) => (parseDate(d).getTime() - parseDate(dates[i]).getTime()) / 86_400_000).sort((a, b) => a - b);
  /* La médiane, et non la moyenne : une interruption d'été ou un bulletin
     manqué tirerait la moyenne sans rien dire du rythme ordinaire. */
  const m = ecarts[Math.floor(ecarts.length / 2)];
  if (m <= 3) return "quotidienne";
  if (m <= 10) return "hebdomadaire";
  if (m <= 45) return "mensuelle";
  return "trimestrielle";
}
