"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { generateStatement } from "@/lib/documents/generate";
import { repo } from "@/lib/data";
import { normalizePhone } from "@/lib/format";

export type StatementResult = { ok: true; id: string; number: string } | { ok: false; error: string };

export async function statementAction(_p: StatementResult | null, form: FormData): Promise<StatementResult> {
  const s = await requireSession("/moi");
  const type = form.get("type") === "attestation" ? "attestation" : "releve";
  try {
    const d = await generateStatement(type, s.userId, s.name);
    revalidatePath("/moi");
    return { ok: true, id: d.id, number: d.number };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Génération impossible." };
  }
}

export type ContactResult = { ok: true; phone: string; email: string } | { ok: false; error: string };

/** The client keeps their own phone and e-mail current : the desk calls and sends documents from there. */
export async function contactAction(_p: ContactResult | null, form: FormData): Promise<ContactResult> {
  const s = await requireSession("/moi");
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^\+\d{8,15}$/.test(phone)) return { ok: false, error: "Numéro de téléphone incomplet : indicatif compris, ex. +237 6 87 67 67 67." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Adresse e-mail invalide." };
  await repo().updateContact(s.userId, { phone, email });
  revalidatePath("/moi");
  return { ok: true, phone, email };
}

/** The client accepts the legal text, this version of it; the journal keeps the day. */
export async function acceptTerms(version: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await requireSession("/");
  const { LEGAL_VERSION } = await import("@/data/legal");
  if (version !== LEGAL_VERSION) return { ok: false, error: "Le texte a changé entre-temps : rechargez la page." };
  await repo().setConsent(s.userId, version);
  await repo().logEvent({ kind: "system", html: `Mentions acceptées (version ${version}) par <b>${s.name}</b>` });
  revalidatePath("/", "layout");
  return { ok: true };
}

export type IdentityResult = { ok: true; name: string; segment: string } | { ok: false; error: string };

/** The client corrects their own name and city from the account sheet; the segment keeps its first part (« Personne physique »). */
export async function identityAction(_p: IdentityResult | null, form: FormData): Promise<IdentityResult> {
  const s = await requireSession("/moi");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  const city = String(form.get("city") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Indiquez votre nom tel qu'il figure sur votre pièce d'identité." };
  if (city.length > 60) return { ok: false, error: "Ville trop longue." };
  const kind = s.segment.split("·")[0].trim() || "Personne physique";
  const segment = city ? `${kind} · ${city}` : kind;
  await repo().updateContact(s.userId, { name, segment });
  revalidatePath("/", "layout");
  return { ok: true, name, segment };
}

/**
 * Ce que le client accepte de recevoir de notre initiative, canal par canal.
 *
 * Séparé des préférences : une préférence dit comment on nous joint le mieux,
 * un consentement dit si l'on a le droit d'écrire. Les messages liés à ses
 * ordres ne passent pas par là et ne se coupent pas : ils sont dus.
 */
export async function consentAction(channel: "whatsapp" | "email", on: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await requireSession("/moi");
  try {
    if (channel === "email") await repo().setEmailOptIn(s.userId, on);
    else await repo().setContactOptIn(s.userId, on);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  revalidatePath("/moi");
  return { ok: true };
}

/** One preference at a time, saved as soon as it is touched: how the desk reaches you first, statements by e-mail. */
export async function prefsAction(p: { reach?: "whatsapp" | "email" | "call"; statementsByEmail?: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await requireSession("/moi");
  const patch: { reach?: "whatsapp" | "email" | "call"; statementsByEmail?: boolean } = {};
  if (p.reach === "whatsapp" || p.reach === "email" || p.reach === "call") patch.reach = p.reach;
  if (typeof p.statementsByEmail === "boolean") patch.statementsByEmail = p.statementsByEmail;
  if (!Object.keys(patch).length) return { ok: false, error: "Rien à enregistrer." };
  try {
    await repo().setPrefs(s.userId, patch);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
