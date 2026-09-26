import type { Country, OfferKind } from "@/lib/domain/types";

/**
 * Les résultats des adjudications de la zone, et ce qu'on en déduit.
 *
 * Le taux d'un bon du Trésor ne se décrète pas : il sort de la séance, où les
 * spécialistes en valeurs du Trésor soumissionnent et où le Trésor arrête un taux
 * limite. Tant que la séance n'a pas eu lieu, tout chiffre affiché est une
 * indication, et une indication ne vaut que par ce qu'elle regarde. Ce qu'elle
 * doit regarder, c'est la dernière séance comparable.
 *
 * D'où cette table. La BEAC publie les résultats des six Trésors ; nous n'avons
 * publié comme offres qu'une poignée des lignes concernées. La mémoire du marché
 * primaire est donc plus large que notre catalogue, et c'est exactement pour cela
 * qu'elle sert : un BTA 52 semaines du Congo se compare d'abord aux BTA
 * 52 semaines du Congo, y compris ceux que nous n'avons pas distribués.
 *
 * Deux garde-fous tiennent tout le reste.
 *
 * Une séance n'est pas un prix de marché parce qu'elle porte un taux. Le
 * 15 septembre 2026, un BTA 52 semaines congolais est sorti à 6,97 % avec un seul
 * soumissionnaire et 2,50 % de couverture : une banque a posé un chiffre, le
 * Trésor a pris ce qu'il y avait. S'ancrer là-dessus revient à prendre l'avis
 * d'une contrepartie pour celui du marché. « thin » le dit, et l'écran le montre.
 *
 * Et les pays ne se valent pas. Un même instrument, une même durée, deux
 * signatures souveraines : les taux diffèrent, et moyenner les six effacerait
 * précisément l'écart qu'on cherche à lire. La référence se prend donc dans le
 * pays, et sortir du pays est un repli, signalé comme tel.
 */

/** Une séance, telle que le communiqué de résultats la publie. */
export interface AuctionResult {
  id: string;
  /** Le code d'émission du Trésor : c'est lui qui relie la séance à une de nos lignes. */
  codeEmission: string;
  country: Country;
  instrument: Extract<OfferKind, "BTA" | "OTA">;
  /** « 26 semaines », « 3 ans » : tel que le Trésor l'écrit, normalisé. */
  tenor: string;
  sessionOn: string; // YYYY-MM-DD
  abondement: boolean;
  /** En francs. Le communiqué les imprime en millions. */
  announced?: number;
  bid?: number;
  served?: number;
  networkSize?: number;
  bidders?: number;
  /** Les bons : des taux précomptés, en %. */
  rateMin?: number;
  rateMax?: number;
  rateLimit?: number;
  rateAvg?: number;
  /** Les obligations : des prix, en % du nominal. */
  priceMin?: number;
  priceMax?: number;
  priceLimit?: number;
  priceAvg?: number;
  /** Tel que le Trésor le publie, jamais recalculé. */
  coverage?: number;
  sourceUrl: string;
  sourceTitle: string;
  /** Vide : la lecture automatique n'a pas été relue, et le chiffre ne sert de référence à rien. */
  confirmedBy?: string;
  confirmedAt?: string;
  offerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewAuctionResult = Omit<AuctionResult, "id" | "createdAt" | "updatedAt">;

/** Le communiqué imprime « 15 000 » pour quinze milliards. La conversion se fait une fois. */
export const millions = (m: number): number => m * 1_000_000;

/**
 * Le chiffre de la séance, avec son unité.
 *
 * Un bon se sert à un taux, une obligation à un prix, et les deux ne se rangent
 * pas dans la même colonne : convertir un prix en rendement demande le coupon et
 * l'échéancier, ce qui appartient au code financier, pas à la lecture d'un
 * communiqué. Le taux moyen pondéré passe devant le taux limite parce qu'il dit
 * ce que la séance a coûté en moyenne, là où le limite ne dit que le pire servi.
 */
export function headline(r: AuctionResult): { value: number; unit: "taux" | "prix" } | undefined {
  if (r.instrument === "BTA") {
    const v = r.rateAvg ?? r.rateLimit;
    return v == null ? undefined : { value: v, unit: "taux" };
  }
  const v = r.priceAvg ?? r.priceLimit;
  return v == null ? undefined : { value: v, unit: "prix" };
}

/** Le taux de couverture : celui du Trésor, sinon celui que les montants donnent. */
export function coverageOf(r: AuctionResult): number | undefined {
  if (r.coverage != null) return r.coverage;
  if (r.bid != null && r.announced) return (r.bid / r.announced) * 100;
  return undefined;
}

/**
 * Une séance trop mince pour servir d'ancre.
 *
 * Un seul soumissionnaire, ou des soumissions qui ne couvrent pas ce qui était
 * annoncé : dans les deux cas le taux sorti est celui d'une contrepartie, pas
 * celui du marché. Le chiffre reste vrai, il cesse simplement d'être
 * représentatif, et c'est une distinction que l'écran doit porter.
 */
export function thin(r: AuctionResult): boolean {
  if (r.bidders != null && r.bidders <= 1) return true;
  const c = coverageOf(r);
  return c != null && c < 100;
}

const days = (a: string, b: string): number => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

export interface RateReference {
  /** Le taux (BTA) ou le prix (OTA) proposé au desk. */
  proposed: number;
  unit: "taux" | "prix";
  /** La séance retenue. */
  from: AuctionResult;
  /** Les autres séances comparables, la plus récente d'abord : de quoi lire la tendance. */
  also: AuctionResult[];
  /** Faux : aucune séance du pays, la référence vient du reste de la zone. */
  sameCountry: boolean;
  /** Vrai : la séance retenue est mince, faute de mieux dans la fenêtre. */
  thin: boolean;
}

/**
 * Ce que la dernière séance comparable suggère.
 *
 * L'ordre est celui d'un opérateur : le pays d'abord, la séance la plus récente
 * ensuite, et une séance représentative avant une séance mince. Rien n'est
 * moyenné entre deux pays, ni entre deux durées : ce sont des produits
 * différents, et la moyenne effacerait l'écart qui fait tout l'intérêt du calcul.
 *
 * Seules les séances relues comptent (« confirmedBy »). Une lecture automatique
 * non confirmée peut porter un 7,00 % lu sur un scan de travers, et une faute de
 * lecture devenue référence se propagerait sans bruit à toutes les offres
 * suivantes.
 */
export function referenceRate(
  target: { country: Country; instrument: AuctionResult["instrument"]; tenor: string; on: string },
  history: AuctionResult[],
  windowDays = 180,
): RateReference | undefined {
  const fit = history
    .filter((r) => r.confirmedBy && r.instrument === target.instrument && r.tenor === target.tenor && headline(r))
    .filter((r) => {
      const d = days(target.on, r.sessionOn);
      return d >= 0 && d <= windowDays;
    })
    .sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));
  if (!fit.length) return undefined;

  const home = fit.filter((r) => r.country === target.country);
  const pool = home.length ? home : fit;
  // Une séance représentative passe devant une séance récente : le taux d'une
  // séance à un soumissionnaire n'informe que sur ce soumissionnaire.
  const pick = pool.find((r) => !thin(r)) ?? pool[0];
  const h = headline(pick);
  if (!h) return undefined;
  return {
    proposed: h.value,
    unit: h.unit,
    from: pick,
    also: pool.filter((r) => r.id !== pick.id).slice(0, 4),
    sameCountry: home.length > 0,
    thin: thin(pick),
  };
}

/** La ligne de contexte que le desk lit sous le taux proposé. */
export function referenceLine(ref: RateReference): string {
  const c = coverageOf(ref.from);
  const bits = [`séance du ${ref.from.sessionOn}`];
  if (!ref.sameCountry) bits.push(`relevée au ${ref.from.country}`);
  if (ref.from.bidders != null) bits.push(`${ref.from.bidders} soumissionnaire${ref.from.bidders > 1 ? "s" : ""}`);
  if (c != null) bits.push(`couverture ${c.toFixed(2).replace(".", ",")} %`);
  if (ref.thin) bits.push("séance mince, à prendre avec réserve");
  return bits.join(" · ");
}
