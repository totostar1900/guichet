"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { requireResponsable } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/auth/types";
import { repo } from "@/lib/data";

export type TeamResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: z.enum(["desk", "responsable"]),
});

/** Gives desk access to an existing account (the person must have signed in once, or exist in auth). */
export async function addStaffAction(_p: TeamResult | null, form: FormData): Promise<TeamResult> {
  const me = await requireResponsable("/desk/equipe");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const r = repo();
  const who = await r.findProfileByEmail(p.data.email);
  if (!who) return { ok: false, error: `Aucun compte pour ${p.data.email} : la personne doit d'abord se connecter une fois au Guichet (code e-mail), puis vous lui donnez l'accès ici.` };
  const wasStaff = (await r.listStaff()).find((s) => s.id === who.id);
  await r.setRole(who.id, p.data.role, me.name);
  await audit("staff.role", "profile", who.id, { before: { role: wasStaff?.role ?? "client" }, after: { role: p.data.role, email: who.email } });
  await r.logEvent({ kind: "desk", html: `<b>${who.email ?? who.name}</b> : accès ${ROLE_LABEL[p.data.role].toLowerCase()} accordé par ${me.name}` });
  revalidatePath("/desk/equipe");
  return { ok: true, message: `${who.email ?? who.name} est maintenant ${ROLE_LABEL[p.data.role].toLowerCase()}.` };
}

const changeSchema = z.object({ userId: z.string().min(1), role: z.enum(["desk", "responsable", "client"]) });

/** Changes or removes someone's desk level. Never yourself; never the last responsable. */
export async function setRoleAction(_p: TeamResult | null, form: FormData): Promise<TeamResult> {
  const me = await requireResponsable("/desk/equipe");
  const p = changeSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Saisie invalide." };
  const { userId, role } = p.data;
  if (userId === me.userId) return { ok: false, error: "Vous ne pouvez pas modifier votre propre niveau : demandez à un autre responsable." };
  const r = repo();
  const staff = await r.listStaff();
  const target = staff.find((s) => s.id === userId);
  if (!target) return { ok: false, error: "Membre introuvable." };
  const responsables = staff.filter((s) => s.role === "responsable").length;
  if (target.role === "responsable" && role !== "responsable" && responsables <= 1) return { ok: false, error: "Il doit rester au moins un responsable." };
  await r.setRole(userId, role, me.name);
  await audit("staff.role", "profile", userId, { before: { role: target.role }, after: { role, email: target.email } });
  await r.logEvent({ kind: "desk", html: `<b>${target.email ?? target.name}</b> : ${role === "client" ? "accès desk retiré" : `niveau ${ROLE_LABEL[role].toLowerCase()}`} par ${me.name}` });
  revalidatePath("/desk/equipe");
  return { ok: true, message: role === "client" ? `Accès desk retiré à ${target.email ?? target.name}.` : `${target.email ?? target.name} : ${ROLE_LABEL[role].toLowerCase()}.` };
}
