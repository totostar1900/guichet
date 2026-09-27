import type { AuctionResult } from "./auction-results";

/**
 * Un rendement, et d'où il vient.
 *
 * La table range deux familles de chiffres qui ne se comparent pas. Un bon
 * s'adjuge à un taux précompté, une obligation à un prix ; 6,70 % et 95,00 %
 * ne se posent pas sur le même axe. Tant qu'on regarde une séance à la fois
 * cela n'a aucune importance, et dès qu'on trace une courbe cela devient le
 * seul sujet : la courbe de la zone s'arrêtait à douze mois, non par choix,
 * mais parce qu'au-delà nous n'avions que des prix.
 *
 * Trois chemins mènent à un rendement, et ils ne se valent pas :
 *
 *   ce que le Trésor imprime lui-même (« taux de rendement moyen pondéré »),
 *   qui ne suppose rien ;
 *
 *   un prix d'obligation et son coupon, qui donnent un rendement actuariel par
 *   le calcul, au prix d'une hypothèse sur l'échéancier ;
 *
 *   un taux de bon précompté, qui se convertit en rendement actuariel par une
 *   identité de place, au prix de deux conventions de comptage.
 *
 * Chaque valeur sortie d'ici porte donc son origine et la liste de ce qui a
 * été supposé pour l'obtenir. Ce n'est pas une précaution de style : un point
 * calculé et un point imprimé ont la même allure sur un graphique, et la
 * différence entre les deux est exactement ce qu'un lecteur doit pouvoir
 * mettre en doute. Un rendement dont l'origine ne se dit pas n'a pas sa place
 * sur une courbe qu'on publie.
 *
 * Ce qui manque reste vide. Un prix d'obligation sans coupon ne donne aucun
 * rendement, et l'écran doit compter ces trous plutôt que de les combler.
 */

/** La valeur nominale d'une obligation du Trésor dans la zone. */
export const VN_OTA = 10_000;

export type YieldOrigin = "imprimé" | "prix et coupon" | "taux précompté";

export interface AuctionYield {
  /** Le rendement actuariel annuel, en %. */
  pct: number;
  origin: YieldOrigin;
  /** Ce qui a été supposé pour l'obtenir. Vide quand le Trésor a imprimé le chiffre. */
  assumptions: string[];
}

export const YIELD_ORIGIN_LABEL: Record<YieldOrigin, string> = {
  imprimé: "imprimé sur le communiqué",
  "prix et coupon": "calculé, prix et coupon",
  "taux précompté": "converti, taux précompté",
};

/**
 * Les jours d'un bon, tels que la BEAC les compte.
 *
 * Treize semaines font quatre-vingt-onze jours et non un trimestre : c'est le
 * nombre de jours qui entre dans le décompte précompté, et arrondir à trois
 * mois décalerait le rendement de plusieurs points de base.
 */
export function tenorDays(tenor: string | undefined): number | undefined {
  if (!tenor) return undefined;
  const t = tenor.toLowerCase().replace(",", ".");
  const sem = t.match(/^(\d+(?:\.\d+)?)\s*semaines?$/);
  if (sem) return Math.round(Number(sem[1]) * 7);
  const mois = t.match(/^(\d+(?:\.\d+)?)\s*mois$/);
  if (mois) return Math.round(Number(mois[1]) * 30.4375);
  const ans = t.match(/^(\d+(?:\.\d+)?)\s*ans?$/);
  if (ans) return Math.round(Number(ans[1]) * 365);
  return undefined;
}

/** La durée en années : l'abscisse d'un point de courbe. */
export function tenorYears(tenor: string | undefined): number | undefined {
  const d = tenorDays(tenor);
  return d == null ? undefined : d / 365;
}

/**
 * Un taux précompté devient un rendement actuariel.
 *
 * Le bon se vend escompté : on paie 100 moins les intérêts, on reçoit 100 à
 * l'échéance. Le taux affiché n'est donc pas un rendement, il est l'escompte,
 * et il est toujours plus petit que le rendement qu'il procure. Sur un 52
 * semaines à 6,97 %, l'écart dépasse trente points de base : assez pour
 * déformer une courbe où le court et le long se comparent.
 *
 * Deux conventions, et ce sont celles de la place : l'escompte se compte en
 * exact/360, le rendement se capitalise en exact/365.
 */
export function actuarialFromDiscount(discountPct: number, days: number): number | undefined {
  if (!Number.isFinite(discountPct) || !Number.isFinite(days) || days <= 0) return undefined;
  const price = 100 * (1 - (discountPct / 100) * (days / 360));
  if (price <= 0) return undefined;
  return ((100 / price) ** (365 / days) - 1) * 100;
}

/**
 * Le rendement à l'échéance d'une obligation, par dichotomie.
 *
 * L'inconnue est au dénominateur de chaque flux : il n'y a pas de formule
 * fermée, et la maison résout déjà un taux de la même façon pour la
 * performance d'un portefeuille. La fonction décroît avec le rendement, donc
 * l'encadrement est sûr.
 *
 * Hypothèse d'échéancier : coupon annuel, capital remboursé en une fois à
 * l'échéance. Beaucoup d'obligations de la zone s'amortissent en réalité par
 * tranches après un différé, ce qui raccourcit la durée de vie moyenne et
 * relève le rendement. Tant que le communiqué ne dit pas l'échéancier, cette
 * hypothèse est déclarée avec le chiffre au lieu d'être tue.
 */
export function ytm(pricePct: number, couponPct: number, years: number): number | undefined {
  if (!Number.isFinite(pricePct) || pricePct <= 0) return undefined;
  if (!Number.isFinite(couponPct) || couponPct < 0) return undefined;
  const n = Math.round(years);
  if (!Number.isFinite(n) || n < 1 || Math.abs(years - n) > 0.2) return undefined;
  const ecart = (y: number) => {
    let v = 0;
    for (let t = 1; t <= n; t++) v += couponPct / (1 + y) ** t;
    return v + 100 / (1 + y) ** n - pricePct;
  };
  let lo = -0.9;
  let hi = 3;
  if (ecart(lo) < 0 || ecart(hi) > 0) return undefined;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (ecart(mid) > 0) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/** Le prix d'une obligation en % du nominal, y compris quand le Trésor l'écrit en francs. */
export function priceOf(r: Pick<AuctionResult, "priceAvg" | "priceLimit" | "priceAvgFcfa">): { pct: number; assumed?: string } | undefined {
  const direct = r.priceAvg ?? r.priceLimit;
  if (direct != null) return { pct: direct };
  if (r.priceAvgFcfa != null) {
    return { pct: (r.priceAvgFcfa / VN_OTA) * 100, assumed: `prix converti depuis ${r.priceAvgFcfa.toLocaleString("fr-FR")} F par titre, sur une valeur nominale de ${VN_OTA.toLocaleString("fr-FR")} F` };
  }
  return undefined;
}

type YieldInput = Pick<AuctionResult, "instrument" | "tenor" | "yieldAvg" | "yieldLimit" | "rateAvg" | "rateLimit" | "priceAvg" | "priceLimit" | "priceAvgFcfa" | "couponRate">;

/**
 * Le rendement d'une séance, par le meilleur chemin disponible.
 *
 * L'ordre n'est pas un ordre de commodité mais un ordre de confiance : ce que
 * le Trésor imprime passe avant ce que nous calculons, et un calcul sans
 * hypothèse passe avant un calcul qui en demande une. Le premier chemin qui
 * aboutit gagne, et il dit lequel il est.
 */
export function auctionYield(r: YieldInput): AuctionYield | undefined {
  if (r.yieldAvg != null) return { pct: r.yieldAvg, origin: "imprimé", assumptions: [] };
  if (r.yieldLimit != null) return { pct: r.yieldLimit, origin: "imprimé", assumptions: ["rendement au prix limite, faute du moyen pondéré"] };

  if (r.instrument === "BTA") {
    const d = r.rateAvg ?? r.rateLimit;
    const jours = tenorDays(r.tenor);
    if (d == null || jours == null) return undefined;
    const y = actuarialFromDiscount(d, jours);
    if (y == null) return undefined;
    return { pct: y, origin: "taux précompté", assumptions: [`escompte exact/360 sur ${jours} jours, capitalisation exact/365`] };
  }

  const p = priceOf(r);
  const annees = tenorYears(r.tenor);
  if (!p || r.couponRate == null || annees == null) return undefined;
  const y = ytm(p.pct, r.couponRate, annees);
  if (y == null) return undefined;
  const hyp = [`coupon annuel de ${r.couponRate.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} %, capital remboursé in fine`];
  if (p.assumed) hyp.push(p.assumed);
  return { pct: y, origin: "prix et coupon", assumptions: hyp };
}

/**
 * Pourquoi une séance ne donne pas de rendement.
 *
 * L'écran compte les trous, il ne les comble pas : savoir qu'il manque le
 * coupon de onze obligations est une consigne de travail, alors qu'un blanc
 * sans motif n'est qu'un blanc.
 */
export function yieldMissing(r: YieldInput): string | undefined {
  if (auctionYield(r)) return undefined;
  if (!tenorDays(r.tenor)) return "durée absente ou illisible";
  if (r.instrument === "BTA") return "ni taux moyen pondéré ni taux limite";
  if (!priceOf(r)) return "ni prix moyen pondéré ni prix limite";
  if (r.couponRate == null) return "coupon absent : le prix seul ne donne pas de rendement";
  return "calcul impossible sur ces valeurs";
}
