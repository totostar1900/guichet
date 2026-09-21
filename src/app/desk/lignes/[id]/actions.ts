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
import { saveSource } from "@/lib/intake/storage";

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

/* ---------- the documents a client sees on the line : real files only ---------- */

const safeName = (n: string) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "document";

/** Attaches a file (PDF or image) to the line, kept in the « sources » bucket and served at /offres/<id>/doc/<n>. */
export async function attachDocumentAction(_p: RestoreResult | null, form: FormData): Promise<RestoreResult> {
  const desk = await requireDesk("/desk");
  const offerId = String(form.get("offerId") ?? "");
  const current = Number(form.get("current") ?? 0);
  const name = String(form.get("name") ?? "").trim();
  const file = form.get("file");
  if (name.length < 3) return { ok: false, error: "Donnez un titre au document." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Déposez un fichier PDF ou image." };
  if (file.size > 15 * 1024 * 1024) return { ok: false, error: "Fichier trop lourd (15 Mo max)." };
  const mime = file.type || "application/pdf";
  if (!/^(application\/pdf|image\/(png|jpeg))$/.test(mime)) return { ok: false, error: "PDF, PNG ou JPEG seulement." };
  const r = repo();
  const cur = await r.getOffer(offerId);
  if (!cur) return { ok: false, error: "Ligne introuvable." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileKey = `lignes/${cur.id}/${Date.now()}-${safeName(file.name)}`;
  await saveSource(fileKey, bytes, mime);
  const pages = mime === "application/pdf" ? (bytes.length > 0 ? (Buffer.from(bytes).toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length : 0) : 0;
  const doc = { name, meta: `${mime === "application/pdf" ? "PDF" : "Image"}${pages ? ` · ${pages} p.` : ""}`, fileKey, mimeType: mime, addedAt: new Date().toISOString(), addedBy: desk.name };
  const next = { ...cur, documents: [...cur.documents, doc], version: cur.version + 1, pricedAt: new Date().toISOString() };
  try {
    await r.upsertOffer(next, { expectedVersion: current, by: desk.name, note: `Document joint : ${name}` });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  await audit("offer.document", "offer", cur.id, { after: { name, fileKey } });
  await r.logEvent({ kind: "desk", offerId: cur.id, html: `<b>${cur.title}</b> : document joint « ${name} » par ${desk.name}` });
  for (const path of ["/", `/offres/${cur.id}`, `/desk/lignes/${cur.id}`, "/desk/depot"]) revalidatePath(path);
  return { ok: true, message: `« ${name} » joint : la fiche client l'affiche.` };
}

/** Removes a document entry from the line (the file stays in the bucket for the audit trail). */
export async function removeDocumentAction(_p: RestoreResult | null, form: FormData): Promise<RestoreResult> {
  const desk = await requireDesk("/desk");
  const offerId = String(form.get("offerId") ?? "");
  const current = Number(form.get("current") ?? 0);
  const index = Number(form.get("index") ?? -1);
  const r = repo();
  const cur = await r.getOffer(offerId);
  if (!cur || !cur.documents[index]) return { ok: false, error: "Document introuvable." };
  const removed = cur.documents[index];
  const next = { ...cur, documents: cur.documents.filter((_, i) => i !== index), version: cur.version + 1, pricedAt: new Date().toISOString() };
  try {
    await r.upsertOffer(next, { expectedVersion: current, by: desk.name, note: `Document retiré : ${removed.name}` });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  await audit("offer.document.remove", "offer", cur.id, { before: { name: removed.name, fileKey: removed.fileKey } });
  await r.logEvent({ kind: "desk", offerId: cur.id, html: `<b>${cur.title}</b> : document retiré « ${removed.name} » par ${desk.name}` });
  for (const path of ["/", `/offres/${cur.id}`, `/desk/lignes/${cur.id}`, "/desk/depot"]) revalidatePath(path);
  return { ok: true, message: `« ${removed.name} » retiré de la fiche.` };
}
