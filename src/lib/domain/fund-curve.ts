import { fenetresDe, type FenetreId, type VariationMesuree } from "./fund-perf";

/**
 * La courbe d'un fonds, réduite à ce qui se dessine.
 *
 * Le dos d'une carte trace une ligne de 300 pixels sur 64, avec la première
 * date à gauche, la dernière à droite, et la dernière valeur en or. Les dates
 * du milieu ne paraissent nulle part : les transporter, c'est trois fois le
 * poids pour rien. Quarante-cinq fonds en points datés font quatre-vingt-six
 * kilo-octets ; en valeurs seules, vingt-six.
 *
 * D'où cette forme : deux dates, puis les valeurs dans l'ordre. Elle voyage
 * avec la page des fonds, si bien qu'une carte retournée dessine sa courbe
 * tout de suite, au lieu d'aller la demander au serveur et de faire attendre.
 */
export interface FundCurve {
  /** La première VL retenue : la date de gauche. */
  from: string;
  /** La dernière : la date de droite, et la valeur inscrite. */
  to: string;
  /** Les VL dans l'ordre, la plus récente en dernier. */
  ys: number[];
  /**
   * LA VL DE RÉFÉRENCE DE L'ANNÉE EN COURS, et sa date.
   *
   * Les fonds publient trois mesures au bulletin — la variation depuis la VL
   * précédente, les douze mois glissants, le depuis l'origine — et pas
   * l'année en cours. Elle se calcule, mais pas depuis la courbe affichée :
   * celle-ci ne transporte que deux dates et des valeurs, donc y chercher le
   * 1er janvier reviendrait à INTERPOLER, c'est-à-dire à inventer un chiffre.
   *
   * La référence est donc choisie ICI, où la série datée est complète : la
   * dernière VL publiée à la date du 1er janvier ou avant. Elle manque quand
   * la série ne remonte pas jusque-là, et c'est précisément le cas d'un fonds
   * né en cours d'année : l'écran affiche alors « — », ce qui est la règle de
   * la maison, plutôt qu'un pourcentage calculé sur une année incomplète.
   */
  ytdFrom?: number;
  ytdDate?: string;
  /**
   * LES FENÊTRES D'OBSERVATION, pour la même raison que la référence de
   * l'année : elles se choisissent sur la série datée complète, qui n'existe
   * qu'ici. La courbe affichée ne garde que les soixante dernières VL et ne
   * transporte pas leurs dates, donc y chercher la borne d'il y a trois ans
   * serait interpoler. Quatre nombres et quatre dates par fonds, soit moins
   * d'un kilo-octet pour les quarante-cinq.
   */
  fenetres?: Partial<Record<FenetreId, VariationMesuree>>;
}

/**
 * Les `points` dernières VL d'un fonds, dans l'ordre.
 *
 * Rien en dessous de deux : une ligne a besoin de deux points, et une carte
 * sans courbe vaut mieux qu'un trait qui ne dit rien.
 */
export function fundCurveFrom(navs: { navDate: string; nav: number }[], points = 60): FundCurve | undefined {
  const tout = [...navs].filter((n) => Number.isFinite(n.nav)).sort((a, b) => a.navDate.localeCompare(b.navDate));
  const kept = tout.slice(-points);
  if (kept.length < 2) return undefined;
  /* LA RÉFÉRENCE DE L'ANNÉE SE CHERCHE AVANT LA COUPE. On ne garde que les
     soixante dernières VL pour dessiner, mais le 1er janvier peut être plus
     loin : c'est la série entière qui le porte. */
  const premierJanvier = kept[kept.length - 1].navDate.slice(0, 4) + "-01-01";
  const base = [...tout].reverse().find((n) => n.navDate < premierJanvier);
  /* Les fenêtres aussi se mesurent sur « tout » et non sur « kept ». Un fonds
     trop jeune n'en a aucune : la clef ne part pas alors, plutôt qu'un objet
     vide répété quarante-cinq fois. */
  const fenetres = fenetresDe(tout, tout[tout.length - 1]);
  const avecFenetres = Object.keys(fenetres).length ? { fenetres } : {};
  return { from: kept[0].navDate, to: kept[kept.length - 1].navDate, ys: kept.map((n) => n.nav), ytdFrom: base?.nav, ytdDate: base?.navDate, ...avecFenetres };
}

/**
 * La performance depuis le 1er janvier, ou rien.
 *
 * Rien, et non zéro, dans les deux cas que la maison a tranchés : la série ne
 * remonte pas à l'an dernier (donc le fonds est né en cours d'année, ou nous
 * n'avons pas son historique), ou la VL de référence est nulle.
 */
export function fundYtdPct(curve: Pick<FundCurve, "ys" | "ytdFrom"> | undefined): number | null {
  if (!curve?.ytdFrom || !(curve.ytdFrom > 0)) return null;
  const derniere = curve.ys[curve.ys.length - 1];
  if (!Number.isFinite(derniere)) return null;
  return ((derniere - curve.ytdFrom) / curve.ytdFrom) * 100;
}
