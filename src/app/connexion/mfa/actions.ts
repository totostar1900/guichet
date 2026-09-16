"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { authMode, getSession } from "@/lib/auth";
import { supabaseAuthClient } from "@/lib/auth/supabase";
import { repo } from "@/lib/data";

/**
 * Second factor for the desk (TOTP, Supabase Auth — no extra service, no cost).
 * Enrolment shows a QR code once; every later desk login asks for the 6-digit code.
 */
export type MfaState = { step: "enrol"; factorId: string; qr: string; secret: string; error?: string } | { step: "verify"; factorId: string; error?: string } | { step: "error"; error: string };

const safeNext = (n: unknown): string => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/desk");

/** Starts (or restarts) a TOTP enrolment; abandoned, unverified factors are cleared first. */
export async function startEnrol(): Promise<MfaState> {
  if (authMode() !== "supabase") return { step: "error", error: "Second facteur indisponible en mode démonstration." };
  const sb = await supabaseAuthClient();
  const { data: factors } = await sb.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Guichet Purpose Capital", issuer: "Purpose Capital" });
  if (error || !data) return { step: "error", error: `Activation impossible : ${error?.message ?? "réponse vide"}` };
  return { step: "enrol", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Confirms the enrolment with a first code, which also raises this session to aal2. */
export async function verifyEnrol(prev: MfaState, form: FormData): Promise<MfaState> {
  if (prev.step !== "enrol") return prev;
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ...prev, error: "Le code comporte 6 chiffres." };
  const sb = await supabaseAuthClient();
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: prev.factorId, code });
  if (error) return { ...prev, error: "Code incorrect : vérifiez l'heure du téléphone et réessayez." };
  const s = await getSession();
  if (s) {
    await repo().markMfaEnrolled(s.userId);
    await audit("mfa.enrol", "profile", s.userId, { after: { mfa: "totp" } });
    await repo().logEvent({ kind: "system", html: `Second facteur activé par <b>${s.name}</b>` });
  }
  redirect(safeNext(form.get("next")));
}

/** Everyday login: the code of the already-verified authenticator. */
export async function verifyMfa(prev: MfaState, form: FormData): Promise<MfaState> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ...prev, error: "Le code comporte 6 chiffres." };
  const sb = await supabaseAuthClient();
  const { data: factors } = await sb.auth.mfa.listFactors();
  const totp = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (!totp) return { step: "error", error: "Aucun authentificateur vérifié sur ce compte." };
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
  if (error) return { step: "verify", factorId: totp.id, error: "Code incorrect ou expiré." };
  redirect(safeNext(form.get("next")));
}
