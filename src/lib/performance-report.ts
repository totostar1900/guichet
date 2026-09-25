import type { Intent, Offer } from "@/lib/domain/types";
import { linePerformance, portfolioPerformance, type PortfolioPerformance } from "@/lib/domain/performance";
import { positionFor } from "@/lib/documents/position";
import { positionsFrom } from "@/lib/positions";
import { localIso } from "@/lib/format";

/**
 * Le rapport d'un client, assemblé à partir de ce que l'application sait déjà.
 *
 * Les mouvements viennent des ordres réglés, la valeur du jour et les coupons
 * échus viennent des positions. Rien n'est stocké : le rapport se recalcule à
 * chaque lecture, ce qui évite qu'un chiffre gardé en base vieillisse en
 * silence et finisse par contredire la page d'à côté.
 *
 * Les positions arrivent une par ordre d'achat ; elles se regroupent ici par
 * ligne, parce que c'est par ligne qu'un épargnant lit son portefeuille, et non
 * par bulletin de souscription.
 */
export function buildPerformance(intents: Intent[], offers: Offer[], now = new Date()): PortfolioPerformance {
  const today = localIso(now);
  const byId = new Map(offers.map((o) => [o.id, o]));
  const positions = positionsFrom(intents, offers, now);

  const held = new Map<string, { units: number; marketValue: number; valuedOn?: string; paid: { date: string; amount: number; label: string }[] }>();
  for (const p of positions) {
    const v = held.get(p.offer.id) ?? { units: 0, marketValue: 0, valuedOn: undefined as string | undefined, paid: [] };
    v.units += p.units;
    v.marketValue += p.marketValue ?? 0;
    v.valuedOn = p.valuedOn ?? v.valuedOn;
    v.paid.push(...p.paid);
    held.set(p.offer.id, v);
  }

  const touched = [...new Set(intents.map((i) => i.offerId))];
  const parts = touched
    .map((id) => {
      const o = byId.get(id);
      if (!o) return null;
      return linePerformance(o, intents, held.get(id), (i) => positionFor(i, o).total, today);
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return portfolioPerformance(parts);
}
