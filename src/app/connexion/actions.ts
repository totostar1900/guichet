"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authMode } from "@/lib/auth";
import { clearDevSession, writeDevSession } from "@/lib/auth/dev";
import type { Session } from "@/lib/auth/types";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

export type LoginState = { step: "email"; error?: string } | { step: "code"; email: string; error?: string; withCode?: boolean } | { step: "phone"; error?: string } | { step: "phone-code"; phone: string; error?: string };

const safeNext = (n: unknown): string => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/* ---------- Supabase : e-mail OTP ---------- */

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.string().email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { step: "email", error: "Adresse e-mail invalide." };
  if (authMode() !== "supabase") return { step: "email", error: "Supabase n'est pas configuré." };
  const next = safeNext(form.get("next"));
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { createClient } = await import("@supabase/supabase-js");

  // With our own sender (Resend), the Guichet writes the e-mail itself: the six-digit code in large,
  // and a link that opens from any browser (token_hash). Supabase only mints the one-time token.
  const { emailConfigured, sendEmail } = await import("@/lib/notify/providers");
  if (emailConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    // A first visit: the address has no account yet; it is created, confirmed, so the token can be minted.
    let { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: email.data });
    if (error && /not found/i.test(error.message)) {
      await admin.auth.admin.createUser({ email: email.data, email_confirm: true });
      ({ data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: email.data }));
    }
    if (error || !data.properties?.email_otp || !data.properties.hashed_token) return { step: "email", error: `Envoi impossible : ${error?.message ?? "code indisponible"}` };
    const code = data.properties.email_otp;
    const link = `${base}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`;
    try {
      await sendEmail(email.data, `Votre code Guichet : ${code}`, codeEmailHtml(code, link), `Votre code de connexion Guichet : ${code}\nIl vaut dix minutes ; le dernier reçu est toujours le bon.\nVous préférez un lien ? ${link}`);
    } catch (e) {
      return { step: "email", error: `Envoi impossible : ${e instanceof Error ? e.message : "e-mail"}` };
    }
    return { step: "code", email: email.data, withCode: true };
  }

  // Without a sender of our own, Supabase's e-mail goes out: a link only (its template prints no code).
  // The link is requested in the implicit flow on purpose: a PKCE link only opens in the browser that
  // asked for it, while a client reads the mail on the phone and taps the link from the mail app. In the
  // implicit flow the session comes back in the URL's hash, and /auth/callback hands it to the server.
  const plain = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await plain.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: true, emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) return { step: "email", error: `Envoi impossible : ${error.message}` };
  return { step: "code", email: email.data };
}

/** The sign-in e-mail the Guichet sends itself: the code first, the link for those who prefer it. */
function codeEmailHtml(code: string, link: string): string {
  return `<div style="font-family:Manrope,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Purpose Capital · Guichet</p>
  <h1 style="margin:0 0 16px;font-size:20px">Votre code de connexion</h1>
  <p style="margin:0 0 8px">Saisissez ce code sur l'écran où vous êtes. Il vaut dix minutes ; le dernier reçu est toujours le bon.</p>
  <p style="margin:16px 0;font-size:34px;font-weight:800;letter-spacing:.24em;color:#0b2545">${code}</p>
  <p style="margin:0 0 8px;font-size:13px;color:#4b5563">Vous préférez un lien ? Il ouvre le Guichet dans votre navigateur :</p>
  <p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#0b2545;color:#fff;text-decoration:none;font-weight:700;font-size:14px">Ouvrir le Guichet</a></p>
  <p style="margin:0;font-size:12px;color:#6b7280">Vous n'avez rien demandé ? Ignorez cet e-mail : sans le code, personne n'entre. Purpose Capital S.A., société de bourse agréée COSUMAF · Yaoundé.</p>
</div>`;
}

export async function verifyCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(form.get("next"));
  if (!/^\d{6,8}$/.test(token)) return { step: "code", email, error: "Le code comporte 6 chiffres." };
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  // The code printed by Supabase's template verifies as "email"; the one minted by generateLink, as "magiclink".
  let { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) ({ error } = await sb.auth.verifyOtp({ email, token, type: "magiclink" }));
  if (error) return { step: "code", email, error: "Code incorrect ou expiré.", withCode: true };
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

/** « Se déconnecter partout » : every session of this account, on every device, ends now; the trusted devices stay listed under Sécurité. */
export async function logoutEverywhere(): Promise<void> {
  if (authMode() === "supabase") {
    const { supabaseAuthClient } = await import("@/lib/auth/supabase");
    const sb = await supabaseAuthClient();
    await sb.auth.signOut({ scope: "global" });
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
