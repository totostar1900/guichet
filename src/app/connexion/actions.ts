"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authMode } from "@/lib/auth";
import { clearDevSession, writeDevSession } from "@/lib/auth/dev";
import type { Session } from "@/lib/auth/types";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

export type LoginState = { step: "email"; error?: string } | { step: "code"; email: string; error?: string } | { step: "phone"; error?: string } | { step: "phone-code"; phone: string; error?: string };

const safeNext = (n: unknown): string => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/* ---------- Supabase : e-mail OTP ---------- */

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.string().email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { step: "email", error: "Adresse e-mail invalide." };
  if (authMode() !== "supabase") return { step: "email", error: "Supabase n'est pas configuré." };
  // The e-mail always carries a link, and a code once the template prints {{ .Token }} (custom SMTP):
  // both work. The link is requested in the implicit flow on purpose: a PKCE link only opens in the
  // browser that asked for it, while a client reads the mail on the phone and taps the link from the mail
  // app. In the implicit flow the session comes back in the URL's hash, and AuthHashRedirect hands it to
  // the server (/auth/session), whatever the browser.
  const next = safeNext(form.get("next"));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { createClient } = await import("@supabase/supabase-js");
  const plain = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await plain.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: true, emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` } });
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
  role: z.enum(["client", "desk", "responsable"]),
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
    segment: role !== "client" ? "Desk Purpose Capital" : segment || "Personne physique",
    tier: role !== "client" ? 2 : 1,
    provider: "dev",
    mfaEnrolled: true,
    mfaVerified: true,
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

/* ---------- Appareils de confiance : clé d'accès ou code à 4 chiffres ---------- */

export async function passkeyOptions() {
  const { passkeyAuthenticationOptions } = await import("@/lib/auth/devices");
  return passkeyAuthenticationOptions();
}

export async function passkeyLogin(response: AuthenticationResponseJSON): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const { passkeyAuthenticate } = await import("@/lib/auth/devices");
  return passkeyAuthenticate(response);
}

export async function pinLogin(deviceId: string, token: string, pin: string): Promise<{ ok: true; name: string } | { ok: false; error: string; forgotten?: boolean; left?: number }> {
  if (!/^[a-zA-Z0-9-]{4,60}$/.test(deviceId) || !/^\d{4}$/.test(pin)) return { ok: false, error: "Le code comporte 4 chiffres." };
  const { pinAuthenticate } = await import("@/lib/auth/devices");
  return pinAuthenticate(deviceId, token, pin);
}
