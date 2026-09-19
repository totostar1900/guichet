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

/** Sends a code to a phone (WhatsApp; SMS when a provider is wired). */
export async function requestPhoneProof(userId: string | undefined, rawPhone: string): Promise<ProofRequest> {
  const phone = normalizePhone(rawPhone);
  if (!/^\+\d{8,15}$/.test(phone)) return { ok: false, error: "Numéro au format international, ex. +237 6 87 67 67 67." };
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
