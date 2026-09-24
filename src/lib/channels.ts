import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { repo } from "@/lib/data";
import { normalizePhone } from "@/lib/format";
import { sendWhatsAppText, whatsappConfigured } from "@/lib/notify/providers";
import type { ProofChannel } from "@/lib/domain/types";

/**
 * Proving a channel: a six-digit code, sent on the channel itself, valid ten
 * minutes, five tries. The code is kept hashed (with the app secret as pepper);
 * the target is the phone in E.164 or the e-mail lower-cased. WhatsApp goes
 * through the app's own sender; when it is not configured (a review server,
 * the seed), the code is returned so the form can show it as a demo.
 *
 * The e-mail of a signed-in client is proven by the sign-in itself (Supabase
 * OTP), so `email` here serves guests and channel changes only, through the
 * same Supabase OTP; this module handles the phone.
 */
const TTL_MS = 10 * 60 * 1000;
const MAX_TRIES = 5;
const pepper = () => process.env.AUTH_SECRET ?? "guichet-dev-secret-change-me";
const hash = (channel: ProofChannel, target: string, code: string) => createHmac("sha256", pepper()).update(`${channel}|${target}|${code}`).digest("hex");

export type ProofRequest = { ok: true; demoCode?: string; channel: ProofChannel } | { ok: false; error: string; unavailable?: boolean };

/** The demo code (printed in the form) only where no real client can read it: never on a production host. */
export const proofDemoAllowed = (): boolean => process.env.WHATSAPP_DEMO === "1" || (process.env.NODE_ENV !== "production" && !process.env.VERCEL);
export type ProofCheck = { ok: true } | { ok: false; error: string; left?: number };

/**
 * The phone code comes from one of two houses.
 *
 * Guichet's own, through Meta's WhatsApp API: our six digits, our table, our
 * expiry. And Supabase's, through the provider wired on Auth > Phone, today
 * Twilio, which already carries the sign-in code. The second one wins wherever
 * it is configured: one provider, one bill, one way to fail.
 *
 * Supabase has two doors for a number, and the choice between them is
 * mechanical. `phone_change` attaches a new number to the account in hand,
 * without opening a second one. `sms` sends a fresh code to the number the
 * account already carries, which is what signing a complaint asks for; going
 * through `phone_change` on an unchanged number would send nothing at all.
 */
const supabasePhoneOtp = (): boolean => process.env.PHONE_OTP_ENABLED === "1" && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const otpChannel = (): "sms" | "whatsapp" => (process.env.PHONE_OTP_CHANNEL === "whatsapp" ? "whatsapp" : "sms");
const digits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** The Supabase client and the door this number takes: the same one at the send and at the check. */
async function supabasePhoneDoor(phone: string) {
  const { supabaseAuthClient } = await import("@/lib/auth/supabase");
  const sb = await supabaseAuthClient();
  const { data } = await sb.auth.getUser();
  const door: "sms" | "phone_change" = digits(data.user?.phone) === digits(phone) ? "sms" : "phone_change";
  return { sb, door };
}

/** Sends a code to a phone (WhatsApp; SMS when a provider is wired). */
export async function requestPhoneProof(userId: string | undefined, rawPhone: string): Promise<ProofRequest> {
  const phone = normalizePhone(rawPhone);
  if (!/^\+\d{8,15}$/.test(phone)) return { ok: false, error: "Numéro au format international, ex. +237 6 87 67 67 67." };
  if (supabasePhoneOtp()) {
    const { sb, door } = await supabasePhoneDoor(phone);
    // `phone_change` takes no channel: Supabase sends it on the provider's own, SMS by default.
    const { error } = door === "sms" ? await sb.auth.signInWithOtp({ phone, options: { shouldCreateUser: false, channel: otpChannel() } }) : await sb.auth.updateUser({ phone });
    if (error) {
      // Two kinds of refusal, and the client only has business with one of them.
      // « This number belongs to another account » is about them, and is said.
      // A provider that will not carry the message (an unapproved Twilio
      // compliance profile, a country it does not serve, an empty balance) is
      // about us: the desk gets the words in the log, the client gets the same
      // way out as when no sender is configured at all.
      if ((error.status ?? 500) >= 500 || /provider/i.test(error.message)) {
        console.error(`[channels] Supabase n'a pas pu envoyer le code à ${phone} : ${error.message}`);
        return { ok: false, error: "Le code par téléphone n'est pas disponible pour l'instant : un conseiller confirme votre numéro par téléphone.", unavailable: true };
      }
      return { ok: false, error: `Envoi impossible : ${error.message}` };
    }
    return { ok: true, channel: door === "sms" ? otpChannel() : "sms" };
  }
  if (!whatsappConfigured() && !proofDemoAllowed()) {
    // No sender on this host and no demo: the desk confirms the number by phone; the intention says so.
    return { ok: false, error: "Le code WhatsApp n'est pas encore disponible : un conseiller confirme votre numéro par téléphone.", unavailable: true };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const channel: ProofChannel = "whatsapp";
  await repo().createChannelCode({ userId, channel, target: phone, codeHash: hash(channel, phone, code), expiresAt: new Date(Date.now() + TTL_MS).toISOString() });
  if (!whatsappConfigured()) {
    // No sender on this server: the form shows the code as a demo so the flow can be walked through.
    console.info(`[channels] code de preuve pour ${phone} : ${code} (WhatsApp non configuré)`);
    return { ok: true, demoCode: code, channel };
  }
  try {
    await sendWhatsAppText(phone, `Votre code Guichet : ${code}\nIl prouve ce numéro, une seule fois. Valable 10 minutes. Purpose Capital`);
    return { ok: true, channel };
  } catch (e) {
    return { ok: false, error: `Envoi impossible sur WhatsApp : ${(e as Error).message}` };
  }
}

/** Checks a code against the latest one sent to that phone; marks the channel proven on the user. */
export async function confirmPhoneProof(userId: string | undefined, rawPhone: string, rawCode: string): Promise<ProofCheck> {
  const phone = normalizePhone(rawPhone);
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Le code comporte 6 chiffres." };
  if (supabasePhoneOtp()) {
    // Supabase's code never reached our table: we hand it back to Supabase to check.
    const { sb, door } = await supabasePhoneDoor(phone);
    const { error } = await sb.auth.verifyOtp({ phone, token: code, type: door });
    if (error) return { ok: false, error: "Code incorrect ou expiré : demandez-en un nouveau." };
    if (userId) await repo().markChannelVerified(userId, "phone", phone);
    return { ok: true };
  }
  const r = repo();
  const c = await r.findChannelCode("whatsapp", phone);
  if (!c) return { ok: false, error: "Aucun code en attente pour ce numéro : demandez-en un nouveau." };
  if (new Date(c.expiresAt).getTime() < Date.now()) return { ok: false, error: "Ce code a expiré : demandez-en un nouveau." };
  if (c.attempts >= MAX_TRIES) return { ok: false, error: "Cinq essais : demandez un nouveau code.", left: 0 };
  if (c.codeHash !== hash("whatsapp", phone, code)) {
    await r.updateChannelCode(c.id, { attempts: c.attempts + 1 });
    const left = MAX_TRIES - c.attempts - 1;
    return { ok: false, error: left > 0 ? `Code incorrect. ${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}.` : "Cinq essais : demandez un nouveau code.", left };
  }
  await r.updateChannelCode(c.id, { verifiedAt: new Date().toISOString() });
  if (userId) await r.markChannelVerified(userId, "phone", phone);
  return { ok: true };
}

/* ---------- the bridge from a WhatsApp conversation ---------- */

const LINK_TTL_MS = 30 * 24 * 3600 * 1000;
const linkSign = (payload: string) => createHmac("sha256", pepper()).update(`line|${payload}`).digest("base64url").slice(0, 27);

/**
 * A guest who wrote on WhatsApp is answered with the line and a signed link:
 * opening it counts as the WhatsApp proof for that number (the message reached
 * them, they came back through it), so the intention asks for the e-mail code
 * only. Thirty days, bound to the number.
 */
export function signLineLink(phone: string): string {
  const payload = Buffer.from(`${normalizePhone(phone)}|${Date.now() + LINK_TTL_MS}`).toString("base64url");
  return `${payload}.${linkSign(payload)}`;
}

/** The phone a link token vouches for, or null when it is forged or stale. */
export function readLineLink(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sig !== linkSign(payload)) return null;
  const [phone, exp] = Buffer.from(payload, "base64url").toString().split("|");
  if (!phone || !exp || Number(exp) < Date.now()) return null;
  return /^\+\d{8,15}$/.test(phone) ? phone : null;
}

/* ---------- ne plus recevoir : un lien qui marche sans compte ---------- */

/**
 * Se désinscrire ne doit pas demander de se connecter.
 *
 * Quelqu'un qui ne veut plus de nos messages n'a aucune raison de retrouver
 * un mot de passe pour le dire, et l'obliger revient à ne pas lui laisser la
 * porte ouverte. Le lien porte donc sa propre preuve : l'identifiant et le
 * canal, signés du sel de la maison, valables un an.
 *
 * Il ne donne rien d'autre. Ouvrir ce lien coupe un envoi, il n'ouvre aucune
 * session et ne montre aucune donnée.
 */
const OPTOUT_TTL_MS = 365 * 24 * 3600 * 1000;
const optOutSign = (payload: string) => createHmac("sha256", pepper()).update(`optout|${payload}`).digest("base64url").slice(0, 27);

export function signOptOut(userId: string, channel: "whatsapp" | "email"): string {
  const payload = Buffer.from(`${userId}|${channel}|${Date.now() + OPTOUT_TTL_MS}`).toString("base64url");
  return `${payload}.${optOutSign(payload)}`;
}

/** Ce qu'un jeton de désinscription prouve, ou rien quand il est forgé ou périmé. */
export function readOptOut(token: string | undefined): { userId: string; channel: "whatsapp" | "email" } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sig !== optOutSign(payload)) return null;
  const [userId, channel, exp] = Buffer.from(payload, "base64url").toString().split("|");
  if (!userId || !exp || Number(exp) < Date.now()) return null;
  return channel === "whatsapp" || channel === "email" ? { userId, channel } : null;
}

/** L'adresse à poser au pied d'un message : un clic, et l'envoi s'arrête. */
export const optOutUrl = (userId: string, channel: "whatsapp" | "email"): string => `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/ne-plus-recevoir?t=${signOptOut(userId, channel)}`;
