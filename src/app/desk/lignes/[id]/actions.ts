"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { isResponsable } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { ConflictError } from "@/lib/domain/types";
import { approvalReason, loadPolicy } from "@/lib/policy";
import { loadRegistry } from "@/lib/reference";

export type RestoreResult = { ok: true; message: string } | { ok: false; error: string };

const lifeSchema = z.object({ offerId: z.string().min(1), current: z.coerce.number().int().min(0), reason: z.string().trim().min(3, "Dites pourquoi (une phrase suffit).").max(300) });

/** Takes a line off the Guichet (status « retirée », hidden) : never deleted; the history and the intents stay. */
export async function withdrawOfferAction(_p: RestoreResult | null, form: FormData): Promise<RestoreResult> {
  const desk = await requireDesk("/desk");
  const p = lifeSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const r = repo();
  const cur = await r.getOffer(p.data.offerId);
  if (!cur) return { ok: false, error: "Ligne introuvable." };
  if (cur.status === "withdrawn") return { ok: false, error: "Déjà retirée." };
  const next = { ...cur, status: "withdrawn" as const, hidden: true, version: cur.version + 1, pricedAt: new Date().toISOString() };
  try {
    await r.upsertOffer(next, { expectedVersion: p.data.current, by: desk.name, note: `Retrait : ${p.data.reason}` });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  await audit("offer.withdraw", "offer", cur.id, { before: { status: cur.status, hidden: cur.hidden }, after: { status: "withdrawn", hidden: true }, reason: p.data.reason });
  await r.logEvent({ kind: "desk", offerId: cur.id, html: `<b>${cur.title}</b> retirée du Guichet par ${desk.name} : ${p.data.reason}` });
  for (const path of ["/", "/desk", "/desk/marche", "/fonds", `/desk/lignes/${cur.id}`]) revalidatePath(path);
  return { ok: true, message: "Ligne retirée du Guichet (historique conservé)." };
}

/** Puts a withdrawn line back : same four-eyes rule as a publication. */
export async function relistOfferAction(_p: RestoreResult | null, form: FormData): Promise<RestoreResult> {
  const desk = await requireDesk("/desk");
  await loadRegistry();
  const p = lifeSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const r = repo();
  const cur = await r.getOffer(p.data.offerId);
  if (!cur) return { ok: false, error: "Ligne introuvable." };
  if (cur.status !== "withdrawn") return { ok: false, error: "Cette ligne n'est pas retirée." };
  const next = { ...cur, status: "published" as const, hidden: cur.kind === "FONDS" ? !cur.fund?.distributed : false, version: cur.version + 1, pricedAt: new Date().toISOString() };
  const reason = approvalReason(next, cur, await loadPolicy());
  if (reason && !isResponsable(desk)) {
    const a = await r.createApproval({ kind: "offer_publish", entityId: cur.id, title: cur.title, payload: next, reason: `Remise en ligne : ${reason}`, requestedBy: desk.name });
    await audit("approval.request", "approval", a.id, { after: { offerId: cur.id, relist: true }, reason: p.data.reason });
    revalidatePath("/desk/approbations");
    return { ok: true, message: `Remise en ligne proposée à un responsable (${reason}).` };
  }
  try {
    await r.upsertOffer(next, { expectedVersion: p.data.current, by: desk.name, note: `Remise en ligne : ${p.data.reason}` });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  await audit("offer.relist", "offer", cur.id, { before: { status: cur.status, hidden: cur.hidden }, after: { status: "published", hidden: next.hidden }, reason: p.data.reason });
  await r.logEvent({ kind: "desk", offerId: cur.id, html: `<b>${cur.title}</b> remise en ligne par ${desk.name} : ${p.data.reason}` });
  for (const path of ["/", "/desk", "/desk/marche", "/fonds", `/desk/lignes/${cur.id}`]) revalidatePath(path);
  return { ok: true, message: "Ligne remise en ligne." };
}

const schema = z.object({ offerId: z.string().min(1), version: z.coerce.number().int().min(1), current: z.coerce.number().int().min(0), reason: z.string().trim().min(3, "Dites pourquoi (une phrase suffit).").max(300) });

/** Restores a past snapshot as a new version : the same four-eyes rule applies as for a publication. */
export async function restoreVersionAction(_p: RestoreResult | null, form: FormData): Promise<RestoreResult> {
  const desk = await requireDesk("/desk");
  await loadRegistry();
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const r = repo();
  const cur = await r.getOffer(p.data.offerId);
  if (!cur) return { ok: false, error: "Ligne introuvable." };
  if (cur.version !== p.data.current) return { ok: false, error: new ConflictError("offer", cur.id, p.data.current, cur.version).message };
  const v = (await r.listOfferVersions(cur.id)).find((x) => x.version === p.data.version);
  if (!v?.snapshot) return { ok: false, error: "Cette version n'a pas de fiche complète enregistrée (antérieure à l'historique)." };
  const next = { ...v.snapshot, id: cur.id, version: cur.version + 1, pricedAt: new Date().toISOString() };
  const reason = approvalReason(next, cur, await loadPolicy());
  if (reason && !isResponsable(desk)) {
    const a = await r.createApproval({ kind: "offer_publish", entityId: cur.id, title: cur.title, payload: next, reason: `Restauration de la v${v.version} : ${reason}`, requestedBy: desk.name });
    await audit("approval.request", "approval", a.id, { after: { offerId: cur.id, restore: v.version }, reason: p.data.reason });
    revalidatePath("/desk/approbations");
    return { ok: true, message: `Restauration proposée à un responsable (${reason}).` };
  }
  try {
    await r.upsertOffer(next, { expectedVersion: cur.version, by: desk.name, note: `Restauration de la v${v.version} : ${p.data.reason}` });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  await audit("offer.restore", "offer", cur.id, { before: cur, after: next, reason: `v${v.version} → v${next.version} : ${p.data.reason}` });
  await r.logEvent({ kind: "desk", offerId: cur.id, html: `<b>${cur.title}</b> : version ${v.version} restaurée en v${next.version} par ${desk.name} : ${p.data.reason}` });
  for (const path of ["/", "/desk", "/desk/marche", `/desk/lignes/${cur.id}`]) revalidatePath(path);
  return { ok: true, message: `Version ${v.version} restaurée (v${next.version}).` };
}
