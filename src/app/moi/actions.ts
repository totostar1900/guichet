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

/** The client keeps their own phone and e-mail current — the desk calls and sends documents from there. */
export async function contactAction(_p: ContactResult | null, form: FormData): Promise<ContactResult> {
  const s = await requireSession("/moi");
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^\+\d{8,15}$/.test(phone)) return { ok: false, error: "Numéro de téléphone incomplet — indicatif compris, ex. +237 6 87 67 67 67." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Adresse e-mail invalide." };
  await repo().updateContact(s.userId, { phone, email });
  revalidatePath("/moi");
  return { ok: true, phone, email };
}
