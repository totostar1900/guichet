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

/**
 * Une hypothèse, sous forme de clef et de paramètres.
 *
 * Elle s'affiche dans les deux langues, et ce module ne connaît pas le
 * dictionnaire : un module de domaine qui traduirait ses propres phrases
 * cesserait d'être un module de domaine. Il dit donc ce qu'il a supposé, la
 * page le met en mots.
 */
export interface Assumption {
  key: string;
  params?: Record<string, string | number>;
}

export interface AuctionYield {
  /** Le rendement actuariel annuel, en %. */
  pct: number;
  origin: YieldOrigin;
  /** Ce qui a été supposé pour l'obtenir. Vide quand le Trésor a imprimé le chiffre. */
  assumptions: Assumption[];
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

/** La durée annoncée, en années. Elle nomme le produit ; elle ne le date pas. */
export function tenorYears(tenor: string | undefined): number | undefined {
  const d = tenorDays(tenor);
  return d == null ? undefined : d / 365;
}

/**
 * Ce qu'il reste à courir, qui est la seule durée qui compte pour un prix.
 *
 * La durée annoncée est celle de la ligne à sa naissance : un abondement d'une
 * obligation à six ans peut n'avoir que dix-huit mois devant lui, et le
 * communiqué congolais du 15 septembre 2026 le dit en toutes lettres. Actualiser
 * son prix sur six ans donne un rendement faux de plusieurs centaines de points
 * de base.
 *
 * L'échéance imprimée passe donc devant l'étiquette, et la fonction dit
 * laquelle des deux a servi : un chiffre calculé sur une durée supposée ne se
 * présente pas comme un chiffre calculé sur une date lue.
 */
export function vieRestante(r: Pick<AuctionResult, "tenor"> & Partial<Pick<AuctionResult, "sessionOn" | "maturityOn">>): { years: number; from: "échéance" | "durée annoncée" } | undefined {
  const j = joursRestants(r);
  if (j != null) return { years: j / 365, from: "échéance" };
  const t = tenorYears(r.tenor);
  return t == null ? undefined : { years: t, from: "durée annoncée" };
}

/**
 * Les jours qui restent, quand l'échéance imprimée en dit quelque chose.
 *
 * Le plancher est d'un jour et non d'un mois. Le Trésor gabonais abonde ses
 * bons à treize semaines : le 22 juillet 2026, deux de ses quatre lignes
 * arrivaient à terme vingt-trois et trente-sept jours plus tard. Un plancher
 * d'un mois les renvoyait à leur étiquette et les posait à trois mois, ce qui
 * est le défaut même qu'on cherchait à corriger.
 *
 * Reste le plafond, qui écarte une date manifestement mal lue. Une échéance
 * seulement douteuse n'est pas le sujet de cette fonction : elle n'a qu'une
 * date, là où le crible d'anomalies a la pièce et la séance entière.
 */
function joursRestants(r: Partial<Pick<AuctionResult, "sessionOn" | "maturityOn">>): number | undefined {
  if (!r.maturityOn || !r.sessionOn) return undefined;
  const j = (Date.parse(r.maturityOn) - Date.parse(r.sessionOn)) / 86_400_000;
  return Number.isFinite(j) && j >= 1 && j < 40 * 366 ? j : undefined;
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
/** Une semaine, en années : en deçà, un coupon est réputé détaché. */
const COUPON_DETACHE = 7 / 365;

export function ytm(pricePct: number, couponPct: number, years: number): number | undefined {
  if (!Number.isFinite(pricePct) || pricePct <= 0) return undefined;
  if (!Number.isFinite(couponPct) || couponPct < 0) return undefined;
  if (!Number.isFinite(years) || years <= 0 || years > 40) return undefined;
  /**
   * Les coupons restants se comptent à rebours depuis l'échéance.
   *
   * Un abondement ne tombe pas sur un anniversaire : il reste onze mois à un
   * titre de trois ans, et son dernier coupon vient avec le capital. Compter
   * les flux en partant de la fin les place aux bonnes dates, et le cas entier
   * s'y retrouve inchangé.
   *
   * La tolérance d'une semaine n'est pas un détail. Cinq années civiles valent
   * 5,0027 années exact/365, un 29 février s'étant glissé dedans, et compter
   * par excès ajoutait un sixième coupon tombant le lendemain de la séance :
   * un coupon déjà détaché, que l'acheteur ne touche pas, et qui faisait passer
   * le rendement de 7,49 % à 9,15 %. Un flux situé dans les sept jours avant
   * l'horizon est donc réputé détaché.
   */
  const n = Math.max(1, Math.ceil(years - COUPON_DETACHE));
  const ecart = (y: number) => {
    let v = 0;
    for (let k = 0; k < n; k++) v += couponPct / (1 + y) ** (years - k);
    return v + 100 / (1 + y) ** years - pricePct;
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

/**
 * Le prix d'une obligation en % du nominal, pied de coupon.
 *
 * « Pied de coupon » est tout le sujet. Le rendement s'actualise sur un prix
 * qui n'inclut pas le coupon couru ; lui en donner un qui l'inclut gonfle le
 * prix et écrase le rendement d'autant.
 *
 * Le Trésor gabonais publie les deux conventions dans le même tableau sans le
 * dire : ses « prix minimum », « maximum » et « limite » sont pied de coupon,
 * son « Prix Moyen Pondéré » inclut le couru. Onze séances le montraient,
 * toutes signalées comme une moyenne au-dessus de son propre maximum, ce qui
 * est impossible entre grandeurs comparables. Vérifié sur cinq d'entre elles :
 * l'écart au prix limite vaut le coupon couru depuis la dernière échéance
 * annuelle, à quelques centièmes près, et à quatre millièmes sur la séance du
 * 5 juillet 2023 où tout fut servi au limite.
 *
 * La règle qui en sort ne nomme pas le Gabon, et c'est voulu : une moyenne
 * au-dessus du haut de la fourchette n'est pas une moyenne de la même chose,
 * quel que soit le Trésor qui l'imprime. On retient alors le prix limite, qui
 * est pied de coupon, et on le déclare.
 *
 * Le haut de la fourchette se reconnaît à sa valeur et non à son étiquette,
 * parce que le Trésor congolais imprime « maximum » avant « minimum » et que
 * ses deux nombres vont dans l'autre sens. Aucune séance stockée n'est dans ce
 * désordre, l'ingestion triant déjà : c'est donc une protection et non une
 * correction. Elle a sa place ici quand même, une fonction de domaine n'ayant
 * pas à dépendre d'un tri fait dans un autre fichier pour que onze rendements
 * gabonais restent justes.
 */
export function priceOf(r: Pick<AuctionResult, "priceAvg" | "priceLimit" | "priceAvgFcfa" | "priceMin" | "priceMax">): { pct: number; assumed?: Assumption } | undefined {
  const haut = r.priceMin != null && r.priceMax != null ? Math.max(r.priceMin, r.priceMax) : (r.priceMax ?? r.priceMin);
  const horsBornes = r.priceAvg != null && haut != null && r.priceAvg > haut + 0.01;
  if (horsBornes && r.priceLimit != null) {
    return { pct: r.priceLimit, assumed: { key: "prix limite retenu : le prix moyen publié dépasse le maximum proposé et inclut donc le coupon couru" } };
  }
  const direct = horsBornes ? r.priceLimit : (r.priceAvg ?? r.priceLimit);
  if (direct != null) return { pct: direct };
  if (r.priceAvgFcfa != null) {
    return {
      pct: (r.priceAvgFcfa / VN_OTA) * 100,
      assumed: { key: "prix converti depuis {f} F par titre, sur une valeur nominale de {vn} F", params: { f: r.priceAvgFcfa.toLocaleString("fr-FR"), vn: VN_OTA.toLocaleString("fr-FR") } },
    };
  }
  return undefined;
}

type YieldInput = Partial<Pick<AuctionResult, "sessionOn" | "maturityOn">> & Pick<AuctionResult, "instrument" | "tenor" | "yieldAvg" | "yieldLimit" | "rateAvg" | "rateLimit" | "priceAvg" | "priceLimit" | "priceAvgFcfa" | "priceMin" | "priceMax" | "couponRate">;

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
  if (r.yieldLimit != null) return { pct: r.yieldLimit, origin: "imprimé", assumptions: [{ key: "rendement au prix limite, faute du moyen pondéré" }] };

  if (r.instrument === "BTA") {
    const d = r.rateAvg ?? r.rateLimit;
    // Un bon s'abonde comme une obligation : le Trésor gabonais en a adjugé
    // quatre lignes de treize semaines le même jour, dont deux à vingt-trois et
    // trente-sept jours du terme. L'escompte se compte sur ces jours-là, sans
    // quoi le point se poserait à une durée et se calculerait sur une autre.
    const restants = joursRestants(r);
    const jours = restants != null ? Math.round(restants) : tenorDays(r.tenor);
    if (d == null || jours == null) return undefined;
    const y = actuarialFromDiscount(d, jours);
    if (y == null) return undefined;
    const hyp: Assumption[] = [{ key: "escompte exact/360 sur {j} jours, capitalisation exact/365", params: { j: jours } }];
    if (restants == null) hyp.push({ key: "durée annoncée retenue faute d'échéance imprimée" });
    return { pct: y, origin: "taux précompté", assumptions: hyp };
  }

  const p = priceOf(r);
  const vie = vieRestante(r);
  if (!p || r.couponRate == null || vie == null) return undefined;
  const y = ytm(p.pct, r.couponRate, vie.years);
  if (y == null) return undefined;
  const hyp: Assumption[] = [{ key: "coupon annuel de {c} %, capital remboursé in fine", params: { c: r.couponRate.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) } }];
  hyp.push(
    vie.from === "échéance"
      ? { key: "{n} ans à courir jusqu'à l'échéance imprimée", params: { n: vie.years.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) } }
      : { key: "durée annoncée retenue faute d'échéance imprimée" },
  );
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
  if (!vieRestante(r)) return "durée absente ou illisible";
  if (r.instrument === "BTA") return "ni taux moyen pondéré ni taux limite";
  if (!priceOf(r)) return "ni prix moyen pondéré ni prix limite";
  if (r.couponRate == null) return "coupon absent : le prix seul ne donne pas de rendement";
  return "calcul impossible sur ces valeurs";
}
