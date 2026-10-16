import type { AuctionResult } from "./auction-results";
import { auctionYield, type AuctionYield, type Convention } from "./yield";

/**
 * LA TENSION D'UNE SÉANCE, LUE DANS CE QUE NOUS AVONS DÉJÀ.
 *
 * Trois mesures, aucune collecte : elles se déduisent des chiffres que le
 * communiqué imprime et que nous avons relevés. C'est le lot 5 du plan dette,
 * et sa contrainte d'acceptation est exactement celle-là, des jointures sur
 * l'existant.
 *
 * TOUT SE CALCULE EN RENDEMENT, ET C'EST LA DÉCISION DE FOND. Un bon imprime
 * des taux d'escompte, une obligation des prix en pourcentage du nominal, et
 * les deux vont en sens contraire : un prix qui monte est un rendement qui
 * baisse. Comparer un écart de taux à un écart de prix, ou pire les additionner
 * dans une moyenne de zone, donnerait un nombre que personne ne peut défendre.
 * On passe donc chaque point de l'enchère par `auctionYield`, qui sait traiter
 * les deux familles et déclare ses hypothèses, puis on soustrait des
 * rendements entre eux.
 *
 * LES ÉCARTS SE DISENT EN POINTS DE BASE, comme le reste de la maison.
 */

/**
 * Les quatre points d'une enchère, nommés du côté du Trésor.
 *
 * « meilleur » et « pire » qualifient l'emprunteur et non le prêteur : le
 * meilleur taux proposé est celui qui lui coûte le moins. Le dire autrement
 * dans deux fonctions voisines est la façon sûre de se tromper de signe.
 */
export type PointDEnchere = "moyen" | "limite" | "meilleur" | "pire";

export const POINT_LABEL: Record<PointDEnchere, string> = {
  moyen: "moyen pondéré",
  limite: "marginal, la dernière soumission servie",
  meilleur: "le moins cher proposé",
  pire: "le plus cher proposé",
};

type Entree = Parameters<typeof auctionYield>[0];

/**
 * La séance vue par un seul de ses points, prête pour `auctionYield`.
 *
 * ON EFFACE LES AUTRES CHAMPS, et ce n'est pas de la prudence décorative :
 * `priceOf` se rabat sur le prix limite puis sur les bornes quand le prix
 * moyen manque, et `auctionYield` se rabat sur le taux limite quand le taux
 * moyen manque. Laisser ces champs en place ferait silencieusement répondre
 * « le point que tu demandes est absent, en voici un autre », et l'écart
 * calculé vaudrait alors zéro en annonçant une enchère sans tension.
 */
function auPoint(r: AuctionResult, point: PointDEnchere): Entree | undefined {
  /* On ÉNUMÈRE les champs au lieu d'étaler la séance : `YieldInput` ne
     connaît pas rateMin ni rateMax, et un objet plus large n'échouerait qu'au
     typage, pas au calcul. Écrire chaque case oblige à décider de chacune. */
  const commun = {
    instrument: r.instrument,
    tenor: r.tenor,
    sessionOn: r.sessionOn,
    maturityOn: r.maturityOn,
    couponRate: r.couponRate,
    yieldAvg: undefined,
    yieldLimit: undefined,
    rateLimit: undefined,
    priceLimit: undefined,
    priceMin: undefined,
    priceMax: undefined,
    priceAvgFcfa: undefined,
  };
  if (r.instrument === "BTA") {
    const d = point === "moyen" ? r.rateAvg : point === "limite" ? r.rateLimit : point === "meilleur" ? r.rateMin : r.rateMax;
    return d == null ? undefined : { ...commun, rateAvg: d, priceAvg: undefined };
  }
  /* Pour une obligation le sens s'inverse : le prix le plus HAUT est le moins
     cher pour le Trésor, puisqu'il encaisse davantage pour la même dette. */
  const p = point === "moyen" ? r.priceAvg : point === "limite" ? r.priceLimit : point === "meilleur" ? r.priceMax : r.priceMin;
  return p == null ? undefined : { ...commun, priceAvg: p, rateAvg: undefined };
}

/**
 * Le rendement de la séance à l'un de ses points.
 *
 * Un rendement IMPRIMÉ passe devant un rendement calculé, et seulement pour
 * le point qu'il décrit : le communiqué camerounais imprime son rendement
 * moyen pondéré, pas celui de sa soumission marginale.
 */
export function rendementAu(r: AuctionResult, point: PointDEnchere, convention: Convention = "guichet"): AuctionYield | undefined {
  if (point === "moyen" && r.yieldAvg != null) return { pct: r.yieldAvg, origin: "imprimé", assumptions: [] };
  if (point === "limite" && r.yieldLimit != null) return { pct: r.yieldLimit, origin: "imprimé", assumptions: [] };
  const e = auPoint(r, point);
  return e ? auctionYield(e, convention) : undefined;
}

const pb = (haut: number, bas: number) => Math.round((haut - bas) * 100);

/**
 * UN ÉCART SE CALCULE ENTRE DEUX CHIFFRES DE MÊME ORIGINE, SANS EXCEPTION.
 *
 * Le piège a été pris en flagrant délit le 16 octobre 2026, par le cliquet
 * de cette page même. Le camerounais CM2C00000128 a un prix moyen et un prix
 * limite IDENTIQUES, 95,000 : son écart marginal vaut zéro. La mesure
 * annonçait moins vingt points de base, parce qu'elle prenait le rendement
 * IMPRIMÉ pour la moyenne, 8,14 %, et le rendement CALCULÉ à partir du prix
 * pour le marginal, 7,94 %. Deux mesures justes, une soustraction fausse.
 *
 * Le rendement imprimé reste préférable partout où on le LIT seul. Dès qu'on
 * le SOUSTRAIT, il faut que l'autre terme vienne du même chemin, sinon
 * l'écart mesure la distance entre deux méthodes et non entre deux moments
 * de l'enchère. En cas de désaccord d'origine, on recalcule les deux : c'est
 * le seul chemin dont on est sûr qu'il existe pour les quatre points.
 */
function ecartEntre(r: AuctionResult, haut: PointDEnchere, bas: PointDEnchere, convention: Convention): number | undefined {
  const a = rendementAu(r, haut, convention);
  const b = rendementAu(r, bas, convention);
  if (!a || !b) return undefined;
  if (a.origin === b.origin) return pb(a.pct, b.pct);

  const ea = auPoint(r, haut);
  const eb = auPoint(r, bas);
  if (!ea || !eb) return undefined;
  const ca = auctionYield(ea, convention);
  const cb = auctionYield(eb, convention);
  return ca && cb ? pb(ca.pct, cb.pct) : undefined;
}

/**
 * L'ÉCART MARGINAL : ce que la dernière soumission servie a coûté de plus que
 * la moyenne.
 *
 * Il dit si le Trésor a dû racler le fond du carnet pour se servir. Proche de
 * zéro, les soumissions se pressaient au même prix ; large, les dernières ont
 * été payées cher, et la séance suivante partira de ce niveau-là.
 *
 * Il est positif par construction, le marginal étant le dernier accepté.
 * Un négatif n'est donc pas une information de marché mais une faute de
 * relevé, et il vaut mieux le rendre tel quel que le masquer : c'est le
 * contrôle gratuit que cette mesure offre en passant.
 */
export function ecartMarginal(r: AuctionResult, convention: Convention = "guichet"): number | undefined {
  return ecartEntre(r, "limite", "moyen", convention);
}

/**
 * L'ÉTENDUE : du moins cher au plus cher de ce qui a été PROPOSÉ.
 *
 * Elle mesure le désaccord du marché sur le prix de l'argent ce jour-là, et
 * non ce que le Trésor a retenu. Une étendue large avec un écart marginal
 * étroit dit que le Trésor a refusé la queue ; les deux larges disent qu'il a
 * dû la prendre.
 */
export function etendue(r: AuctionResult, convention: Convention = "guichet"): number | undefined {
  return ecartEntre(r, "pire", "meilleur", convention);
}

export interface Prime {
  /** L'écart en points de base entre cette séance et sa référence. */
  pb: number;
  /** La séance qui sert de référence, pour qu'on puisse la contester. */
  reference: { sessionOn: string; codeEmission?: string; pct: number };
  jours: number;
}

/**
 * LA PRIME DE NOUVELLE ÉMISSION : ce qu'une ligne neuve paie de plus que la
 * dernière ligne comparable.
 *
 * La référence est la séance la plus récente du MÊME pays et de la MÊME
 * durée annoncée, strictement antérieure. Pas une interpolation de courbe :
 * une courbe est déjà un modèle, et une prime mesurée contre un modèle
 * mélangerait l'écart réel avec l'erreur d'ajustement.
 *
 * ELLE N'A PAS DE SENS POUR UN ABONDEMENT, et c'est pourquoi elle est rendue
 * vide dans ce cas plutôt que zéro. Un abondement rouvre une ligne qui existe
 * déjà : il n'y a pas de nouveauté à facturer, et le marché le prix comme du
 * secondaire.
 *
 * LA DISTANCE EST RENDUE AVEC LE CHIFFRE. Une prime contre une séance vieille
 * de huit mois ne dit plus grand-chose du jour, et seul celui qui lit peut
 * décider à partir de quand il cesse d'y croire : la mesure ne tranche pas à
 * sa place, elle lui donne de quoi trancher.
 */
export function primeDeNouvelleEmission(
  r: AuctionResult,
  anterieures: AuctionResult[],
  convention: Convention = "guichet",
): Prime | undefined {
  if (r.abondement) return undefined;
  const mien = rendementAu(r, "moyen", convention);
  if (!mien) return undefined;

  const candidates = anterieures
    .filter((x) => x.country === r.country && x.tenor === r.tenor && x.sessionOn < r.sessionOn && x.codeEmission !== r.codeEmission)
    .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));

  for (const c of candidates) {
    const y = rendementAu(c, "moyen", convention);
    if (!y) continue;
    const jours = Math.round((Date.parse(r.sessionOn) - Date.parse(c.sessionOn)) / 86_400_000);
    return { pb: pb(mien.pct, y.pct), reference: { sessionOn: c.sessionOn, codeEmission: c.codeEmission, pct: y.pct }, jours };
  }
  return undefined;
}

export interface Tension {
  ecartMarginal?: number;
  etendue?: number;
  prime?: Prime;
}

/** Les trois mesures d'une séance, pour n'avoir à nommer le lot qu'une fois. */
export function tensionDe(r: AuctionResult, anterieures: AuctionResult[], convention: Convention = "guichet"): Tension {
  return {
    ecartMarginal: ecartMarginal(r, convention),
    etendue: etendue(r, convention),
    prime: primeDeNouvelleEmission(r, anterieures, convention),
  };
}
