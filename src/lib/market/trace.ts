/**
 * LE REPÈRE D'UN GRAPHIQUE, CALCULÉ À PART DU DESSIN.
 *
 * Un graphique faux ne se voit pas : une courbe décalée d'un point de
 * pourcentage a exactement l'air d'une courbe. Ce qui décide de sa justesse
 * n'est pas le tracé mais LE REPÈRE, et le repère est du calcul : il se teste.
 *
 * TROIS CHOSES Y ONT DÉJÀ COÛTÉ QUELQUE CHOSE, et elles sont ici plutôt que
 * dans le rendu :
 *
 *   LES GRADUATIONS SE POSENT SUR DES NOMBRES RONDS. Diviser l'étendue en cinq
 *   donnait « 2,1 000 » et « 8,4 000 » sur un axe de milliards : l'œil ne lit
 *   pas ça, et un axe illisible rend le graphique illisible.
 *
 *   LA MARGE DE GAUCHE SUIT L'ÉTIQUETTE LA PLUS LONGUE. « 10 000 » et « 2 % »
 *   n'ont pas la même largeur : une marge fixe coupe l'une ou gaspille pour
 *   l'autre.
 *
 *   UNE ÉTIQUETTE DE BORD S'ACCROCHE AU BORD. Centrée, la dernière dépassait
 *   le dessin et se faisait couper par le cadre, et une année tronquée se lit
 *   comme une erreur de données.
 */

export interface Point {
  x: number;
  y: number;
  /** Ce que le survol dit. Jamais une phrase : un libellé et un chiffre. */
  titre?: string;
}

export interface Serie {
  couleur: string;
  pts: Point[];
  /** Des barres plutôt qu'une ligne. */
  barres?: boolean;
  /** La part de l'intervalle qu'une barre occupe, de 0 à 1. */
  largeur?: number;
  /** Un disque sur chaque point. */
  ronds?: boolean;
  rayon?: number;
}

export interface OptionsRepere {
  hauteur?: number;
  /** Forcer les bornes verticales. Sans quoi : du zéro (ou du minimum) au maximum. */
  y0?: number;
  y1?: number;
  /** Forcer le pas des graduations. */
  pas?: number;
  /** Comment une graduation s'écrit. Décide aussi de la marge de gauche. */
  fy?: (v: number) => string;
  /** Les étiquettes de l'abscisse, à leur place dans le repère. */
  tx?: { x: number; l: string }[];
  /** Le jeu laissé de chaque côté, en part de l'étendue. */
  marge?: number;
}

export interface Graduation {
  v: number;
  y: number;
  texte: string;
  /** La ligne du zéro se dessine autrement : c'est une frontière, pas un repère. */
  zero: boolean;
}

export interface EtiquetteX {
  x: number;
  l: string;
  ancre: "start" | "middle" | "end";
}

export interface Repere {
  largeur: number;
  hauteur: number;
  marges: { haut: number; bas: number; gauche: number; droite: number };
  px: (x: number) => number;
  py: (y: number) => number;
  graduations: Graduation[];
  etiquettes: EtiquetteX[];
  /** La largeur d'une barre, pour une série de n points. */
  largeurBarre: (n: number, part?: number) => number;
  /** L'ordonnée de la base d'une barre : le zéro, ou le bas du cadre. */
  base: number;
}

export const LARGEUR = 1000;

/**
 * Des graduations rondes entre deux bornes : un, deux, deux et demi ou cinq
 * fois une puissance de dix. Jamais le cinquième de l'étendue.
 */
export function graduations(y0: number, y1: number, pas?: number): number[] {
  if (!(y1 > y0)) return [y0];
  if (!pas) {
    const brut = (y1 - y0) / 5;
    const dix = Math.pow(10, Math.floor(Math.log10(brut)));
    /* LE PAS LE PLUS PROCHE, PAS LE PREMIER AU-DESSUS. « Premier au-dessus »
       arrondissait 2,72 à 5 et ne laissait que trois lignes sur un axe qui va
       à 13,6 : un graphique à trois repères ne se lit pas. */
    const echelle = [1, 2, 2.5, 5, 10].map((k) => k * dix);
    pas = echelle.reduce((best, k) => (Math.abs(k - brut) < Math.abs(best - brut) ? k : best), echelle[0]);
  }
  const out: number[] = [];
  for (let v = Math.ceil(y0 / pas) * pas; v <= y1 + 1e-9; v += pas) out.push(Number(v.toFixed(6)));
  return out.length ? out : [y0, y1];
}

/** Largeur approchée d'un texte, en unités du dessin. Suffit pour décider. */
const large = (s: string, taille = 5.8) => s.length * taille;

export function repere(series: Serie[], o: OptionsRepere = {}): Repere | undefined {
  const pts = series.flatMap((s) => s.pts);
  if (!pts.length) return undefined;
  const H = o.hauteur ?? 250;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  if (x1 - x0 < 1e-9) {
    x0 -= 0.5;
    x1 += 0.5;
  }
  const jeu = (x1 - x0) * (o.marge ?? 0.04);
  x0 -= jeu;
  x1 += jeu;
  let y0 = o.y0 ?? Math.min(0, ...ys);
  let y1 = o.y1 ?? Math.max(...ys);
  if (y1 - y0 < 1e-9) y1 = y0 + 1;
  const grad = graduations(y0, y1, o.pas);
  const fy = o.fy ?? ((v: number) => String(v));
  const marges = {
    haut: 26,
    bas: 26,
    gauche: Math.max(26, Math.max(...grad.map((v) => large(fy(v), 6.2))) + 10),
    droite: 14,
  };
  const px = (x: number) => marges.gauche + ((x - x0) / (x1 - x0)) * (LARGEUR - marges.gauche - marges.droite);
  const py = (y: number) => H - marges.bas - ((y - y0) / (y1 - y0)) * (H - marges.haut - marges.bas);

  /**
   * UNE ÉTIQUETTE SUR DEUX SAUTE QUAND ELLES SE TOUCHENT. Les laisser toutes
   * donne une bouillie illisible sur un axe de dix ans, et en retirer au
   * hasard déplacerait le repère.
   */
  let tx = o.tx ?? [];
  if (tx.length > 1) {
    /* DIX UNITÉS DE BLANC ENTRE DEUX ÉTIQUETTES. Six les laissaient se
       frôler à quatre dixièmes d'unité, ce que le test déclarait « ça tient »
       et que l'œil lit comme un pâté. */
    const besoin = Math.max(...tx.map((t) => large(t.l))) + 10;
    const pas = Math.abs(px(tx[1].x) - px(tx[0].x));
    const saut = Math.max(1, Math.ceil(besoin / Math.max(1, pas)));
    tx = tx.filter((_, i) => i % saut === 0);
  }
  const etiquettes: EtiquetteX[] = tx.map((t) => {
    const x = px(t.x);
    const demi = large(t.l) / 2;
    const ancre = x - demi < marges.gauche ? "start" : x + demi > LARGEUR - marges.droite ? "end" : "middle";
    return { x: ancre === "start" ? marges.gauche : ancre === "end" ? LARGEUR - marges.droite : x, l: t.l, ancre };
  });

  return {
    largeur: LARGEUR,
    hauteur: H,
    marges,
    px,
    py,
    graduations: grad.map((v) => ({ v, y: py(v), texte: fy(v), zero: v === 0 && y0 < -1e-9 })),
    etiquettes,
    largeurBarre: (n, part = 0.6) => Math.max(1.5, ((LARGEUR - marges.gauche - marges.droite) / Math.max(1, n)) * part),
    base: py(Math.max(y0, 0)),
  };
}

/** Le chemin d'une ligne, en coordonnées du dessin. */
export function chemin(r: Repere, pts: Point[]): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${r.px(p.x).toFixed(1)} ${r.py(p.y).toFixed(1)}`).join(" ");
}

/** Les années entières couvertes par des séries, pour l'axe du temps. */
export function anneesDe(series: Serie[]): { x: number; l: string }[] {
  const tous = series.flatMap((s) => s.pts.map((p) => Math.floor(p.x)));
  return [...new Set(tous)].sort((a, b) => a - b).map((a) => ({ x: a + 0.5, l: String(a) }));
}

/** « 2026-07 » → 2026,5 : un mois à sa place dans le temps, pas à son rang. */
export const auTemps = (m: string): number => Number(m.slice(0, 4)) + (Number(m.slice(5, 7)) - 1) / 12;

/** « 2026-T3 » → 2026,5. */
export const trimestreAuTemps = (t: string): number => Number(t.slice(0, 4)) + (Number(t.slice(6)) - 1) / 4;
