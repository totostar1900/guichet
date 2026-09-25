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

/**
 * Ce qu'un client peut apprendre du carnet : une présence, jamais une personne.
 *
 * Le carnet lui-même appartient au desk. Il porte des noms, des références et
 * des limites, et rien de tout cela ne se montre : la limite d'un client est sa
 * position de négociation, et la publier le désarmerait devant sa contrepartie.
 *
 * Ce qui se montre, le jour où la maison le décide, est le fait brut qu'une
 * contrepartie existe. C'est le seul renseignement qui change la décision d'un
 * porteur, et c'est aussi le seul qui ne dise rien de personne. Le compte sort
 * d'ici déjà agrégé, pour que le composant qui l'affiche n'ait jamais eu autre
 * chose entre les mains.
 */
export interface FacingView {
  side: CrossSide;
  orders: number;
  /** Les titres cherchés en face, ou rien quand la politique ne montre que la présence. */
  qty: number | null;
}

/**
 * Les deux décisions de la maison sur l'appariement, fermées l'une et l'autre.
 *
 * Dire et faire ne se décident pas ensemble. La maison peut vouloir que ses
 * clients sachent qu'une contrepartie existe longtemps avant d'accepter
 * d'apparier elle-même, et elle peut vouloir l'inverse : apparier en silence,
 * sur demande, sans rien publier. Deux interrupteurs, donc, et non un.
 */
export interface CrossPolicy {
  /** Le client apprend-il qu'une contrepartie existe ? Fermée : le desk seul le voit. */
  tell: boolean;
  /** En dessous de ce nombre d'ordres en face, on ne dit rien. */
  minOrders: number;
  /** Montrer les titres cherchés, ou seulement qu'il y a quelqu'un. */
  showDepth: boolean;
  /** Le desk peut-il enregistrer un appariement, ou seulement le lire ? */
  execute: boolean;
}

export const CROSS_CLOSED: CrossPolicy = { tell: false, minOrders: 1, showDepth: false, execute: false };

/**
 * Ce qui attend en face, sur une ligne, pour un lecteur donné.
 *
 * Ses propres ordres n'en font pas partie : un client qui a passé un ordre de
 * vente et lirait « un ordre de vente attend » se verrait lui-même, et croirait
 * à une contrepartie là où il n'y a que son reflet.
 */
export function facingSignal(intents: Intent[], o: Offer, p: CrossPolicy, opts: { exceptClientId?: string } = {}): FacingView[] {
  if (!p.tell) return [];
  const tally = new Map<CrossSide, { orders: number; qty: number }>();
  for (const i of intents) {
    if (i.offerId !== o.id) continue;
    if (opts.exceptClientId && i.clientId === opts.exceptClientId) continue;
    const x = crossOrder(i, o);
    if (!x) continue;
    const v = tally.get(x.side) ?? { orders: 0, qty: 0 };
    v.orders += 1;
    v.qty += x.qty;
    tally.set(x.side, v);
  }
  const out: FacingView[] = [];
  for (const side of ["achat", "vente"] as CrossSide[]) {
    const v = tally.get(side);
    if (!v || v.orders < Math.max(1, p.minOrders)) continue;
    out.push({ side, orders: v.orders, qty: p.showDepth ? v.qty : null });
  }
  return out;
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

/** Ce qu'il faut savoir d'une ligne pour juger un appariement : sa quotité, et rien d'autre. */
export interface CrossLine {
  lotSize?: number;
}

/**
 * Ce qui empêche cet appariement, en toutes lettres, ou rien.
 *
 * La liste est rendue au lieu d'un simple refus parce qu'elle s'affiche : un
 * bouton grisé sans raison fait chercher la panne dans l'application alors
 * qu'elle est dans l'ordre. Elle est calculée ici, et non dans l'action, pour
 * que les règles se relisent sans base de données et que l'écran annonce
 * exactement ce que le serveur refusera.
 *
 * Deux règles méritent leur mot.
 *
 * Un ordre non confirmé ne s'apparie pas. « Reçue » veut dire que le client a
 * demandé, pas qu'il a signé, et apparier pour lui l'engagerait sur un prix
 * qu'il n'a pas vu.
 *
 * Le prix doit servir les deux. En dehors de la bande, l'un des deux clients
 * obtient moins bien que ce qu'il avait posé comme limite, et la maison aurait
 * décidé à sa place.
 */
/**
 * Un refus, et le chiffre qui le fonde.
 *
 * La phrase garde son trou au lieu d'être assemblée ici, pour deux raisons. Un
 * desk anglophone lit ses refus dans sa langue, et une phrase déjà cousue ne se
 * traduit plus : le dictionnaire est rangé par clef, et « L'acheteur n'en demande
 * que 900. » n'est la clef de rien. Et le chiffre sort brut, parce que l'habit
 * d'un prix dépend de la ligne, pourcentage du nominal ou francs, ce que ce
 * module n'a pas à savoir.
 */
export interface CrossBlock {
  /** La phrase, avec « {n} » là où le chiffre va. */
  key: string;
  /** Un compte de titres, à écrire tel quel. */
  qty?: number;
  /** Un prix, que l'écran met dans l'habit de la ligne. */
  price?: number;
}

export function crossCheck(buy: CrossOrder, sell: CrossOrder, qty: number, price: number, line: CrossLine = {}): CrossBlock[] {
  const out: CrossBlock[] = [];
  if (buy.side !== "achat" || sell.side !== "vente") out.push({ key: "Un appariement va d'un acheteur à un vendeur." });
  if (buy.id === sell.id) out.push({ key: "Un ordre ne s'apparie pas avec lui-même." });
  if (buy.clientId && sell.clientId && buy.clientId === sell.clientId) out.push({ key: "Les deux ordres sont du même client." });
  if (buy.state !== "confirmee") out.push({ key: "L'ordre d'achat n'est pas confirmé." });
  if (sell.state !== "confirmee") out.push({ key: "L'ordre de vente n'est pas confirmé." });
  if (!Number.isInteger(qty) || qty <= 0) out.push({ key: "La quantité appariée se compte en titres entiers." });
  else {
    if (qty > buy.qty) out.push({ key: "L'acheteur n'en demande que {n}.", qty: buy.qty });
    if (qty > sell.qty) out.push({ key: "Le vendeur n'en offre que {n}.", qty: sell.qty });
    const lot = line.lotSize ?? 1;
    if (lot > 1 && qty % lot !== 0) out.push({ key: "La quotité de la ligne est de {n} titres.", qty: lot });
  }
  if (!(price > 0)) out.push({ key: "Le prix d'exécution manque." });
  else {
    if (buy.limit != null && price > buy.limit) out.push({ key: "L'acheteur ne va pas au-delà de {n}.", price: buy.limit });
    if (sell.limit != null && price < sell.limit) out.push({ key: "Le vendeur ne descend pas sous {n}.", price: sell.limit });
  }
  return out;
}
