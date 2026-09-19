"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ConflictError } from "@/lib/domain/types";
import { notifyOfferPublished } from "@/lib/notify/dispatch";
import { loadRegistry, REF } from "@/lib/reference";
import { POLICY_DEFAULT, POLICY_KEY, type ApprovalPolicy } from "@/lib/policy";

export type ApprovalResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({ id: z.string().min(1), decision: z.enum(["approuve", "refuse"]), note: z.string().trim().max(500).optional() });

/** A responsable approves (writes the proposed record) or refuses (with a note) an opérateur's proposal. */
export async function decideApprovalAction(_p: ApprovalResult | null, form: FormData): Promise<ApprovalResult> {
  const me = await requireResponsable("/desk/approbations");
  await loadRegistry();
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Saisie invalide." };
  const r = repo();
  const a = (await r.listApprovals(true)).find((x) => x.id === p.data.id);
  if (!a) return { ok: false, error: "Proposition introuvable ou déjà traitée." };
  if (a.requestedBy === me.name) return { ok: false, error: "Quatre yeux : la personne qui propose ne peut pas approuver." };
  if (p.data.decision === "refuse") {
    if (!p.data.note) return { ok: false, error: "Un refus s'explique : ajoutez une note pour l'opérateur." };
    await r.decideApproval(a.id, "refuse", me.name, p.data.note);
    await audit("approval.decide", "approval", a.id, { before: { decision: null }, after: { decision: "refuse", note: p.data.note }, reason: a.reason });
    await r.logEvent({ kind: "desk", offerId: a.entityId, html: `<b>${a.title}</b> : proposition de ${a.requestedBy} refusée par ${me.name} : ${p.data.note}` });
    revalidatePath("/desk/approbations");
    return { ok: true, message: "Proposition refusée ; l'opérateur voit la note dans le journal." };
  }
  const current = await r.getOffer(a.entityId);
  const next = { ...a.payload, version: (current?.version ?? 0) + 1, pricedAt: new Date().toISOString() };
  try {
    await r.upsertOffer(next, { expectedVersion: current?.version, by: `${a.requestedBy} / ${me.name}`, note: `Approuvé : ${a.reason}` });
  } catch (e) {
    if (e instanceof ConflictError) return { ok: false, error: e.message };
    throw e;
  }
  await r.decideApproval(a.id, "approuve", me.name, p.data.note);
  await audit(a.kind === "offer_quote" ? "offer.quote" : "offer.publish", "offer", a.entityId, { before: current, after: next, reason: `Approbation de ${me.name} · ${a.reason}` });
  await audit("approval.decide", "approval", a.id, { before: { decision: null }, after: { decision: "approuve", note: p.data.note }, reason: a.reason });
  await r.logEvent({ kind: "desk", offerId: a.entityId, html: `<b>${a.title}</b> : proposition de ${a.requestedBy} approuvée par ${me.name} (v${next.version})` });
  if (a.kind === "offer_publish" && next.kind !== "FONDS" && next.kind !== "MARCHE") {
    const m = /diffusion ([^·]+) · (.+)$/.exec(a.reason);
    await notifyOfferPublished(next, m ? m[1].split(",").map((s) => s.trim()) : ["Guichet web"], m?.[2] ?? "Tous les clients");
  }
  for (const path of ["/", "/desk", "/desk/marche", "/desk/a-valider", "/desk/approbations", "/fonds"]) revalidatePath(path);
  return { ok: true, message: `Approuvé et publié (v${next.version}).` };
}

const policySchema = z.object({
  enabled: z.string().optional(),
  priceMin: z.coerce.number().min(50).max(150),
  priceMax: z.coerce.number().min(50).max(150),
  rateMin: z.coerce.number().min(0).max(30),
  rateMax: z.coerce.number().min(0).max(30),
  quoteMovePct: z.coerce.number().min(0).max(100),
  fundEntryFeeMax: z.coerce.number().min(0).max(10),
});

/** The delegated window: what an opérateur may publish alone. Responsable only, audited. */
export async function savePolicyAction(_p: ApprovalResult | null, form: FormData): Promise<ApprovalResult> {
  const me = await requireResponsable("/desk/approbations");
  const p = policySchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Valeurs invalides." };
  const d = p.data;
  if (d.priceMin > d.priceMax || d.rateMin > d.rateMax) return { ok: false, error: "Le minimum doit rester sous le maximum." };
  const next: ApprovalPolicy = { enabled: d.enabled === "on", pricePct: { min: d.priceMin, max: d.priceMax }, precountRate: { min: d.rateMin, max: d.rateMax }, quoteMovePct: d.quoteMovePct, fundEntryFeeMax: d.fundEntryFeeMax };
  const r = repo();
  const before = (await r.listReference(REF.policy)).find((x) => x.key === POLICY_KEY)?.data ?? POLICY_DEFAULT;
  await r.upsertReference(REF.policy, POLICY_KEY, next, me.name);
  await audit("policy.update", "reference", `${REF.policy}/${POLICY_KEY}`, { before, after: next });
  await r.logEvent({ kind: "desk", html: `Fenêtre déléguée modifiée par ${me.name} : prix ${next.pricePct.min}–${next.pricePct.max} %, taux ${next.precountRate.min}–${next.precountRate.max} %, cours ±${next.quoteMovePct} %, frais ≤ ${next.fundEntryFeeMax} %${next.enabled ? "" : " · désactivée"}` });
  revalidatePath("/desk/approbations");
  return { ok: true, message: "Fenêtre déléguée enregistrée." };
}
