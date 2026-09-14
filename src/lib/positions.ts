import type { Intent, Offer } from "@/lib/domain/types";
import { positionFor } from "@/lib/documents/position";
import { parseDate } from "@/lib/finance";
import { localIso } from "@/lib/format";

/**
 * A position is what a settled order became: units of a line held by a client,
 * with the cash flows still to come. Derived, never stored — the intents are
 * the ledger.
 */
export interface Position {
  intent: Intent;
  offer: Offer;
  units: number;
  unitWord: string;
  nominalAmount: number;
  costBasis: number; // total settled (incl. commission)
  flows: { date: string; amount: number; label: string }[]; // future flows only
  nextFlow?: { date: string; amount: number; label: string };
  maturityOn?: string;
}

export function servedUnits(i: Intent, o: Offer): number {
  if (i.servedUnits != null) return i.servedUnits;
  const p = positionFor(i, o);
  const ratio = i.allocationPct != null ? i.allocationPct / 100 : 1;
  return Math.floor(p.units * ratio);
}

export function positionsFrom(intents: Intent[], offers: Offer[], now = new Date()): Position[] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  const today = localIso(now);
  // Sales settled on the secondary market reduce the earliest holdings of the same line (FIFO).
  const sold = new Map<string, number>();
  intents
    .filter((i) => i.state === "reglee" && i.type === "vente")
    .forEach((i) => {
      const o = byId.get(i.offerId);
      if (!o) return;
      const key = `${i.clientId}|${o.isin}`;
      sold.set(key, (sold.get(key) ?? 0) + servedUnits(i, o));
    });
  return intents
    .filter((i) => i.state === "reglee" && (i.type === "ferme" || i.type === "appetit" || i.type === "achat"))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .flatMap((i) => {
      const o = byId.get(i.offerId);
      if (!o) return [];
      let units = servedUnits(i, o);
      const key = `${i.clientId}|${o.isin}`;
      const toDeduct = Math.min(units, sold.get(key) ?? 0);
      if (toDeduct) {
        units -= toDeduct;
        sold.set(key, (sold.get(key) ?? 0) - toDeduct);
      }
      if (!units) return [];
      const p = positionFor(i, o, { pricePct: o.servedPricePct, unitsOverride: units });
      const flows = p.schedule.map((f) => ({ date: localIso(f.date), amount: f.amount, label: f.label })).filter((f) => f.date >= today);
      return [{ intent: i, offer: o, units, unitWord: p.unitWord, nominalAmount: p.nominalAmount, costBasis: p.total, flows, nextFlow: flows[0], maturityOn: o.maturityOn }];
    })
    .sort((a, b) => (a.nextFlow?.date ?? "9999").localeCompare(b.nextFlow?.date ?? "9999"));
}

/** Flows falling within `days` of now (coupon notices). */
export function upcomingFlows(positions: Position[], days: number, now = new Date()): { position: Position; flow: Position["flows"][number]; inDays: number }[] {
  const t0 = parseDate(localIso(now)).getTime();
  return positions.flatMap((p) => p.flows.map((flow) => ({ position: p, flow, inDays: Math.round((parseDate(flow.date).getTime() - t0) / 86400e3) }))).filter((x) => x.inDays >= 0 && x.inDays <= days);
}
