"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { applyResults, applySettlement, type LineResult } from "@/lib/results/service";

export type ResultsOutcome = { ok: true; message: string } | { ok: false; error: string };

/** Form fields: price_<offerId> / rate_<offerId>, alloc_<intentId>. */
export async function applyResultsAction(_p: ResultsOutcome | null, form: FormData): Promise<ResultsOutcome> {
  const desk = await requireDesk("/desk/resultats");
  const r = repo();
  const [offers, intents] = await Promise.all([r.listOffers(), r.listIntents()]);
  const offerIds = form.getAll("offerId").map(String);
  if (!offerIds.length) return { ok: false, error: "Aucune ligne." };
  const lines: LineResult[] = [];
  for (const offerId of offerIds) {
    const o = offers.find((x) => x.id === offerId);
    if (!o) continue;
    const price = form.get(`price_${offerId}`);
    const rate = form.get(`rate_${offerId}`);
    const allocations = intents
      .filter((i) => i.offerId === offerId && i.state === "transmise")
      .map((i) => {
        const v = form.get(`alloc_${i.id}`);
        const pct = v === null || v === "" ? 100 : Number(v);
        return { intentId: i.id, allocationPct: Math.max(0, Math.min(100, isNaN(pct) ? 100 : pct)) };
      });
    lines.push({ offerId, servedPricePct: price ? Number(price) : undefined, servedRatePct: rate ? Number(rate) : undefined, allocations });
  }
  try {
    const { served, notServed } = await applyResults(lines, desk.name);
    revalidatePath("/desk");
    revalidatePath("/desk/resultats");
    revalidatePath("/desk/documents");
    revalidatePath("/");
    return { ok: true, message: `Résultats appliqués : ${served} ordre${served > 1 ? "s" : ""} servi${served > 1 ? "s" : ""}, ${notServed} non servi${notServed > 1 ? "s" : ""}. Avis générés et clients prévenus.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec." };
  }
}

export async function applySettlementAction(_p: ResultsOutcome | null, form: FormData): Promise<ResultsOutcome> {
  const desk = await requireDesk("/desk/resultats");
  const offerIds = form.getAll("offerId").map(String);
  try {
    const n = await applySettlement(offerIds, desk.name);
    revalidatePath("/desk");
    revalidatePath("/desk/resultats");
    revalidatePath("/desk/documents");
    revalidatePath("/moi");
    return { ok: true, message: `Règlement confirmé : ${n} ordre${n > 1 ? "s" : ""} réglé${n > 1 ? "s" : ""}, avis d'opéré générés.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Échec." };
  }
}
