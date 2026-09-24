import "server-only";
import { repo } from "@/lib/data";
import type { Intent } from "@/lib/domain/types";

/**
 * Le taux de service d'une ligne : la part des occasions qui ont abouti.
 *
 * Deux mesures, et elles ne disent pas la même chose.
 *
 * Celle du marché : sur les séances où la ligne était cotée, combien l'ont vue
 * s'échanger. C'est la mesure qu'on a toujours, dès la première séance
 * dépouillée, et elle répond à la seule question qui vaille avant d'accepter un
 * ordre : est-ce qu'un ordre aurait eu une chance ?
 *
 * Celle du desk : sur nos propres ordres, combien ont été servis. C'est la
 * mesure qui compte, et elle demande des ordres. Tant qu'il y en a trois, elle
 * ne veut rien dire, et l'écran doit le dire plutôt que d'afficher un
 * pourcentage bâti sur un cas.
 *
 * Le constat du 24 septembre 2026, sur 266 séances : les actions traitent, de
 * 6 % des séances pour BANGE à 48 % pour SOCAP ; les trente-cinq lignes
 * obligataires n'ont jamais traité, pas une fois. Une colonne qui montre cela
 * change ce que le desk promet à un client.
 */
export interface LineFill {
  isin: string;
  /** Séances où la ligne figurait au bulletin. */
  sessions: number;
  /** Séances où elle s'est échangée. */
  traded: number;
  /** traded / sessions, ou undefined quand la ligne n'a jamais été cotée. */
  rate?: number;
  lastTradedOn?: string;
  titles: number;
  value: number;
}

/** Ce que nos propres ordres sont devenus, pour une ligne. */
export interface DeskFill {
  total: number;
  served: number;
  missed: number;
  closed: number;
  open: number;
  /** servis / (servis + non servis), ou undefined tant qu'aucun ordre n'est tranché. */
  rate?: number;
}

const DAY = 86_400_000;
export const since = (days: number): string => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);

/**
 * L'activité du marché par ISIN, sur les `days` derniers jours.
 *
 * Une fenêtre plutôt que tout l'historique : une ligne qui traitait en 2023 et
 * plus depuis ne doit pas se présenter comme liquide, et la requête reste
 * bornée à mesure que les bulletins s'accumulent.
 */
export async function lineFills(days = 365): Promise<Map<string, LineFill>> {
  const rows = await repo().quoteActivity(since(days)).catch(() => []);
  const out = new Map<string, LineFill>();
  for (const q of rows) {
    const v = out.get(q.isin) ?? { isin: q.isin, sessions: 0, traded: 0, titles: 0, value: 0 };
    v.sessions++;
    if (q.volumeTraded > 0 || q.trades > 0) {
      v.traded++;
      v.titles += q.volumeTraded;
      v.value += q.valueTraded;
      if (!v.lastTradedOn || q.sessionDate > v.lastTradedOn) v.lastTradedOn = q.sessionDate;
    }
    out.set(q.isin, v);
  }
  for (const v of out.values()) v.rate = v.sessions ? v.traded / v.sessions : undefined;
  return out;
}

const SERVED = new Set(["servie", "reglee"]);

/**
 * Ce que nos ordres sont devenus, ligne par ligne.
 *
 * Seuls les ordres tranchés entrent au dénominateur. Un ordre en cours n'est ni
 * un succès ni un échec, et le compter comme l'un ou l'autre ferait bouger le
 * taux au fil de la journée sans qu'il se soit rien passé.
 */
export function deskFills(intents: Intent[]): Map<string, DeskFill> {
  const out = new Map<string, DeskFill>();
  for (const i of intents) {
    const v = out.get(i.offerId) ?? { total: 0, served: 0, missed: 0, closed: 0, open: 0 };
    v.total++;
    if (SERVED.has(i.state)) v.served++;
    else if (i.state === "non_servie") v.missed++;
    else if (i.state === "annulee") v.closed++;
    else v.open++;
    out.set(i.offerId, v);
  }
  for (const v of out.values()) {
    const decided = v.served + v.missed;
    v.rate = decided ? v.served / decided : undefined;
  }
  return out;
}
