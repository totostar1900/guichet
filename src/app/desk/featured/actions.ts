"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ConflictError } from "@/lib/domain/types";
import { displayStatus, isActionable } from "@/lib/domain/status";

export type FeatureResult = { ok: true; message: string } | { ok: false; error: string } | { ok: false; plan: BroadcastPlan };

/** Qui serait prévenu, avant de prévenir qui que ce soit : le compte n’est connu que du serveur. */
export interface BroadcastPlan {
  recipients: number;
  pushDevices: number;
  capped: number;
  quiet: boolean;
  segment: string;
  title: string;
  reason: string;
}

const schema = z.object({
  offerId: z.string().min(1),
  reason: z.string().trim().min(4, "Donnez une raison factuelle (une phrase).").max(90, "Raison : 90 caractères maximum."),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin requise."),
});

const FORBIDDEN = /\b(meilleur|recommand|conseill|à saisir|profitez|garanti|sûr|opportunité en or|exceptionnel)/i;

/** « Sélection du desk » : a factual reason, an expiry, at most three at a time : audited, never a recommendation. */
export async function featureOfferAction(_p: FeatureResult | null, form: FormData): Promise<FeatureResult> {
  const desk = await requireDesk("/desk");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  if (FORBIDDEN.test(p.data.reason)) return { ok: false, error: "La raison doit rester factuelle (pas de « meilleur », « recommandé », « garanti »…) : une mise en avant n'est pas un conseil." };
  const r = repo();
  const offers = await r.listOffers();
  const o = offers.find((x) => x.id === p.data.offerId);
  if (!o) return { ok: false, error: "Ligne introuvable." };
  const today = new Date().toISOString().slice(0, 10);
  if (p.data.until < today) return { ok: false, error: "La date de fin est déjà passée." };
  const active = offers.filter((x) => x.id !== o.id && x.featured && x.featured.until >= today);
  if (active.length >= 3) return { ok: false, error: "Trois lignes au plus à la une : retirez-en une d'abord." };
  // Only a line a client can act on: open, closing, upcoming or quoted. A closed line is not a selection.
  if (o.hidden || !isActionable(displayStatus(o))) return { ok: false, error: "Cette ligne est clôturée ou retirée : elle ne peut pas être à la une." };
  const lineEnd = o.kind === "MARCHE" || o.kind === "FONDS" ? undefined : o.deadlineAt.slice(0, 10);
  if (lineEnd && p.data.until > lineEnd) return { ok: false, error: `La mise à la une ne peut pas dépasser la clôture de la ligne (${lineEnd}).` };
  const featured = { reason: p.data.reason, until: p.data.until, by: desk.name, at: new Date().toISOString() };
  try {
    await r.upsertOffer({ ...o, featured, version: o.version + 1 }, { expectedVersion: o.version, by: desk.name, note: `À la une : ${p.data.reason}` });
  } catch (e) {
    if (e instanceof ConflictError) return { ok: false, error: e.message };
    throw e;
  }
  await audit("offer.feature", "offer", o.id, { before: { featured: o.featured ?? null }, after: { featured }, reason: p.data.reason });
  await r.logEvent({ kind: "desk", offerId: o.id, html: `<b>${o.title}</b> mise à la une par ${desk.name} : ${p.data.reason} (jusqu'au ${p.data.until})` });
  for (const path of ["/", "/desk", `/offres/${o.id}`]) revalidatePath(path);
  return { ok: true, message: `${o.title} est à la une jusqu'au ${p.data.until}.` };
}

export async function unfeatureOfferAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk");
  const id = String(form.get("offerId") ?? "");
  const r = repo();
  const o = await r.getOffer(id);
  if (!o || !o.featured) return;
  await r.upsertOffer({ ...o, featured: undefined, version: o.version + 1 }, { expectedVersion: o.version, by: desk.name, note: "Retirée de la une" });
  await audit("offer.unfeature", "offer", o.id, { before: { featured: o.featured }, after: { featured: null } });
  await r.logEvent({ kind: "desk", offerId: o.id, html: `<b>${o.title}</b> retirée de la une par ${desk.name}` });
  for (const path of ["/", "/desk", `/offres/${o.id}`]) revalidatePath(path);
}

const bcSchema = z.object({ offerId: z.string().min(1), segment: z.string().default("Tous les clients"), confirm: z.string().optional() });

/**
 * « Diffuser comme opportunité du moment » : push + WhatsApp + e-mail to the
 * matching clients, one alert per client per day, quiet hours deferred. Above
 * 50 recipients, a responsable must be the one pressing the button.
 *
 * Deux temps, et c’est le seul geste du desk qui quitte la plateforme : un
 * WhatsApp ne se rattrape pas. Sans « confirm », l’action ne diffuse rien et
 * rend le plan, que l’écran affiche en toutes lettres ; la case à cocher qui
 * précédait pouvait être cochée avant d’avoir vu le moindre chiffre.
 */
export async function broadcastOpportunityAction(_p: FeatureResult | null, form: FormData): Promise<FeatureResult> {
  const desk = await requireDesk("/desk");
  const p = bcSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Saisie invalide." };
  const r = repo();
  const o = await r.getOffer(p.data.offerId);
  if (!o || !o.featured) return { ok: false, error: "Mettez d'abord la ligne à la une : la raison affichée est celle du message." };
  const { planBroadcast, broadcastOpportunity } = await import("@/lib/notify/broadcast");
  const { isResponsable } = await import("@/lib/auth/types");
  const plan = await planBroadcast(o, p.data.segment);
  if (plan.recipients.length === 0) return { ok: false, error: `Personne à prévenir${plan.capped ? ` (${plan.capped} déjà alerté${plan.capped > 1 ? "s" : ""} aujourd'hui)` : ""}.` };
  if (plan.recipients.length > 50 && !isResponsable(desk)) return { ok: false, error: `${plan.recipients.length} destinataires : au-delà de 50, un responsable doit lancer la diffusion.` };
  if (!p.data.confirm)
    return { ok: false, plan: { recipients: plan.recipients.length, pushDevices: plan.pushDevices, capped: plan.capped ?? 0, quiet: Boolean(plan.quiet), segment: p.data.segment, title: o.title, reason: o.featured.reason } };
  const tally = await broadcastOpportunity(o, o.featured.reason, p.data.segment, desk.name);
  await audit("offer.broadcast", "offer", o.id, { after: { segment: p.data.segment, ...tally }, reason: o.featured.reason });
  revalidatePath("/desk");
  return { ok: true, message: `Diffusé à ${tally.recipients} client${tally.recipients > 1 ? "s" : ""} : ${tally.sent} envoyé${tally.sent > 1 ? "s" : ""}, ${tally.queued} différé${tally.queued > 1 ? "s" : ""}, ${tally.skipped} en attente de configuration, ${tally.failed} en échec.` };
}
