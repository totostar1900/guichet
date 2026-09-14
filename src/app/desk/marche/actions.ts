"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { generateForIntent } from "@/lib/documents/generate";
import { positionFor } from "@/lib/documents/position";
import { fmt, fmtPrice } from "@/lib/format";
import { bocUrl, ingestBoc } from "@/lib/market/boc";
import { notifyIntentUpdated } from "@/lib/notify/dispatch";

export type MarketResult = { ok: true; message: string } | { ok: false; error: string };

const quoteSchema = z.object({
  offerId: z.string().min(1),
  lastPrice: z.coerce.number().positive(),
  bid: z.coerce.number().positive().optional(),
  ask: z.coerce.number().positive().optional(),
  lastPriceOn: z.string().optional(),
});

/** The desk updates a line's quote (last, bid, ask). Timestamped; the fiche shows the stamp. */
export async function updateQuoteAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim().replace(",", ".");
  });
  const p = quoteSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Cours invalide." };
  const r = repo();
  const o = await r.getOffer(p.data.offerId);
  if (!o || o.kind !== "MARCHE") return { ok: false, error: "Ligne introuvable." };
  const now = new Date();
  await r.upsertOffer({ ...o, lastPrice: p.data.lastPrice, bid: p.data.bid ?? o.bid, ask: p.data.ask ?? o.ask, lastPriceOn: p.data.lastPriceOn || now.toISOString().slice(0, 10), pricedAt: now.toISOString(), priceSource: "desk", priceNote: `Cours saisi par le desk (${desk.name}).`, version: o.version + 1 });
  await r.logEvent({ kind: "desk", offerId: o.id, html: `Cours <b>${o.title}</b> : ${o.instrument === "obligation" ? fmtPrice(p.data.lastPrice) : fmt(p.data.lastPrice) + " FCFA"}${p.data.bid ? ` · acheteur ${p.data.bid}` : ""}${p.data.ask ? ` · vendeur ${p.data.ask}` : ""} · par ${desk.name}` });
  revalidatePath("/");
  revalidatePath("/desk/marche");
  return { ok: true, message: "Cours mis à jour." };
}

const execSchema = z.object({
  intentId: z.string().min(1),
  executedPrice: z.coerce.number().positive(),
  executedUnits: z.coerce.number().positive(),
});

/** A placed order got executed (fully or partly): price and quantity → servie, avis d'exécution. */
export async function executeOrderAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const raw: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string" && v.trim()) raw[k] = v.trim().replace(",", ".");
  });
  const p = execSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "Prix et quantité exécutés requis." };
  const r = repo();
  const intents = await r.listIntents();
  const i = intents.find((x) => x.id === p.data.intentId);
  if (!i || (i.type !== "achat" && i.type !== "vente")) return { ok: false, error: "Ordre introuvable." };
  if (i.state !== "transmise") return { ok: false, error: "L'ordre doit être placé (transmis) avant exécution." };
  const o = await r.getOffer(i.offerId);
  if (!o) return { ok: false, error: "Ligne introuvable." };
  const asked = positionFor(i, o).units;
  const units = Math.min(p.data.executedUnits, asked);
  const updated = await r.updateIntent(i.id, { state: "servie", executedPrice: p.data.executedPrice, servedUnits: units, allocationPct: Math.round((units / Math.max(asked, 1)) * 100) });
  await r.logEvent({ kind: "desk", intentId: i.id, offerId: o.id, html: `${i.ref} (${i.clientName}) — <b>exécuté</b> ${fmt(units)} / ${fmt(asked)} à ${o.instrument === "obligation" ? fmtPrice(p.data.executedPrice) : fmt(p.data.executedPrice) + " FCFA"} · par ${desk.name}` });
  await notifyIntentUpdated(updated, o, "servie", desk.name);
  revalidatePath("/desk/marche");
  revalidatePath("/desk");
  return { ok: true, message: `Exécuté : ${fmt(units)} unité(s). Passez l'ordre en réglé après le règlement T+${o.settlementDays ?? 3}.` };
}

/** Settlement of an executed market order → position, avis d'opéré. */
export async function settleOrderAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const intentId = String(form.get("intentId") ?? "");
  const r = repo();
  const intents = await r.listIntents();
  const i = intents.find((x) => x.id === intentId);
  if (!i || i.state !== "servie") return { ok: false, error: "Ordre non exécuté." };
  const o = await r.getOffer(i.offerId);
  if (!o) return { ok: false, error: "Ligne introuvable." };
  const updated = await r.updateIntent(i.id, { state: "reglee" });
  await r.logEvent({ kind: "desk", intentId: i.id, offerId: o.id, html: `${i.ref} (${i.clientName}) — <b>réglé</b> · par ${desk.name}` });
  try {
    await generateForIntent("opere", i.id, { advisor: desk.name, allocation: (updated.allocationPct ?? 100) / 100 });
  } catch (e) {
    await r.logEvent({ kind: "system", intentId: i.id, html: `Avis d'opéré non généré : ${e instanceof Error ? e.message : "erreur"}` });
  }
  await notifyIntentUpdated(updated, o, "reglee", desk.name);
  revalidatePath("/desk/marche");
  revalidatePath("/desk");
  revalidatePath("/moi");
  return { ok: true, message: "Réglé : position mise à jour, avis d'opéré généré." };
}

/* ---------------- BVMAC bulletin ---------------- */

/** Desk asks for a given session's bulletin (default: today); same path as the cron. */
export async function ingestBocAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const date = String(form.get("sessionDate") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Date de séance invalide." };
  try {
    const res = await ingestBoc({ sessionDate: date, by: "desk" });
    if (!res.found) return { ok: false, error: `Aucun bulletin publié pour le ${date} à l'adresse BVMAC (${bocUrl(date)}). Réessayez plus tard ou déposez le PDF ci-dessous.` };
    if (res.error) return { ok: false, error: `Bulletin téléchargé mais illisible : ${res.error}.` };
    revalidatePath("/");
    revalidatePath("/desk");
    revalidatePath("/desk/marche");
    const b = res.bulletin!;
    return { ok: true, message: `BOC n° ${b.number} du ${date} ingéré par ${desk.name} : ${b.counts.equities} actions, ${b.counts.bonds} obligations, ${b.counts.funds} OPCVM${res.created.length ? ` · ${res.created.length} nouvelle(s) ligne(s)` : ""}${b.anomalies.length ? ` · ${b.anomalies.length} anomalie(s)` : ""}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ingestion impossible." };
  }
}

/** Fallback when the site is down or the URL changed: the desk drops the PDF it received by e-mail. */
export async function uploadBocAction(_p: MarketResult | null, form: FormData): Promise<MarketResult> {
  const desk = await requireDesk("/desk/marche");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Déposez le PDF du bulletin." };
  if (file.size > 15 * 1024 * 1024) return { ok: false, error: "PDF trop lourd (15 Mo max)." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fromName = file.name.match(/(\d{4})(\d{2})(\d{2})/);
  const guess = fromName ? `${fromName[1]}-${fromName[2]}-${fromName[3]}` : new Date().toISOString().slice(0, 10);
  try {
    const res = await ingestBoc({ sessionDate: guess, bytes, by: "desk", sourceUrl: `upload:${file.name}` });
    if (res.error) return { ok: false, error: `PDF illisible : ${res.error}.` };
    revalidatePath("/");
    revalidatePath("/desk");
    revalidatePath("/desk/marche");
    const b = res.bulletin!;
    return { ok: true, message: `BOC n° ${b.number} du ${b.sessionDate} ingéré depuis le fichier par ${desk.name}${b.anomalies.length ? ` · ${b.anomalies.length} anomalie(s)` : ""}.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ingestion impossible." };
  }
}

/** Show or hide an ingested line in the Guichet (it keeps being quoted). */
export async function toggleHiddenAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/marche");
  const id = String(form.get("offerId") ?? "");
  const r = repo();
  const o = await r.getOffer(id);
  if (!o || o.kind !== "MARCHE") return;
  await r.upsertOffer({ ...o, hidden: !o.hidden, version: o.version + 1 });
  await r.logEvent({ kind: "desk", offerId: o.id, html: `Ligne <b>${o.title}</b> ${o.hidden ? "affichée au" : "masquée du"} Guichet · par ${desk.name}` });
  revalidatePath("/");
  revalidatePath("/desk/marche");
}
