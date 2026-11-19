"use server";

import { z } from "zod";
import { authMode } from "@/lib/auth";
import { writeDevSession } from "@/lib/auth/dev";
import type { Session } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { CODE_DE_DEMONSTRATION } from "./demo";

/**
 * Les deux premiers pas de la création d'un compte : l'adresse, et son code.
 * Les pas suivants (le numéro, les mentions, l'appareil) réutilisent les
 * actions qui existent déjà : `sendPhoneProof`, `checkPhoneProof`,
 * `acceptTerms`, `enrolPin`, `beginPasskey`. Rien n'est écrit deux fois.
 *
 * EN DÉMONSTRATION (aucun service branché), le code d'adresse est affiché à
 * l'écran, comme celui du numéro l'est déjà : sans cela, personne ne pourrait
 * parcourir le parcours hors production.
 */

export type CreerEtape = { ok: true; demo?: string } | { ok: false; error: string };

export async function creerEnvoyerCodeEmail(rawEmail: string, next = "/"): Promise<CreerEtape> {
  const email = z.string().email().safeParse(rawEmail.trim().toLowerCase());
  if (!email.success) return { ok: false, error: "Adresse e-mail invalide." };
  if (authMode() !== "supabase") return { ok: true, demo: CODE_DE_DEMONSTRATION };
  const { guestSendEmailCode } = await import("@/app/offres/[id]/actions");
  void next;
  const r = await guestSendEmailCode(email.data);
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function creerVerifierCodeEmail(rawEmail: string, code: string): Promise<CreerEtape> {
  const email = rawEmail.trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { ok: false, error: "Adresse e-mail invalide." };
  if (authMode() === "supabase") {
    const { guestVerifyEmailCode } = await import("@/app/offres/[id]/actions");
    const r = await guestVerifyEmailCode(email, code);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }
  if (code.replace(/\s/g, "") !== CODE_DE_DEMONSTRATION) return { ok: false, error: "Code incorrect ou expiré." };
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const nom = local.replace(/\b\w/g, (c) => c.toUpperCase()) || "Nouveau client";
  const s: Session = {
    /* PAS « dev-client- » : ce préfixe reçoit un dossier de démonstration déjà approuvé. Un compte qu'on vient de créer n'a pas de dossier, et le parcours doit le montrer tel quel. */
    userId: `dev-nouveau-${email.replace(/[^a-z0-9]+/g, "-")}`,
    role: "client",
    name: nom,
    email,
    segment: "Personne physique",
    tier: 1,
    provider: "dev",
    mfaEnrolled: true,
    mfaVerified: true,
  };
  await writeDevSession(s);
  await repo().markChannelVerified(s.userId, "email", email);
  return { ok: true };
}
