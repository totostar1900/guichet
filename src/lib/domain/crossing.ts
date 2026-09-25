import type { Intent, IntentState, Offer } from "./types";

/**
 * L'appariement des intentions inverses : deux clients de la maison qui se font face.
 *
 * Une obligation de la zone ne s'échange presque jamais. Le taux de service le
 * dit ligne par ligne, et pour beaucoup d'entre elles il dit « jamais ». Un
 * porteur qui veut sortir n'a donc pas de marché devant lui : il a, au mieux,
 * un autre client de la maison qui veut entrer sur la même ligne. C'est la
 * seule liquidité obligataire réellement disponible, et personne ne la voit
 * parce que les deux ordres dorment dans la même liste, à deux jours d'écart.
 *
 * Ce module ne fait qu'une chose : il regarde les ordres vivants d'une ligne et
 * dit lesquels pourraient se répondre, pour combien de titres, et dans quelle
 * bande de prix. Il n'exécute rien. L'appariement reste un ordre transmis
 * comme un autre, et c'est le desk qui décide du prix dans la bande, parce que
 * ce prix se négocie entre deux clients et qu'aucune formule n'a qualité pour
 * trancher à leur place.
 *
 * Les deux règles de priorité sont celles d'un carnet d'ordres, et elles sont
 * ici pour la même raison qu'ailleurs : quand trois acheteurs font face à un
 * vendeur, il faut que l'ordre du service soit écrit avant de connaître les
 * noms. Le meilleur prix d'abord, puis le plus ancien.
 */

export type CrossSide = "achat" | "vente";

/** Les états où un ordre attend encore : au-delà, il est parti ou il est clos. */
const LIVE: IntentState[] = ["recue", "confirmee"];

export interface CrossOrder {
  id: string;
  ref: string;
  clientName: string;
  clientId?: string;
  side: CrossSide;
  /** Des titres : sur une ligne cotée, le montant de l'intention en porte le compte. */
  qty: number;
  /** Plafond pour un acheteur, plancher pour un vendeur. Absente : au marché. */
  limit: number | null;
  state: IntentState;
  at: string;
}

export interface Cross {
  buy: CrossOrder;
  sell: CrossOrder;
  /** Titres que les deux ordres ont en commun. */
  qty: number;
  /** Le plancher du vendeur, le plafond de l'acheteur : tout prix entre les deux sert les deux. */
  low: number | null;
  high: number | null;
  /**
   * L'écart partagé en deux. Ce n'est pas une recommandation : c'est le seul
   * point de la bande qui ne favorise ni l'un ni l'autre, et le desk en sort
   * dès qu'il a une raison de le faire. Quand un seul des deux a posé une
   * limite, « au marché » n'énonce aucun chiffre et c'est cette limite qui tient.
   */
  mid: number | null;
}

export interface LineCrossing {
  offerId: string;
  buys: CrossOrder[];
  sells: CrossOrder[];
  crosses: Cross[];
  /** Titres appariables en tout sur la ligne. */
  qty: number;
  /** Ce qui reste sans contrepartie, par sens. */
  restBuy: number;
  restSell: number;
}

/** L'ordre tel que l'appariement le lit, ou rien si la ligne ou l'ordre ne s'y prête pas. */
export function crossOrder(i: Intent, o: Offer): CrossOrder | null {
  if (o.kind !== "MARCHE" || o.hidden) return null;
  if (i.type !== "achat" && i.type !== "vente") return null;
  if (!LIVE.includes(i.state)) return null;
  const qty = i.amount ?? 0;
  if (!(qty > 0)) return null;
  const limit = i.limitPrice != null && i.limitPrice > 0 ? i.limitPrice : null;
  return { id: i.id, ref: i.ref, clientName: i.clientName, clientId: i.clientId, side: i.type, qty, limit, state: i.state, at: i.createdAt };
}

/** Prix puis temps : un acheteur qui paie plus passe devant, à prix égal le plus ancien. */
function byBuyPriority(a: CrossOrder, b: CrossOrder): number {
  const pa = a.limit ?? Infinity;
  const pb = b.limit ?? Infinity;
  return pb - pa || a.at.localeCompare(b.at);
}

/** Symétrique : un vendeur qui demande moins passe devant. */
function bySellPriority(a: CrossOrder, b: CrossOrder): number {
  const pa = a.limit ?? -Infinity;
  const pb = b.limit ?? -Infinity;
  return pa - pb || a.at.localeCompare(b.at);
}

function band(buy: CrossOrder, sell: CrossOrder): { low: number | null; high: number | null; mid: number | null } {
  const low = sell.limit;
  const high = buy.limit;
  const mid = low != null && high != null ? (low + high) / 2 : (low ?? high);
  return { low, high, mid };
}

/** Deux limites se répondent tant que l'acheteur va au moins aussi haut que le vendeur. */
function fits(buy: CrossOrder, sell: CrossOrder): boolean {
  if (buy.limit == null || sell.limit == null) return true;
  return buy.limit >= sell.limit;
}

/**
 * Les appariements d'une ligne, servis par priorité.
 *
 * On prend le meilleur acheteur et le meilleur vendeur ; s'ils se répondent, ils
 * échangent ce qu'ils ont en commun et celui qui n'est pas épuisé revient dans la
 * file avec son reste. Sinon plus rien ne peut s'apparier : les suivants sont,
 * par construction, moins bien placés que ceux-là.
 */
export function matchLine(orders: CrossOrder[]): Omit<LineCrossing, "offerId"> {
  const buys = orders.filter((x) => x.side === "achat").sort(byBuyPriority);
  const sells = orders.filter((x) => x.side === "vente").sort(bySellPriority);
  const leftBuy = buys.map((x) => x.qty);
  const leftSell = sells.map((x) => x.qty);
  const crosses: Cross[] = [];
  let b = 0;
  let s = 0;
  while (b < buys.length && s < sells.length) {
    if (leftBuy[b] === 0) {
      b += 1;
      continue;
    }
    if (leftSell[s] === 0) {
      s += 1;
      continue;
    }
    if (!fits(buys[b], sells[s])) break;
    const qty = Math.min(leftBuy[b], leftSell[s]);
    crosses.push({ buy: buys[b], sell: sells[s], qty, ...band(buys[b], sells[s]) });
    leftBuy[b] -= qty;
    leftSell[s] -= qty;
  }
  const sum = (xs: number[]) => xs.reduce((t, v) => t + v, 0);
  return { buys, sells, crosses, qty: sum(crosses.map((c) => c.qty)), restBuy: sum(leftBuy), restSell: sum(leftSell) };
}

/**
 * Toutes les lignes cotées où un ordre attend, appariées.
 *
 * Les lignes sans contrepartie restent de la liste : « trois vendeurs, aucun
 * acheteur » est exactement ce qu'un desk doit voir pour aller chercher le
 * quatrième. Les plus grosses quantités appariables d'abord, puis celles qui
 * attendent le plus de titres.
 */
export function crossings(offers: Offer[], intents: Intent[]): LineCrossing[] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  const perLine = new Map<string, CrossOrder[]>();
  for (const i of intents) {
    const o = byId.get(i.offerId);
    if (!o) continue;
    const x = crossOrder(i, o);
    if (!x) continue;
    const list = perLine.get(i.offerId);
    if (list) list.push(x);
    else perLine.set(i.offerId, [x]);
  }
  return [...perLine.entries()]
    .map(([offerId, orders]) => ({ offerId, ...matchLine(orders) }))
    .sort((a, b) => b.qty - a.qty || b.restBuy + b.restSell - (a.restBuy + a.restSell) || a.offerId.localeCompare(b.offerId));
}
