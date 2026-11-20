"use server";

import { z } from "zod";
import { authMode, requireSession } from "@/lib/auth";
import { noter } from "@/lib/journal";
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

/**
 * LE PRÉNOM, SEUL (19 novembre 2026, le client : « prénom B »).
 *
 * Un compte neuf ne porte que son adresse : le nom que la session en tirait (« G Nitcheu » de « g.nitcheu@… ») n'était pas le sien, et l'écran de code dit « Bonjour {prénom} ». On demande donc UN champ, le prénom, juste après le téléphone ; le nom complet, tel qu'il figure sur la pièce d'identité, vient avec le dossier. Le prénom n'est pas une pièce : aucune vérification, une longueur raisonnable.
 */
export async function creerEnregistrerPrenom(brut: string): Promise<{ ok: true; prenom: string } | { ok: false; error: string }> {
  const s = await requireSession("/connexion/creer");
  const prenom = brut.trim().replace(/\s+/g, " ");
  if (prenom.length < 2 || prenom.length > 40) return { ok: false, error: "Indiquez votre prénom (deux lettres au moins)." };
  if (/[@\d]/.test(prenom)) return { ok: false, error: "Un prénom ne contient ni chiffre ni arobase." };
  await repo().updateContact(s.userId, { name: prenom });
  if (authMode() !== "supabase") await writeDevSession({ ...s, name: prenom });
  await noter("profil.modifie", { detail: "prénom" });
  return { ok: true, prenom };
}
