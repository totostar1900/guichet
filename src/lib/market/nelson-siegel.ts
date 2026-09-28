/**
 * Nelson-Siegel, ajusté sur ce que la CEMAC publie.
 *
 * Une courbe des taux doit donner un taux à n'importe quelle durée, y compris
 * une que personne n'a jamais adjugée. Relier les points observés par des
 * segments ne le fait pas : entre six mois et trois ans, un segment affirme une
 * droite là où la théorie et l'observation donnent une courbe.
 *
 *   y(τ) = β₀ + β₁·f₁(τ) + β₂·f₂(τ)
 *   f₁ = (1 − e^{−τ/λ}) / (τ/λ)          la pente, qui s'éteint avec la durée
 *   f₂ = f₁ − e^{−τ/λ}                    la courbure, maximale vers τ ≈ 1,79 λ
 *
 * β₀ est le niveau long, β₀+β₁ le taux instantané, β₂ le creux ou la bosse du
 * milieu, λ l'endroit où elle se place.
 *
 * Le point qui rend la chose praticable : à λ fixé, le modèle est LINÉAIRE en
 * β₀, β₁, β₂. On résout donc par moindres carrés pondérés exacts, en 3×3, sans
 * optimiseur ni point de départ à deviner, et on balaie λ sur une grille. C'est
 * la méthode des banques centrales, et elle ne peut pas diverger.
 *
 * Module sans dépendance : il part dans le paquet du navigateur avec la figure.
 */

export interface Obs {
  /** La durée, en années. Strictement positive. */
  annees: number;
  /** Le taux, en pour cent. */
  pct: number;
  /** Le poids de l'observation. Un par défaut. */
  poids?: number;
}

/** Vrai quand l'ajustement a abouti : le refus porte sa raison, pas un silence. */
export const abouti = (r: Ajustement | { refus: Refus }): r is Ajustement => !("refus" in r);

export interface Ajustement {
  b0: number;
  b1: number;
  b2: number;
  lambda: number;
  /** Le nombre d'observations retenues. */
  n: number;
  /** L'écart quadratique moyen des résidus, en points de base. */
  rmsePb: number;
  /** Le taux ajusté à une durée quelconque, en pour cent. */
  taux: (annees: number) => number;
  /**
   * Le demi-intervalle de confiance à 95 %, en pour cent.
   *
   * Il s'élargit là où l'on extrapole, et c'est le but : une courbe ajustée sur
   * six points ne vaut pas la même chose à un an, où il y en a trois, et à dix,
   * où il n'y en a aucun.
   */
  bande: (annees: number) => number;
  /** Les durées réellement observées, bornes de ce qui n'est pas extrapolé. */
  borne: { court: number; long: number };
}

/** Les deux facteurs du modèle, à λ donné. */
export function facteurs(annees: number, lambda: number): { f1: number; f2: number } {
  const k = annees / lambda;
  // La limite en zéro vaut 1 et 0 ; le développement évite le 0/0 numérique.
  if (k < 1e-8) return { f1: 1, f2: 0 };
  const e = Math.exp(-k);
  const f1 = (1 - e) / k;
  return { f1, f2: f1 - e };
}

/**
 * Résout un système 3×3 symétrique défini positif, et rend aussi son inverse.
 *
 * L'inverse sert à la bande de confiance : la variance du taux ajusté à une
 * durée est σ²·x(τ)ᵀ(XᵀWX)⁻¹x(τ). Sans elle on publierait un chiffre sans dire
 * combien il tient.
 */
function resoudre3(A: number[][], b: number[]): { x: number[]; inv: number[][] } | undefined {
  const M = A.map((l, i) => [...l, ...[0, 1, 2].map((j) => (i === j ? 1 : 0)), b[i]]);
  for (let c = 0; c < 3; c++) {
    let pivot = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    if (Math.abs(M[pivot][c]) < 1e-12) return undefined;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    const p = M[c][c];
    for (let j = c; j < 7; j++) M[c][j] /= p;
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (!f) continue;
      for (let j = c; j < 7; j++) M[r][j] -= f * M[c][j];
    }
  }
  return { x: [M[0][6], M[1][6], M[2][6]], inv: [0, 1, 2].map((i) => [M[i][3], M[i][4], M[i][5]]) };
}

/** Les β, à λ fixé, par moindres carrés pondérés. Exact, sans itération. */
function betasA(obs: Obs[], lambda: number) {
  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (const o of obs) {
    const { f1, f2 } = facteurs(o.annees, lambda);
    const x = [1, f1, f2];
    const w = o.poids ?? 1;
    for (let i = 0; i < 3; i++) {
      b[i] += w * x[i] * o.pct;
      for (let j = 0; j < 3; j++) A[i][j] += w * x[i] * x[j];
    }
  }
  const sol = resoudre3(A, b);
  if (!sol) return undefined;
  const [b0, b1, b2] = sol.x;
  let ssr = 0;
  let poids = 0;
  for (const o of obs) {
    const { f1, f2 } = facteurs(o.annees, lambda);
    const r = o.pct - (b0 + b1 * f1 + b2 * f2);
    const w = o.poids ?? 1;
    ssr += w * r * r;
    poids += w;
  }
  return { b0, b1, b2, ssr, poids, inv: sol.inv };
}

/**
 * La grille de λ, bornée par ce que les durées observées permettent de voir.
 *
 * La courbure du modèle est maximale à τ ≈ 1,79 λ. Un λ qui place cette bosse
 * hors de l'intervalle observé n'est pas identifiable : les deux facteurs y
 * deviennent presque colinéaires, et β₀ et β₁ divergent en sens contraire sans
 * que la courbe bouge. Mesuré sur nos données avec une grille libre jusqu'à six
 * ans : β₀ = -628 pour le Gabon, β₀ = -821 pour le Congo.
 *
 * On balaie donc l'intervalle qui garde la bosse entre la plus courte et la
 * plus longue durée observée, avec un peu de marge de part et d'autre.
 */
const BOSSE = 1.79;
function grilleDe(annees: number[]): number[] {
  const court = Math.min(...annees);
  const long = Math.max(...annees);
  const lo = Math.max(0.05, court / BOSSE / 1.5);
  const hi = Math.max(lo * 1.2, (long / BOSSE) * 1.5);
  return Array.from({ length: 80 }, (_, i) => lo * Math.pow(hi / lo, i / 79));
}

/**
 * Le monde dans lequel un coefficient a un sens.
 *
 * Un niveau long de -628 pour cent ou un taux instantané de -9 pour cent ne
 * sont pas des résultats, ce sont des symptômes. Les refuser vaut mieux que les
 * afficher : « non identifié » invite à regarder les données, un chiffre absurde
 * invite à en faire quelque chose.
 */
const PLAUSIBLE = 40;
/** Le monde dans lequel un taux souverain a un sens, en pour cent. */
const TAUX_MIN = -5;
const TAUX_MAX = 60;

/** Pourquoi un ajustement a été refusé. Le français est la clef, comme partout. */
export type Refus = "moins de quatre durées distinctes" | "coefficients hors du monde : les durées observées ne contraignent pas la courbure" | "la courbe ajustée sort des taux plausibles";

/**
 * Ajuste la courbe. Rend undefined quand les données ne la portent pas.
 *
 * Quatre observations distinctes sont le minimum absolu : trois paramètres plus
 * un degré de liberté pour estimer le bruit. En dessous, il n'y a pas de
 * résidu, donc pas de bande, donc rien à publier.
 *
 * `lambda` impose la décroissance au lieu de la calibrer : c'est ainsi qu'un
 * Trésor à six horizons emprunte la forme de la zone au lieu de l'inventer.
 */
export function ajuster(obs: Obs[], opts: { lambda?: number } = {}): Ajustement | { refus: Refus } {
  const bons = obs.filter((o) => Number.isFinite(o.annees) && o.annees > 0 && Number.isFinite(o.pct) && (o.poids ?? 1) > 0);
  const durees = new Set(bons.map((o) => o.annees.toFixed(4)));
  if (durees.size < 4) return { refus: "moins de quatre durées distinctes" as Refus };

  const GRILLE = grilleDe(bons.map((o) => o.annees));
  let meilleur: { lambda: number; r: NonNullable<ReturnType<typeof betasA>> } | undefined;
  for (const lambda of opts.lambda != null ? [opts.lambda] : GRILLE) {
    const r = betasA(bons, lambda);
    if (!r) continue;
    if (!meilleur || r.ssr < meilleur.r.ssr) meilleur = { lambda, r };
  }
  if (!meilleur) return { refus: "coefficients hors du monde : les durées observées ne contraignent pas la courbure" as Refus };

  /**
   * La grille situe le minimum, une recherche ternaire le trouve.
   *
   * Le pas géométrique de la grille laisse à λ une erreur d'un demi-pas, que
   * β₂ absorbe : la courbure revenait à 3,986 pour une vraie valeur de 4. Une
   * recherche ternaire sur l'intervalle des deux voisins rend l'écart
   * négligeable, pour un coût qui ne se mesure pas.
   */
  if (opts.lambda == null) {
    const i = GRILLE.indexOf(meilleur.lambda);
    let lo = GRILLE[Math.max(0, i - 1)];
    let hi = GRILLE[Math.min(GRILLE.length - 1, i + 1)];
    for (let k = 0; k < 40 && hi - lo > 1e-9; k++) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      const r1 = betasA(bons, m1);
      const r2 = betasA(bons, m2);
      if (!r1 || !r2) break;
      if (r1.ssr < r2.ssr) hi = m2;
      else lo = m1;
    }
    const centre = (lo + hi) / 2;
    const r = betasA(bons, centre);
    if (r && r.ssr <= meilleur.r.ssr) meilleur = { lambda: centre, r };
  }


  const { b0, b1, b2, ssr, inv } = meilleur.r;
  const lambda = meilleur.lambda;
  const ddl = Math.max(1, bons.length - 3);
  /* La variance résiduelle est pondérée comme l'ajustement : les poids sont des
     précisions relatives, pas des effectifs. */
  const sigma2 = ssr / ddl;
  const annees = bons.map((o) => o.annees);

  /* Des coefficients hors du monde ne se publient pas. */
  if (![b0, b1, b2].every((v) => Number.isFinite(v) && Math.abs(v) <= PLAUSIBLE))
    return { refus: "coefficients hors du monde : les durées observées ne contraignent pas la courbure" as Refus };

  const taux = (a: number) => {
    const { f1, f2 } = facteurs(Math.max(a, 1e-6), lambda);
    return b0 + b1 * f1 + b2 * f2;
  };
  const bande = (a: number) => {
    const { f1, f2 } = facteurs(Math.max(a, 1e-6), lambda);
    const x = [1, f1, f2];
    let v = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) v += x[i] * inv[i][j] * x[j];
    return 1.96 * Math.sqrt(Math.max(0, sigma2 * v));
  };

  /**
   * Le garde-fou porte sur la courbe, parce que c'est elle qu'on publie.
   *
   * Des coefficients bornés peuvent encore produire deux cents pour cent à dix
   * ans. On vérifie donc le tracé, sur l'intervalle observé et jusqu'aux durées
   * usuelles que la table affichera.
   */
  const court = Math.min(...annees);
  const long = Math.max(...annees);
  for (const a of [court, long, 0.25, 0.5, 1, 2, 3, 5, 7, 10]) {
    const y = taux(a);
    if (!Number.isFinite(y) || y < TAUX_MIN || y > TAUX_MAX) return { refus: "la courbe ajustée sort des taux plausibles" as Refus };
  }

  return {
    b0,
    b1,
    b2,
    lambda,
    n: bons.length,
    rmsePb: Math.sqrt(ssr / bons.length) * 100,
    taux,
    bande,
    borne: { court: Math.min(...annees), long: Math.max(...annees) },
  };
}

/** Le taux instantané implicite : ce que le modèle dit du très court terme. */
export const tauxCourt = (a: Pick<Ajustement, "b0" | "b1">): number => a.b0 + a.b1;
