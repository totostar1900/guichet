import type { Intent, Offer } from "./types";
import { daysBetween } from "@/lib/finance";

/**
 * Ce que l'épargne d'un client a réellement rapporté.
 *
 * Un relevé dit ce qu'on détient. Il ne dit pas si on a bien fait, et c'est
 * pourtant la seule question que se pose l'épargnant. Personne sur ce marché ne
 * lui répond : les sociétés de gestion publient la performance du fonds, qui est
 * celle d'un porteur imaginaire entré le premier jour et n'ayant plus rien fait
 * depuis. Celui qui a versé en mars, renforcé en septembre et racheté une part
 * en novembre n'a pas fait cette performance-là, et souvent pas de loin.
 *
 * D'où le rendement pondéré par les montants, qui est le sien : le taux qui,
 * appliqué à chacun de ses versements pour la durée où il a couru, redonne
 * exactement ce qu'il a aujourd'hui. Cent mille francs placés onze mois ne
 * pèsent pas comme cent mille francs placés trois semaines, et c'est toute la
 * différence entre la performance d'un fonds et celle d'un client.
 *
 * Deux précautions de vocabulaire, parce qu'elles disent ce que l'application
 * sait et ce qu'elle ignore.
 *
 * Elle connaît la date d'échéance d'un flux, pas son encaissement : il n'y a pas
 * de rapprochement bancaire. Un coupon échu est donc compté comme échu, jamais
 * comme reçu, et l'écran le dit. C'est la même honnêteté que la relance de
 * réinvestissement, et pour la même raison.
 *
 * Et ce rapport mesure, il ne conseille pas. Il dit ce qui s'est passé, ligne
 * par ligne. Il ne dit jamais quoi faire ensuite : la maison n'a pas l'agrément
 * qui permettrait d'orienter une allocation.
 */

/** Un mouvement du point de vue du client : négatif quand il paie. */
export interface MoneyFlow {
  date: string;
  amount: number;
  label: string;
}

export interface LinePerformance {
  offerId: string;
  title: string;
  isin: string;
  /** Ce que le client a sorti, en tout. */
  invested: number;
  /** Ce qui lui est revenu : coupons et remboursements échus, produits de vente. */
  returned: number;
  /** Ce qu'il détient encore, à la dernière valeur publiée. */
  valued: number;
  valuedOn?: string;
  /** returned + valued - invested. */
  gain: number;
  /** Le rendement pondéré par les montants, en % par an, ou rien quand il ne se calcule pas. */
  rate?: number;
  /** Le premier mouvement : la durée sur laquelle tout cela s'est joué. */
  since: string;
  /** Des flux comptés à leur échéance, faute de rapprochement bancaire. */
  due: number;
  /** Des parts ou des titres ont été vendus : les coupons d'avant la vente manquent au compte. */
  sold: boolean;
  /**
   * La ligne peut-elle entrer dans le total ?
   *
   * Une ligne du primaire gardée jusqu'à l'échéance n'a pas de cours : personne
   * ne la cote, et l'application ne lui invente pas de valeur. Comptée à zéro,
   * elle afficherait une perte égale à tout ce que le client y a mis, ce qui
   * est le mensonge le plus grave que ce rapport pourrait servir. Elle est donc
   * montrée à part, avec ce qu'on y a versé, et tenue hors du gain et du taux.
   */
  valuable: boolean;
}

export interface PortfolioPerformance {
  lines: LinePerformance[];
  invested: number;
  returned: number;
  valued: number;
  gain: number;
  rate?: number;
  since?: string;
  due: number;
  sold: boolean;
  /** Les lignes tenues hors du total, faute de cours, et ce qui y est versé. */
  unvalued: number;
  unvaluedInvested: number;
}

/**
 * Le taux qui annule la valeur actuelle de tous ces mouvements.
 *
 * Bissection plutôt que Newton : sur une série de flux quelconque, Newton part
 * parfois à l'infini, et un rapport remis à un épargnant ne peut pas afficher un
 * chiffre absurde une fois sur cent. La bissection est lente et ne se trompe
 * jamais, ce qui est le bon échange ici.
 *
 * Rien n'est rendu quand les mouvements ne changent pas de signe : sans argent
 * sorti et argent rentré, il n'y a pas de taux, et en inventer un serait pire
 * que de n'en donner aucun.
 */
export function xirr(flows: MoneyFlow[]): number | undefined {
  if (flows.length < 2) return undefined;
  const sorted = [...flows].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.some((f) => f.amount < 0) || !sorted.some((f) => f.amount > 0)) return undefined;
  const t0 = sorted[0].date;
  const years = (d: string) => daysBetween(t0, d) / 365;
  const npv = (r: number) => sorted.reduce((s, f) => s + f.amount / Math.pow(1 + r, years(f.date)), 0);

  let lo = -0.9999;
  let hi = 10;
  const a = npv(lo);
  const b = npv(hi);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a * b > 0) return undefined;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) * a > 0) lo = mid;
    else hi = mid;
  }
  const r = ((lo + hi) / 2) * 100;
  return Number.isFinite(r) ? r : undefined;
}

/** Les ordres qui ont réellement bougé de l'argent. */
const SETTLED = (i: Intent) => i.state === "reglee";
const BUYS = ["ferme", "achat", "souscription"];
const SELLS = ["vente", "rachat", "cession"];

/**
 * La date où l'argent a bougé.
 *
 * Sur le primaire, c'est le règlement de l'opération, qui est une date publiée.
 * Ailleurs, c'est le jour où le desk a passé l'ordre en réglé : une date que
 * l'application a vraiment vue, plutôt qu'un délai théorique qu'elle appliquerait.
 */
export function movedOn(i: Intent, o: Offer): string {
  return o.kind === "MARCHE" || o.kind === "FONDS" ? i.updatedAt.slice(0, 10) : o.settleOn;
}

/**
 * La performance d'une ligne, et celle du portefeuille.
 *
 * Les mouvements viennent des ordres réglés, ce que le client a sorti et ce qui
 * lui est revenu ; les coupons échus et la valeur du jour viennent de la
 * position qu'il détient encore. Une ligne entièrement vendue garde donc ses
 * deux ordres et perd les coupons encaissés avant la vente : le compte est exact
 * pour qui garde, prudent pour qui a vendu, et l'écran le signale plutôt que de
 * laisser croire à une précision qu'il n'a pas.
 */
export function linePerformance(
  offer: Offer,
  intents: Intent[],
  position: { units: number; marketValue?: number; valuedOn?: string; paid: { date: string; amount: number; label: string }[] } | undefined,
  totalOf: (i: Intent) => number,
  today: string,
): { line: LinePerformance; flows: MoneyFlow[] } | null {
  const mine = intents.filter((i) => i.offerId === offer.id && SETTLED(i) && (BUYS.includes(i.type) || SELLS.includes(i.type)));
  if (!mine.length) return null;

  const flows: MoneyFlow[] = [];
  let invested = 0;
  let returned = 0;
  for (const i of mine) {
    const total = totalOf(i);
    const on = movedOn(i, offer);
    if (BUYS.includes(i.type)) {
      const out = Math.abs(total);
      invested += out;
      flows.push({ date: on, amount: -out, label: "Versement" });
    } else {
      const back = Math.abs(total);
      returned += back;
      flows.push({ date: on, amount: back, label: "Retrait" });
    }
  }

  let due = 0;
  for (const f of position?.paid ?? []) {
    returned += f.amount;
    due += 1;
    flows.push({ date: f.date, amount: f.amount, label: f.label });
  }

  const valued = position?.marketValue ?? 0;
  if (valued > 0) flows.push({ date: today, amount: valued, label: "Valeur du jour" });

  // Tout est là quand il ne reste rien à valoriser, ou quand ce qui reste a un
  // cours. Des titres encore détenus sans cours, et le compte est incomplet.
  const stillHeld = position?.units ?? 0;
  const valuable = stillHeld <= 0 || valued > 0;

  const since = flows.map((f) => f.date).sort()[0];
  return {
    line: {
      offerId: offer.id,
      title: offer.title,
      isin: offer.isin,
      invested,
      returned,
      valued,
      valuedOn: position?.valuedOn,
      gain: returned + valued - invested,
      rate: valuable ? xirr(flows) : undefined,
      since,
      due,
      sold: mine.some((i) => SELLS.includes(i.type)),
      valuable,
    },
    flows,
  };
}

/**
 * Le portefeuille entier.
 *
 * Le taux d'ensemble se calcule sur tous les mouvements réunis, jamais en
 * moyennant les taux des lignes : une ligne qui a porté mille francs pendant un
 * mois pèserait alors autant qu'une qui en a porté un million pendant trois ans.
 * C'est exactement l'erreur que ce rapport existe pour ne plus commettre.
 */
export function portfolioPerformance(parts: { line: LinePerformance; flows: MoneyFlow[] }[]): PortfolioPerformance {
  const lines = parts.map((p) => p.line);
  // Le total ne porte que les lignes qu'on sait valoriser. Les autres paraissent
  // dans le tableau avec ce qu'on y a versé, et sont annoncées à part : un total
  // qui les compterait à zéro afficherait une perte que personne n'a subie.
  const counted = parts.filter((p) => p.line.valuable);
  const sum = (pick: (l: LinePerformance) => number) => counted.reduce((t, p) => t + pick(p.line), 0);
  const apart = lines.filter((l) => !l.valuable);
  return {
    lines: [...lines].sort((a, b) => Number(b.valuable) - Number(a.valuable) || b.gain - a.gain),
    invested: sum((l) => l.invested),
    returned: sum((l) => l.returned),
    valued: sum((l) => l.valued),
    gain: sum((l) => l.gain),
    rate: xirr(counted.flatMap((p) => p.flows)),
    since: counted.map((p) => p.line.since).sort()[0],
    due: sum((l) => l.due),
    sold: counted.some((p) => p.line.sold),
    unvalued: apart.length,
    unvaluedInvested: apart.reduce((t, l) => t + l.invested, 0),
  };
}
