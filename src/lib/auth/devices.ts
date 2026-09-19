import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { repo } from "@/lib/data";
import { COMPANY } from "@/lib/config";
import type { TrustedDevice } from "@/lib/domain/types";
import { authMode } from "./index";
import { writeDevSession } from "./dev";
import type { Session } from "./types";

/**
 * Trusted devices: a fast way back for a client whose e-mail and WhatsApp are
 * already proven. Two kinds, the client chooses on the Sécurité page:
 *
 * - passkey : the phone's own lock (Face ID, empreinte, code du téléphone), a
 *   WebAuthn credential bound to this origin. Nothing to remember, nothing
 *   phishable; the public key is stored, the private key never leaves the device.
 * - pin : a four-digit code bound to this browser. The browser keeps a random
 *   device token; the server keeps HMAC(token · pin). The code alone opens
 *   nothing elsewhere, the token alone opens nothing at all. Five failures and
 *   the device is forgotten: the client signs in by code and enrols again.
 *
 * Either way the session is minted the same: Supabase hands a one-time token
 * for that user (admin generateLink) which the cookie client verifies; the dev
 * backend rebuilds its signed cookie. The challenge of a WebAuthn ceremony
 * lives in a short-lived signed cookie between the two halves.
 */

const CHALLENGE_COOKIE = "guichet_webauthn";
const pepper = () => process.env.AUTH_SECRET ?? "guichet-dev-secret-change-me";
const sign = (v: string) => createHmac("sha256", pepper()).update(v).digest("base64url");
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64url");
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

/** The relying party: the host the page is served from (localhost in dev, the Vercel host in production). */
async function rp() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}`, rpName: `Guichet · ${COMPANY.name}` };
}

async function rememberChallenge(challenge: string) {
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, `${challenge}.${sign(challenge)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 300 });
}
async function takeChallenge(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete(CHALLENGE_COOKIE);
  if (!v) return null;
  const [c, s] = v.split(".");
  if (!c || !s) return null;
  const expected = sign(c);
  return expected.length === s.length && timingSafeEqual(Buffer.from(expected), Buffer.from(s)) ? c : null;
}

/* ---------- minting a session for a user the device vouched for ---------- */

async function mintSession(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (authMode() === "supabase") {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u, error: ue } = await admin.auth.admin.getUserById(userId);
    if (ue || !u.user?.email) return { ok: false, error: "Compte introuvable : connectez-vous par code." };
    const { data: link, error: le } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
    if (le || !link.properties?.hashed_token) return { ok: false, error: "Connexion impossible pour l'instant : utilisez le code par e-mail." };
    const { supabaseAuthClient } = await import("./supabase");
    const sb = await supabaseAuthClient();
    const { error } = await sb.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
    if (error) return { ok: false, error: "Connexion impossible pour l'instant : utilisez le code par e-mail." };
    return { ok: true };
  }
  // Dev backend: the user id carries the role and the name (dev-client-g-nitcheu).
  const m = /^dev-(client|desk|responsable)-(.+)$/.exec(userId);
  if (!m) return { ok: false, error: "Session de démonstration inconnue." };
  const role = m[1] as Session["role"];
  const name = m[2].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await writeDevSession({ userId, role, name, segment: role === "client" ? "Personne physique" : "Desk Purpose Capital", tier: role === "client" ? 1 : 2, provider: "dev", mfaEnrolled: true, mfaVerified: true });
  return { ok: true };
}

/* ---------- passkeys ---------- */

export async function passkeyRegistrationOptions(s: Session): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpID, rpName } = await rp();
  const existing = (await repo().listDevices(s.userId)).filter((d) => d.kind === "passkey" && d.credentialId);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: s.email ?? s.phone ?? s.name,
    userDisplayName: s.name,
    userID: new TextEncoder().encode(s.userId),
    attestationType: "none",
    excludeCredentials: existing.map((d) => ({ id: d.credentialId! })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    preferredAuthenticatorType: "localDevice",
  });
  await rememberChallenge(options.challenge);
  return options;
}

export async function passkeyRegister(s: Session, response: RegistrationResponseJSON, name: string): Promise<{ ok: true; device: TrustedDevice } | { ok: false; error: string }> {
  const challenge = await takeChallenge();
  if (!challenge) return { ok: false, error: "La demande a expiré : recommencez." };
  const { rpID, origin } = await rp();
  let v;
  try {
    v = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false });
  } catch (e) {
    return { ok: false, error: `Clé refusée : ${(e as Error).message}` };
  }
  if (!v.verified) return { ok: false, error: "Clé refusée." };
  const c = v.registrationInfo.credential;
  const device = await repo().addDevice({ userId: s.userId, kind: "passkey", name: name.trim().slice(0, 60) || "Cet appareil", credentialId: c.id, publicKey: b64(c.publicKey), counter: c.counter });
  await notifyDeviceChange(s.userId, "added", device);
  return { ok: true, device };
}

export async function passkeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = await rp();
  // No allow-list: a discoverable credential lets the phone pick the account itself.
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  await rememberChallenge(options.challenge);
  return options;
}

export async function passkeyAuthenticate(response: AuthenticationResponseJSON): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const challenge = await takeChallenge();
  if (!challenge) return { ok: false, error: "La demande a expiré : recommencez." };
  const d = await repo().findDevice({ credentialId: response.id });
  if (!d || d.kind !== "passkey" || !d.publicKey) return { ok: false, error: "Cette clé n'est plus reconnue : connectez-vous par code, puis ajoutez l'appareil à nouveau." };
  const { rpID, origin } = await rp();
  let v;
  try {
    v = await verifyAuthenticationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, credential: { id: d.credentialId!, publicKey: unb64(d.publicKey), counter: d.counter ?? 0 }, requireUserVerification: false });
  } catch (e) {
    return { ok: false, error: `Clé refusée : ${(e as Error).message}` };
  }
  if (!v.verified) return { ok: false, error: "Clé refusée." };
  await repo().updateDevice(d.id, { counter: v.authenticationInfo.newCounter, lastUsedAt: new Date().toISOString(), failures: 0 });
  const m = await mintSession(d.userId);
  return m.ok ? { ok: true, name: d.name } : m;
}

/* ---------- four-digit code, bound to this browser ---------- */

const MAX_PIN_FAILURES = 5;
const pinHash = (token: string, pin: string) => createHmac("sha256", pepper()).update(`pin|${token}|${pin}`).digest("hex");

export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function pinEnrol(s: Session, token: string, pin: string, name: string): Promise<{ ok: true; device: TrustedDevice } | { ok: false; error: string }> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Le code comporte 4 chiffres." };
  if (/^(\d)\1{3}$|^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)$/.test(pin)) return { ok: false, error: "Trop simple : évitez les suites et les répétitions." };
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return { ok: false, error: "Appareil non reconnu : rechargez la page." };
  const device = await repo().addDevice({ userId: s.userId, kind: "pin", name: name.trim().slice(0, 60) || "Ce navigateur", secretHash: pinHash(token, pin) });
  await notifyDeviceChange(s.userId, "added", device);
  return { ok: true, device };
}

export async function pinAuthenticate(deviceId: string, token: string, pin: string): Promise<{ ok: true; name: string } | { ok: false; error: string; forgotten?: boolean; left?: number }> {
  const d = await repo().findDevice({ id: deviceId });
  if (!d || d.kind !== "pin" || !d.secretHash) return { ok: false, error: "Cet appareil n'est plus reconnu : connectez-vous par code.", forgotten: true };
  const expected = d.secretHash;
  const got = pinHash(token, pin.replace(/\D/g, ""));
  if (expected.length !== got.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(got))) {
    const failures = d.failures + 1;
    if (failures >= MAX_PIN_FAILURES) {
      await repo().removeDevice(d.id);
      await notifyDeviceChange(d.userId, "forgotten", d);
      return { ok: false, error: "Cinq codes faux : cet appareil est oublié. Connectez-vous par code, puis ajoutez-le à nouveau.", forgotten: true, left: 0 };
    }
    await repo().updateDevice(d.id, { failures });
    const left = MAX_PIN_FAILURES - failures;
    return { ok: false, error: `Code incorrect. ${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}.`, left };
  }
  await repo().updateDevice(d.id, { failures: 0, lastUsedAt: new Date().toISOString() });
  const m = await mintSession(d.userId);
  return m.ok ? { ok: true, name: d.name } : m;
}

/* ---------- removal and the word sent on both channels ---------- */

export async function forgetDevice(s: Session, id: string): Promise<void> {
  const d = await repo().findDevice({ id });
  if (!d || d.userId !== s.userId) return;
  await repo().removeDevice(id, s.userId);
  await notifyDeviceChange(s.userId, "removed", d);
}

/** Adding or removing a device is told on both proven channels: the one thing a thief cannot silence. */
async function notifyDeviceChange(userId: string, what: "added" | "removed" | "forgotten", d: TrustedDevice): Promise<void> {
  try {
    const ch = await repo().getChannelStatus(userId);
    const kind = d.kind === "passkey" ? "Face ID / empreinte" : "code à 4 chiffres";
    const line = what === "added" ? `Appareil ajouté à votre Guichet : ${d.name} (${kind}).` : what === "removed" ? `Appareil retiré de votre Guichet : ${d.name}.` : `Appareil oublié après cinq codes faux : ${d.name}.`;
    const tail = what === "added" ? " Si ce n'est pas vous, retirez-le depuis Mon espace › Sécurité." : "";
    const { whatsappConfigured, sendWhatsAppText, emailConfigured, sendEmail } = await import("@/lib/notify/providers");
    if (ch.phone && ch.phoneVerifiedAt && whatsappConfigured()) await sendWhatsAppText(ch.phone, `${line}${tail}\nPurpose Capital`);
    if (ch.email && emailConfigured()) await sendEmail(ch.email, "Guichet : vos appareils", `<p>${line}${tail}</p><p>Purpose Capital</p>`, `${line}${tail}\nPurpose Capital`);
    await repo().logEvent({ kind: "system", html: `${line} <span class="muted">(${userId})</span>` });
  } catch {
    // Telling is best effort; the change itself is done.
  }
}
