import "server-only";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { AuditEntry } from "@/lib/domain/types";

/**
 * One call per business action: who (session), what (action + entity), the
 * record before and after, why (reason when the desk gave one), from where
 * (IP, user agent). The repository chains the hashes; nothing edits a line.
 */
export async function audit(action: string, entity: string, entityId: string, detail: { before?: unknown; after?: unknown; reason?: string; actor?: string } = {}): Promise<AuditEntry> {
  let actor = detail.actor ?? "système";
  let actorId: string | undefined;
  let ip: string | undefined;
  let userAgent: string | undefined;
  try {
    const s = await getSession();
    if (s) {
      actor = detail.actor ?? s.email ?? s.name;
      actorId = s.provider === "supabase" ? s.userId : undefined;
    }
  } catch {
    // crons and webhooks have no session
  }
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
    userAgent = h.get("user-agent")?.slice(0, 200) ?? undefined;
  } catch {
    // no request scope
  }
  return repo().logAudit({ actor, actorId, action, entity, entityId, before: detail.before, after: detail.after, reason: detail.reason, ip, userAgent });
}

/** Field-level differences between two records, for the version history and the audit view. */
export function diffRecords(a: unknown, b: unknown, ignore: string[] = ["version", "pricedAt", "priceNote"]): { key: string; before: unknown; after: unknown }[] {
  const A = (a ?? {}) as Record<string, unknown>;
  const B = (b ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((k) => !ignore.includes(k));
  const out: { key: string; before: unknown; after: unknown }[] = [];
  for (const k of keys) {
    const x = JSON.stringify(A[k] ?? null);
    const y = JSON.stringify(B[k] ?? null);
    if (x !== y) out.push({ key: k, before: A[k], after: B[k] });
  }
  return out;
}

/** French labels for the offer fields that show up in diffs. */
export const FIELD_FR: Record<string, string> = {
  pricePct: "Prix Purpose (%)",
  precountRate: "Taux précompté (%)",
  minTitles: "Ticket minimum (titres)",
  commissionPct: "Commission (%)",
  lastPrice: "Dernier cours",
  lastPriceOn: "Date du cours",
  bid: "Acheteur",
  ask: "Vendeur",
  hidden: "Masqué",
  status: "Statut",
  title: "Titre",
  blurb: "Description",
  deadlineAt: "Dépôt des offres",
  opensAt: "Ouverture",
  resultsAt: "Résultats",
  settleOn: "Règlement",
  maturityOn: "Échéance",
  couponRate: "Coupon (%)",
  nominal: "Nominal",
  documents: "Documents",
  typeKey: "Type de produit",
  extra: "Champs libres",
  fund: "Conditions du fonds",
  priceSource: "Source du prix",
  resultLine: "Résultat",
  isExample: "Exemple",
};
