"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authMode } from "@/lib/auth";
import { clearDevSession, writeDevSession } from "@/lib/auth/dev";
import type { Session } from "@/lib/auth/types";

export type LoginState = { step: "email"; error?: string } | { step: "code"; email: string; error?: string } | { step: "phone"; error?: string } | { step: "phone-code"; phone: string; error?: string };

const safeNext = (n: unknown): string => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/* ---------- Supabase : e-mail OTP ---------- */

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.string().email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { step: "email", error: "Adresse e-mail invalide." };
  if (authMode() !== "supabase") return { step: "email", error: "Supabase n'est pas configuré." };
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  // The e-mail carries a code when the template prints {{ .Token }} (custom SMTP) and always a link:
  // both work — the link lands on /auth/callback, which exchanges it for a session.
  const next = safeNext(form.get("next"));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await sb.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: true, emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) return { step: "email", error: `Envoi impossible : ${error.message}` };
  return { step: "code", email: email.data };
}

export async function verifyCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(form.get("next"));
  if (!/^\d{6,8}$/.test(token)) return { step: "code", email, error: "Le code comporte 6 chiffres." };
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, error: "Code incorrect ou expiré." };
  redirect(next);
}

/* ---------- Supabase : téléphone (SMS ou WhatsApp selon le fournisseur configuré) ---------- */

export async function sendPhoneCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const raw = String(form.get("phone") ?? "").replace(/[^\d+]/g, "");
  const phone = raw.startsWith("+") ? raw : `+${raw}`;
  if (!/^\+\d{8,15}$/.test(phone)) return { step: "phone", error: "Numéro au format international, ex. +237 6 87 67 67 67." };
  if (authMode() !== "supabase") return { step: "phone", error: "Supabase n'est pas configuré." };
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  const channel = process.env.PHONE_OTP_CHANNEL === "whatsapp" ? "whatsapp" : "sms";
  const { error } = await sb.auth.signInWithOtp({ phone, options: { channel, shouldCreateUser: true } });
  if (error) return { step: "phone", error: `Envoi impossible : ${error.message}` };
  return { step: "phone-code", phone };
}

export async function verifyPhoneCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = String(form.get("phone") ?? "");
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(form.get("next"));
  if (!/^\d{6,8}$/.test(token)) return { step: "phone-code", phone, error: "Le code comporte 6 chiffres." };
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  const { error } = await sb.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) return { step: "phone-code", phone, error: "Code incorrect ou expiré." };
  redirect(next);
}

/* ---------- Dev : session signée, sans service externe ---------- */

const devSchema = z.object({
  role: z.enum(["client", "desk"]),
  name: z.string().trim().min(2).max(60),
  segment: z.string().trim().max(80).optional(),
  next: z.string().optional(),
});

export async function devLogin(form: FormData): Promise<void> {
  if (authMode() !== "dev") return;
  const p = devSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return;
  const { role, name, segment, next } = p.data;
  const s: Session = {
    userId: `dev-${role}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    role,
    name,
    segment: role === "desk" ? "Desk Purpose Capital" : segment || "Personne physique",
    tier: role === "desk" ? 2 : 1,
    provider: "dev",
  };
  await writeDevSession(s);
  redirect(safeNext(next));
}

/* ---------- Déconnexion (les deux modes) ---------- */

export async function logout(): Promise<void> {
  if (authMode() === "supabase") {
    const { supabaseAuthClient } = await import("@/lib/auth/supabase");
    const sb = await supabaseAuthClient();
    await sb.auth.signOut();
  } else {
    await clearDevSession();
  }
  redirect("/");
}
