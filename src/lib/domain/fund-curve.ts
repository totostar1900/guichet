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
}

/**
 * Les `points` dernières VL d'un fonds, dans l'ordre.
 *
 * Rien en dessous de deux : une ligne a besoin de deux points, et une carte
 * sans courbe vaut mieux qu'un trait qui ne dit rien.
 */
export function fundCurveFrom(navs: { navDate: string; nav: number }[], points = 60): FundCurve | undefined {
  const kept = [...navs]
    .filter((n) => Number.isFinite(n.nav))
    .sort((a, b) => a.navDate.localeCompare(b.navDate))
    .slice(-points);
  if (kept.length < 2) return undefined;
  return { from: kept[0].navDate, to: kept[kept.length - 1].navDate, ys: kept.map((n) => n.nav) };
}
