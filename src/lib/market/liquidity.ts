import type { Quote, QuoteActivity } from "@/lib/domain/market";

/**
 * La liquidité du marché secondaire, mesurée plutôt que qualifiée.
 *
 * « Marché étroit » est une opinion ; « quatre pour cent des lignes-séances
 * ont traité » est une mesure, et c'est elle qui doit figurer à côté d'un
 * cours. Sur une place où une ligne peut rester six semaines sans une seule
 * transaction, le cours affiché n'est pas un prix de marché mais un prix de
 * référence reporté, et la différence entre les deux décide de ce qu'un
 * portefeuille vaut.
 *
 * Trois mesures, du général au particulier.
 *
 *   La part traitée : le nombre de couples ligne-séance où quelque chose s'est
 *   échangé, sur le nombre de couples cotés. C'est le taux de service du
 *   marché, et il ne dépend d'aucune hypothèse.
 *
 *   Les séances muettes : celles où aucune ligne, sur toute la cote, n'a
 *   traité. Une place qui en compte un quart n'a pas la même nature qu'une
 *   place qui n'en compte aucune.
 *
 *   La dormance d'une ligne : les jours écoulés depuis sa dernière
 *   transaction. C'est la mesure qui qualifie un cours, et celle qui qualifie
 *   un indice calculé dessus.
 */

export interface LineLiquidity {
  isin: string;
  mnemo: string;
  instrument: Quote["instrument"];
  issuer: string;
  /** Séances où la ligne était cotée. */
  sessions: number;
  /** Séances où elle a traité. */
  traded: number;
  /** Traitées sur cotées, en %. */
  share: number;
  value: number;
  trades: number;
  /** Dernière séance avec une transaction, vide si la ligne n'a jamais traité. */
  lastTrade?: string;
  /** Jours depuis cette transaction, au jour d'observation. */
  staleDays?: number;
  close?: number;
}

export interface SessionLiquidity {
  date: string;
  quoted: number;
  traded: number;
  value: number;
  trades: number;
}

export interface Liquidity {
  /** Le dernier jour observé. */
  on: string;
  lineSessions: number;
  traded: number;
  /** Part traitée, en %. */
  share: number;
  value: number;
  trades: number;
  sessions: number;
  /** Séances où rien, sur aucune ligne, n'a traité. */
  mute: number;
  lines: LineLiquidity[];
  bySession: SessionLiquidity[];
}

const jours = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const aTraite = (q: { trades: number; volumeTraded: number }) => q.trades > 0 || q.volumeTraded > 0;

/**
 * Le carnet, replié.
 *
 * « lines » porte l'identité de chaque ligne : l'activité seule ne connaît que
 * des ISIN, et une page qui affiche un ISIN n'apprend rien à personne.
 */
export function liquidity(activity: QuoteActivity[], lines: Quote[]): Liquidity | undefined {
  if (!activity.length) return undefined;
  const on = activity.reduce((m, q) => (q.sessionDate > m ? q.sessionDate : m), activity[0].sessionDate);
  const identite = new Map(lines.map((q) => [q.isin, q]));

  const parLigne = new Map<string, LineLiquidity>();
  const parSeance = new Map<string, SessionLiquidity>();
  for (const q of activity) {
    const id = identite.get(q.isin);
    const l =
      parLigne.get(q.isin) ??
      ({ isin: q.isin, mnemo: id?.mnemo ?? q.isin, instrument: id?.instrument ?? "obligation", issuer: id?.issuer ?? "", sessions: 0, traded: 0, share: 0, value: 0, trades: 0, close: id?.close } satisfies LineLiquidity);
    l.sessions += 1;
    l.value += q.valueTraded;
    l.trades += q.trades;
    if (aTraite(q)) {
      l.traded += 1;
      if (!l.lastTrade || q.sessionDate > l.lastTrade) l.lastTrade = q.sessionDate;
    }
    parLigne.set(q.isin, l);

    const s = parSeance.get(q.sessionDate) ?? { date: q.sessionDate, quoted: 0, traded: 0, value: 0, trades: 0 };
    s.quoted += 1;
    s.value += q.valueTraded;
    s.trades += q.trades;
    if (aTraite(q)) s.traded += 1;
    parSeance.set(q.sessionDate, s);
  }

  const lignes = [...parLigne.values()]
    .map((l) => ({ ...l, share: (l.traded / l.sessions) * 100, staleDays: l.lastTrade ? jours(l.lastTrade, on) : undefined }))
    .sort((a, b) => b.share - a.share || b.value - a.value);
  const seances = [...parSeance.values()].sort((a, b) => a.date.localeCompare(b.date));
  const traded = lignes.reduce((s, l) => s + l.traded, 0);
  const lineSessions = lignes.reduce((s, l) => s + l.sessions, 0);

  return {
    on,
    lineSessions,
    traded,
    share: (traded / lineSessions) * 100,
    value: lignes.reduce((s, l) => s + l.value, 0),
    trades: lignes.reduce((s, l) => s + l.trades, 0),
    sessions: seances.length,
    mute: seances.filter((s) => s.traded === 0).length,
    lines: lignes,
    bySession: seances,
  };
}

/**
 * La fraîcheur de l'indice.
 *
 * Un indice n'est pas faux parce que ses composantes dorment : il est
 * simplement calculé sur des cours qui datent, et la seule faute serait de
 * publier le niveau sans publier cela. La mesure est le poids du panier coté
 * sur un cours dormant, et elle ne coûte aucune donnée nouvelle : tout est
 * dans les bulletins déjà lus.
 *
 * Faute d'une pondération publiée par la bourse, le compte se fait en nombre
 * de composantes et non en capitalisation. C'est une approximation, elle est
 * déclarée, et elle va dans le sens de la prudence : une grosse ligne qui dort
 * pèse plus que ce que ce compte montre.
 */
export interface Freshness {
  /** Les composantes retenues : les actions de la cote. */
  total: number;
  /** Celles qui ont traité au cours de la dernière séance. */
  tradedLast: number;
  /** Celles qui n'ont pas traité depuis plus de « seuil » jours. */
  stale: LineLiquidity[];
  seuilDays: number;
  /** La plus longue dormance du panier. */
  worstDays: number;
  /** Moyenne des composantes traitées par séance, sur les dernières séances observées. */
  tradedPerSession: number;
  window: number;
}

export function freshness(l: Liquidity, seuilDays = 7, window = 30): Freshness | undefined {
  const actions = l.lines.filter((x) => x.instrument === "action");
  if (!actions.length) return undefined;
  const derniers = l.bySession.slice(-window);
  const dernier = l.bySession.at(-1)?.date;
  return {
    total: actions.length,
    tradedLast: actions.filter((a) => a.lastTrade === dernier).length,
    stale: actions.filter((a) => (a.staleDays ?? Number.POSITIVE_INFINITY) > seuilDays),
    seuilDays,
    worstDays: Math.max(...actions.map((a) => a.staleDays ?? 0)),
    tradedPerSession: derniers.length ? derniers.reduce((s, x) => s + x.traded, 0) / derniers.length : 0,
    window: derniers.length,
  };
}
