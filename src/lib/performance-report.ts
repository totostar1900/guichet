import type { Intent, Offer } from "@/lib/domain/types";
import type { CashEntry } from "@/lib/domain/cash";
import { suivre } from "@/lib/domain/encaissement";
import { linePerformance, portfolioPerformance, type MoneyFlow, type PortfolioPerformance } from "@/lib/domain/performance";
import { positionFor } from "@/lib/documents/position";
import { positionsFrom } from "@/lib/positions";
import { localIso } from "@/lib/format";

/**
 * Le rapport d'un client, assemblé à partir de ce que l'application sait déjà.
 *
 * Les mouvements viennent des ordres réglés, la valeur du jour vient des
 * positions, et les coupons viennent du JOURNAL DES ESPÈCES : seul ce qui y est
 * inscrit contre une pièce compte comme de l'argent revenu. Le rapport lisait
 * l'échéancier, donc comptait un coupon dès que sa date était passée.
 *
 * Rien n'est stocké : le rapport se recalcule à chaque lecture, ce qui évite
 * qu'un chiffre gardé en base vieillisse en silence et finisse par contredire
 * la page d'à côté. Ici cela devient un service rendu : le jour où le desk
 * constate un encaissement en retard, le rendement du client se corrige seul.
 *
 * Les positions arrivent une par ordre d'achat ; elles se regroupent ici par
 * ligne, parce que c'est par ligne qu'un épargnant lit son portefeuille, et non
 * par bulletin de souscription.
 */
export function buildPerformance(intents: Intent[], offers: Offer[], cash: CashEntry[] = [], now = new Date()): PortfolioPerformance {
  return buildPerformanceParts(intents, offers, cash, now).perf;
}

/**
 * Le rapport ET les mouvements qui le fondent.
 *
 * La courbe du portefeuille a besoin des flux, que le rapport jetait après les
 * avoir agrégés. Les recalculer ailleurs aurait donné deux assemblages du même
 * argent, donc deux occasions de diverger ; il n'y en a qu'un, et il rend les
 * deux.
 *
 * Le point de valorisation reste dedans, nommé : c'est au lecteur de la courbe
 * de l'écarter, parce que c'est lui qui sait qu'il ne dessine que des
 * mouvements.
 */
export function buildPerformanceParts(intents: Intent[], offers: Offer[], cash: CashEntry[] = [], now = new Date()): { perf: PortfolioPerformance; mouvements: MoneyFlow[] } {
  const today = localIso(now);
  const byId = new Map(offers.map((o) => [o.id, o]));
  const positions = positionsFrom(intents, offers, now);

  /* Le rapprochement se fait AVANT le regroupement par ligne, parce que la clef
     d'un flux porte l'opération et non la ligne : deux souscriptions sur le même
     titre ont deux échéanciers et deux clefs, et les mélanger d'abord rendrait
     le rapprochement impossible. */
  const suivis = suivre(
    positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.echus, aVenir: p.flows })),
    cash,
    now,
  );
  const ligneDe = new Map(positions.map((p) => [p.intent.id, p.offer.id]));

  const held = new Map<string, { units: number; marketValue: number; valuedOn?: string; recus: { date: string; amount: number; label: string }[]; attendus: number }>();
  const pour = (id: string) => {
    const v = held.get(id) ?? { units: 0, marketValue: 0, valuedOn: undefined as string | undefined, recus: [], attendus: 0 };
    held.set(id, v);
    return v;
  };
  for (const p of positions) {
    const v = pour(p.offer.id);
    v.units += p.units;
    v.marketValue += p.marketValue ?? 0;
    v.valuedOn = p.valuedOn ?? v.valuedOn;
  }
  for (const f of suivis) {
    const id = ligneDe.get(f.intentId);
    if (!id) continue;
    if (f.etat === "encaisse") pour(id).recus.push({ date: f.encaisseLe ?? f.date, amount: f.montantRecu ?? f.amount, label: f.label });
    else if (f.etat === "attendu") pour(id).attendus += 1;
  }

  const touched = [...new Set(intents.map((i) => i.offerId))];
  const parts = touched
    .map((id) => {
      const o = byId.get(id);
      if (!o) return null;
      return linePerformance(o, intents, held.get(id), (i) => positionFor(i, o).total, today);
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return { perf: portfolioPerformance(parts), mouvements: parts.flatMap((p) => p.flows) };
}
