"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { accesLu, cleDeLAcces, KIND_ACCES_GESTIONNAIRE, type AccesGestionnaire } from "@/lib/domain/gestionnaire-acces";
import { localIso } from "@/lib/format";

/**
 * L'INVITATION D'UN GESTIONNAIRE, PAR LA DIRECTION SEULE (28 novembre 2026, planche « Espace gestionnaire », 1B). Une adresse, une personne, les sociétés de gestion dont elle lit les fonds (au nom du bulletin).
 * Rien n'est supprimé : retirer un accès le passe à inactif, la ligne garde qui l'a posé et quand. L'audit dit qui a invité ou retiré qui, pour quelle société ; il ne porte aucune donnée de fonds.
 */
export type GestionnaireResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  email: z.string().trim().email("Une adresse e-mail valide est nécessaire."),
  nom: z.string().trim().min(2, "Nommez la personne."),
  gestionnaires: z.string().trim().min(2, "Nommez au moins une société de gestion, au nom du bulletin."),
});

export async function inviterUnGestionnaire(_prev: GestionnaireResult | null, form: FormData): Promise<GestionnaireResult> {
  const s = await requireResponsable("/desk/gestionnaires");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const gestionnaires = [...new Set(p.data.gestionnaires.split(/[,;\n]/).map((g) => g.trim()).filter(Boolean))];
  if (!gestionnaires.length) return { ok: false, error: "Nommez au moins une société de gestion, au nom du bulletin." };
  const cle = cleDeLAcces(p.data.email);
  const avant = (await repo().listPrive(KIND_ACCES_GESTIONNAIRE)).find((r) => cleDeLAcces(r.key) === cle);
  const acces: AccesGestionnaire = { email: cle, nom: p.data.nom, gestionnaires, actif: true, invitePar: s.email ?? s.name, le: localIso(new Date()) };
  await repo().upsertPrive(KIND_ACCES_GESTIONNAIRE, cle, acces, s.email ?? s.name);
  await audit(avant ? "gestionnaire.acces_modifie" : "gestionnaire.invite", "gestionnaire_acces", cle, { after: { gestionnaires, actif: true }, reason: "invitation par la direction" });
  revalidatePath("/desk/gestionnaires");
  return { ok: true, message: avant ? "Accès mis à jour." : "Accès posé. La personne se connecte avec cette adresse, sur l'espace gestionnaire." };
}

export async function retirerUnAcces(form: FormData): Promise<void> {
  const s = await requireResponsable("/desk/gestionnaires");
  const email = cleDeLAcces(String(form.get("email") ?? ""));
  if (!email) return;
  const row = (await repo().listPrive(KIND_ACCES_GESTIONNAIRE)).find((r) => cleDeLAcces(r.key) === email);
  const actuel = row ? accesLu(row.key, row.data) : undefined;
  if (!actuel || !actuel.actif) return;
  await repo().upsertPrive(KIND_ACCES_GESTIONNAIRE, email, { ...actuel, actif: false }, s.email ?? s.name);
  await audit("gestionnaire.retire", "gestionnaire_acces", email, { before: { actif: true }, after: { actif: false }, reason: "retrait par la direction" });
  revalidatePath("/desk/gestionnaires");
}
