import type { Country } from "@/lib/domain/types";

/**
 * Le contrat entre la page et la figure, et les deux règles du filigrane.
 *
 * Ces types et ces deux fonctions vivaient dans les composants de courbe, qui
 * étaient deux. Ils n'en sont plus qu'un, et ce qui les traverse n'appartient
 * à aucun : la page serveur façonne ces objets, la figure cliente les dessine,
 * et trois autres composants lisent les mêmes. Le contrat se tient donc à
 * part, et les règles avec lui, là où un test les atteint sans monter un rendu.
 *
 * Module sans dépendance d'exécution : il part dans le paquet du navigateur
 * avec la figure.
 */

export interface PointCourbe {
  id: string;
  /** La vie restante en années : l'abscisse. */
  annees: number;
  /** Cette vie restante mise en mots, « 11 mois », « 1,5 ans ». */
  mot: string;
  pct: number;
  origine: string;
  hypotheses: string[];
  /** La durée annoncée, qui nomme la ligne sans la dater. */
  etiquette: string;
  abondement: boolean;
  mince: boolean;
  on: string;
  code?: string;
  /** L'âge de la séance au jour d'observation : une courbe ne vaut pas mieux que son point le plus vieux. */
  age: number;
  /** La ligne était-elle remboursée au jour d'observation ? */
  echue?: boolean;
  /** Le coupon annuel en % du nominal, zéro pour un bon : il sert au dépouillement. */
  coupon?: number;
}

export interface CourbePays {
  pays: Country;
  points: PointCourbe[];
  plusVieux: number;
  derniere: string;
}

export interface Fenetre {
  jours: number;
  /** Ce que la profondeur s'appelle : « 3 mois », « 2 ans ». */
  mot: string;
  pays: CourbePays[];
}

/** Le relevé de la BEAC, tel que la page le donne. */
export interface SerieBeacVue {
  pays: string;
  points: { annees: number; pct: number }[];
  /** Le mois d'arrêté de CETTE courbe : chaque Trésor a la sienne, et deux Trésors ne sont pas toujours à jour ensemble. */
  mois?: string;
  /** L'adresse de sa feuille, quand c'en est une. */
  source?: string;
}

export interface ReleveBeacVu {
  /** Le numéro du bulletin mensuel : absent quand le relevé vient des feuilles par Trésor. */
  numero?: number;
  /** Le mois d'arrêté le plus récent, « 2026-07 » : c'est la date de valeur de la courbe. */
  mois: string;
  source: string;
  releveLe?: string;
  series: SerieBeacVue[];
}

/** Les points de la base, tels que le dépôt les rend : la seule forme que ce module lit. */
export interface PointBeacDeLaBase {
  mois: string;
  pays: string;
  annees: number;
  taux: number;
  sourceChemin?: string;
}

/**
 * LE RELEVÉ QUE LA BASE PORTE : POUR CHAQUE TRÉSOR, SA COURBE LA PLUS RÉCENTE.
 *
 * La figure lisait une table vide puis une constante figée à juillet 2026, alors
 * que « beac_yield_curves » porte onze ans de feuilles. Chaque Trésor garde son
 * propre mois : un Trésor sans feuille ce mois-ci ne prête pas la sienne à un
 * autre, et la date de valeur est écrite sous chaque trait.
 */
export function releveDeLaBase(points: PointBeacDeLaBase[]): ReleveBeacVu | undefined {
  const dernier = new Map<string, string>();
  for (const p of points) if (!dernier.has(p.pays) || p.mois > dernier.get(p.pays)!) dernier.set(p.pays, p.mois);
  if (!dernier.size) return undefined;
  const series: SerieBeacVue[] = [...dernier].map(([pays, mois]) => {
    const dumois = points.filter((p) => p.pays === pays && p.mois === mois);
    const source = dumois.find((p) => p.sourceChemin && /^https?:\/\//.test(p.sourceChemin))?.sourceChemin;
    return { pays, mois: mois.slice(0, 7), source, points: dumois.map((p) => ({ annees: p.annees, pct: p.taux })).sort((a, b) => a.annees - b.annees) };
  });
  const recent = series.reduce((a, s) => (s.mois! > a ? s.mois! : a), "");
  return { mois: recent, source: series.find((s) => s.source)?.source ?? "", series };
}

/**
 * La courbe de la BEAC qui se pose derrière celle d'un Trésor, s'il y en a une.
 *
 * Elle ne paraît que devant un seul Trésor : les deux courbes ne mesurent pas
 * la même chose, et ce qu'on regarde en les superposant est l'écart d'un Trésor
 * avec lui-même. En vue d'ensemble il n'y a pas de Trésor affiché, et six
 * écarts à la fois ne se lisent pas.
 *
 * Fonction à part, et non condition enfouie dans un rendu : un rendu statique
 * reste sur la vue d'ensemble, et c'est justement le cas d'un Trésor choisi qui
 * a échappé à deux relectures.
 */
export function serieBeacDe(choix: string, releve?: { series: { pays: string; points: { annees: number; pct: number }[] }[] }) {
  if (choix === "tous" || choix === "cemac") return undefined;
  return releve?.series.find((s) => s.pays === choix);
}

/** L'âge, en mois pleins, d'un mois « AAAA-MM » à une date « AAAA-MM-JJ ». */
const ageEnMois = (mois: string, aujourdhui: string) => (Number(aujourdhui.slice(0, 4)) - Number(mois.slice(0, 4))) * 12 + (Number(aujourdhui.slice(5, 7)) - Number(mois.slice(5, 7)));

/**
 * LES COURBES DE LA BEAC QUI SE POSENT DERRIÈRE LA NÔTRE : UN TRÉSOR, OU TOUS (3 AU PLUS).
 *
 * Elles ne se posaient que devant un seul Trésor, au motif que six écarts à la
 * fois ne se lisent pas. La BEAC n'en publie que trois : en vue d'ensemble elles
 * se posent donc toutes, en pointillé gris, chacune sous son nom.
 * La vue de la zone n'en a pas : ses feuilles reprennent celles des Trésors.
 *
 * En vue d'ensemble, une courbe de plus de dix-huit mois n'est plus un repère mais
 * de l'histoire (le Tchad, publié en 2016-2017) : elle ne se pose pas. Pour un
 * Trésor choisi, elle se pose et la figure dit son âge.
 */
export function seriesBeacDe(choix: string, releve: ReleveBeacVu | undefined, aujourdhui: string, ageMax = 18): SerieBeacVue[] {
  if (!releve || choix === "cemac") return [];
  if (choix !== "tous") return releve.series.filter((s) => s.pays === choix);
  return releve.series.filter((s) => !s.mois || ageEnMois(s.mois, aujourdhui) <= ageMax).slice(0, 3);
}

/**
 * Le trait de la BEAC, coupé au cadre et rangé dans l'ordre des durées.
 *
 * Coupé, parce que le cadre est celui de nos observations : elle va jusqu'à
 * quinze ans quand nous nous arrêtons à sept, et étirer l'axe jusqu'à elle
 * revenait à dessiner huit ans d'extrapolation de notre propre courbe.
 *
 * Rangé, parce qu'une polyligne se trace dans l'ordre de ses points. Une série
 * arrivée en désordre n'y dessine pas une courbe mais un aller-retour, et la
 * semence arrivait en désordre : Object.entries rend les clefs entières avant
 * les fractionnaires. Le tracé ne s'en remet donc à personne.
 */
export const coupeAu = <T extends { annees: number }>(pts: T[], borne: number): T[] =>
  pts.filter((q) => q.annees <= borne + 1e-9).sort((a, b) => a.annees - b.annees);
