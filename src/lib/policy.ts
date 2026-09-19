import "server-only";
import { cache } from "react";
import { repo } from "@/lib/data";
import type { Offer } from "@/lib/domain/types";
import { REF } from "@/lib/reference";

/**
 * Four-eyes without a bottleneck: the responsable delegates a window; inside
 * it an opérateur publishes alone, outside it the change waits for approval.
 * Stored in the reference table (kind "policy") so the responsable edits it in
 * the app; these defaults apply until then.
 */
export interface ApprovalPolicy {
  enabled: boolean;
  pricePct: { min: number; max: number }; // OTA / APE price window, % of nominal
  precountRate: { min: number; max: number }; // BTA, %
  quoteMovePct: number; // listed lines: a desk quote moving more than this vs the last price needs approval
  fundEntryFeeMax: number; // % : a fund published with higher fees needs approval
}

export const POLICY_DEFAULT: ApprovalPolicy = { enabled: true, pricePct: { min: 90, max: 100.5 }, precountRate: { min: 2, max: 9 }, quoteMovePct: 10, fundEntryFeeMax: 3 };
export const POLICY_KEY = "approbation";

export const loadPolicy = cache(async (): Promise<ApprovalPolicy> => {
  try {
    const rows = await repo().listReference(REF.policy);
    const row = rows.find((r) => r.key === POLICY_KEY);
    return row ? { ...POLICY_DEFAULT, ...(row.data as Partial<ApprovalPolicy>) } : POLICY_DEFAULT;
  } catch {
    return POLICY_DEFAULT;
  }
});

/** Why this offer, as about to be written, needs a responsable : or null when it is inside the window. */
export function approvalReason(next: Offer, prev: Offer | undefined, p: ApprovalPolicy): string | null {
  if (!p.enabled) return null;
  const out = (n: number, w: { min: number; max: number }) => n < w.min || n > w.max;
  if ((next.kind === "OTA" || next.kind === "APE") && next.pricePct != null && out(next.pricePct, p.pricePct)) return `Prix ${next.pricePct} % hors de la fenêtre déléguée (${p.pricePct.min}–${p.pricePct.max} %)`;
  if (next.kind === "BTA" && next.precountRate != null && out(next.precountRate, p.precountRate)) return `Taux précompté ${next.precountRate} % hors de la fenêtre déléguée (${p.precountRate.min}–${p.precountRate.max} %)`;
  if (next.kind === "MARCHE" && prev?.lastPrice && next.lastPrice && next.priceSource === "desk") {
    const move = Math.abs(next.lastPrice / prev.lastPrice - 1) * 100;
    if (move > p.quoteMovePct) return `Cours saisi à ${move.toFixed(1)} % du dernier cours (seuil ${p.quoteMovePct} %)`;
  }
  if (next.kind === "FONDS" && next.fund && next.fund.entryFeePct > p.fundEntryFeeMax) return `Frais d'entrée ${next.fund.entryFeePct} % au-dessus du plafond délégué (${p.fundEntryFeeMax} %)`;
  return null;
}
