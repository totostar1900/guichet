"use server";

import { FORME_DU_CODE, MESSAGE_FORME_DU_CODE } from "@/lib/verrou";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { deskOrigin, isDeskHost } from "@/lib/hosts";
import { z } from "zod";
import { authMode } from "@/lib/auth";
import { clearDevSession, writeDevSession } from "@/lib/auth/dev";
import type { Session } from "@/lib/auth/types";

export type LoginState = { step: "email"; error?: string } | { step: "code"; email: string; error?: string; withCode?: boolean } | { step: "phone"; error?: string } | { step: "phone-code"; phone: string; error?: string };

const safeNext = (n: unknown): string => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/* ---------- Supabase : e-mail OTP ---------- */

export async function sendCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = z.string().email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { step: "email", error: "Adresse e-mail invalide." };
  if (authMode() !== "supabase") return { step: "email", error: "Supabase n'est pas configuré." };
  const next = safeNext(form.get("next"));
  // The link in the e-mail opens on the host that asked: the desk host keeps its own session.
  const host = (await headers()).get("host");
  const base = isDeskHost(host) ? deskOrigin() : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const { sendSignInCode } = await import("@/lib/auth/email-code");
  const sent = await sendSignInCode(email.data, base, next);
  if (!sent.ok) return { step: "email", error: sent.error };
  return { step: "code", email: email.data, withCode: sent.withCode };
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
  /* Le numéro sert à une seule chose en développement : exercer un accès
     nommé. Sans lui, la connexion d essai ne porte aucun canal, et le socle
     du compte à plusieurs mains ne se teste qu en forgeant un cookie. */
  phone: z.string().trim().max(30).optional(),
  next: z.string().optional(),
});

export async function devLogin(form: FormData): Promise<void> {
  if (authMode() !== "dev") return;
  const p = devSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return;
  const { role, name, segment, phone, next } = p.data;
  const s: Session = {
    userId: `dev-${role}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    role,
    name,
    segment: role !== "client" ? "Desk Purpose Capital" : segment || "Personne physique",
    tier: role !== "client" ? 2 : 1,
    ...(role === "client" && phone ? { phone, phoneVerified: true } : {}),
    provider: "dev",
    mfaEnrolled: true,
    mfaVerified: true,
  };
  await writeDevSession(s);
  redirect(safeNext(next));
}

/* ---------- Déconnexion (les deux modes) ---------- */

/* APRÈS UNE SORTIE, ON ARRIVE SUR LA PORTE, PAS SUR LA VITRINE (21 novembre 2026, le client : « une fois totalement déconnecté, il est demandé de recommencer l'inscription depuis le début au lieu de simplement utiliser le code »).
   « / » est la vitrine d'un visiteur (« Créer mon compte ») ; « /connexion » montre le code de l'appareil reconnu, et l'e-mail en secours. L'appareil reste reconnu à la sortie : seule la session s'arrête. */
export async function logout(): Promise<void> {
  if (authMode() === "supabase") {
    const { supabaseAuthClient } = await import("@/lib/auth/supabase");
    const sb = await supabaseAuthClient();
    await sb.auth.signOut();
  } else {
    await clearDevSession();
  }
  redirect("/connexion");
}

/* « PARTOUT » ARRIVE À L'ACCUEIL, « CET APPAREIL » À LA PORTE DU CODE (21 novembre 2026, le client). Après un geste de sécurité on ne propose pas d'entrer d'un toucher : la vitrine garde « Se connecter » dans sa bande du bas. */
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

/* ---------- Appareils de confiance : le code à six chiffres de ce navigateur ---------- */

/* LA CLÉ D'ACCÈS N'OUVRE PLUS GUICHET (20 novembre 2026, le client : « le password de l'écran ne devrait pas pouvoir ouvrir l'application. Uniquement celui rentré par le client »). Le navigateur accepte, pour une clé d'accès, la biométrie OU le code d'écran du téléphone, et n'offre aucun réglage pour n'accepter que la biométrie : le code d'écran, connu des proches, aurait ouvert le compte. Les deux entrées serveur (options et ouverture par clé) sont donc supprimées ; seul le code Guichet ouvre, ici pour ce navigateur et au verrou pour le compte. L'empreinte reviendra avec une application native, qui peut exiger la biométrie seule. */

export async function pinLogin(deviceId: string, token: string, pin: string): Promise<{ ok: true; name: string } | { ok: false; error: string; forgotten?: boolean; left?: number }> {
  if (!/^[a-zA-Z0-9-]{4,60}$/.test(deviceId) || !FORME_DU_CODE.test(pin)) return { ok: false, error: MESSAGE_FORME_DU_CODE };
  const { lireAppareil, oublierAppareil } = await import("@/lib/auth/appareil-cookie");
  /* Le navigateur n'a plus son jeton (stockage effacé) : le cookie du serveur le porte, pour CET appareil seulement. */
  let jeton = token;
  if (!jeton) {
    const c = await lireAppareil();
    if (!c || c.id !== deviceId) return { ok: false, error: "Cet appareil n'est plus reconnu : connectez-vous par code.", forgotten: true };
    jeton = c.token;
  }
  const { pinAuthenticate } = await import("@/lib/auth/devices");
  const r = await pinAuthenticate(deviceId, jeton, pin);
  if (!r.ok && r.forgotten) await oublierAppareil(deviceId);
  return r;
}
