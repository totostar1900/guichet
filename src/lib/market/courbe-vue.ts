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
export interface ReleveBeacVu {
  numero: number;
  /** Le mois d'arrêté, « 2026-07 » : c'est la date de valeur de la courbe. */
  mois: string;
  source: string;
  releveLe: string;
  series: { pays: string; points: { annees: number; pct: number }[] }[];
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
