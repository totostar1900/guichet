import { displayYield } from "./status";
import type { OfferSummary } from "./summary";
import type { Offer } from "./types";

/**
 * LA LIGNE DE SYNTHÈSE DES SÉANCES, sous les outils de la page des adjudications (6 novembre 2026, planche « 3A »).
 *
 * Combien de séances se jouent (ouvertes ou à venir), entre quels rendements actuariels, et quand ferme la prochaine. Rien n'est recalculé : le rendement est celui que la
 * ligne affiche déjà (`displayYield`). Un taux « au pair » est un taux nominal, un rachat n'a pas de rendement : ni l'un ni l'autre n'entre dans la fourchette, qui ne
 * mélangerait sinon pas la même chose. Calculée sur les lignes que la page montre, filtres compris.
 */
export interface SyntheseDesSeances {
  aJouer: number;
  rendementMin?: number;
  rendementMax?: number;
  /** L'échéance de dépôt la plus proche (ISO), aujourd'hui compris. */
  prochaineCloture?: string;
}

export function syntheseDesSeances(rows: { o: Offer; s: OfferSummary }[], nowIso: string): SyntheseDesSeances {
  const ouvertes = rows.filter(({ s }) => !s.past);
  const rendements = ouvertes
    .filter(({ o }) => o.kind === "OTA" || o.kind === "APE" || o.kind === "BTA")
    .map(({ o }) => displayYield(o))
    .filter((d) => d.pct != null && !d.atPar)
    .map((d) => d.pct as number);
  const jour = nowIso.slice(0, 10);
  const clotures = ouvertes
    .map(({ o }) => o.deadlineAt)
    .filter((d): d is string => Boolean(d) && (d as string).slice(0, 10) >= jour)
    .sort();
  return {
    aJouer: ouvertes.length,
    ...(rendements.length ? { rendementMin: Math.min(...rendements), rendementMax: Math.max(...rendements) } : {}),
    ...(clotures.length ? { prochaineCloture: clotures[0] } : {}),
  };
}
