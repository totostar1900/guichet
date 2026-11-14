"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { listerAnnonces } from "@/lib/annonce";
import { REF_ANNONCE, annonceEnCours, verifierAnnonce, type Annonce } from "@/lib/domain/annonce";

export type AnnonceResult = { ok: false; error: string };

const aujourdhui = () => new Date().toISOString().slice(0, 10);
const rafraichir = () => {
  revalidatePath("/", "layout");
  revalidatePath("/desk/annonce");
};

/**
 * Publier l'annonce de la maison : UNE SEULE À LA FOIS (14 novembre 2026). La nouvelle relève l'ancienne, qui reste dans la table, retirée « remplacée » : les deux gestes
 * sont écrits à l'audit, avec avant et après.
 */
export async function publierAnnonceAction(_p: AnnonceResult | null, form: FormData): Promise<AnnonceResult> {
  const desk = await requireDesk("/desk/annonce");
  const texte = String(form.get("texte") ?? "").trim();
  const jusquAu = String(form.get("jusquAu") ?? "");
  const jour = aujourdhui();
  const erreur = verifierAnnonce(texte, jusquAu, jour);
  if (erreur) return { ok: false, error: erreur };

  const r = repo();
  const maintenant = new Date().toISOString();
  const enCours = annonceEnCours(await listerAnnonces(), jour);
  if (enCours) {
    const retiree: Annonce = { ...enCours, retireeLe: maintenant, retireePar: desk.name, motifDeRetrait: "remplacée" };
    await r.upsertReference(REF_ANNONCE, enCours.id, retiree, desk.name);
    await audit("annonce.retire", "annonce", enCours.id, { before: enCours, after: retiree, reason: "remplacée par une nouvelle annonce" });
  }
  const annonce: Annonce = { id: `an-${randomUUID().slice(0, 8)}`, texte, jusquAu, publieePar: desk.name, publieeLe: maintenant };
  await r.upsertReference(REF_ANNONCE, annonce.id, annonce, desk.name);
  await audit("annonce.publie", "annonce", annonce.id, { before: enCours ?? null, after: annonce });
  rafraichir();
  redirect(`/desk/annonce?publiee=${encodeURIComponent(jusquAu)}`);
}

/** Retirer l'annonce en cours : elle n'est pas effacée, elle porte sa date de retrait et celle qui l'a retirée. */
export async function retirerAnnonceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/annonce");
  const id = String(form.get("id") ?? "");
  const r = repo();
  const annonce = (await listerAnnonces()).find((a) => a.id === id);
  if (!annonce || annonce.retireeLe) return;
  const retiree: Annonce = { ...annonce, retireeLe: new Date().toISOString(), retireePar: desk.name, motifDeRetrait: "retirée" };
  await r.upsertReference(REF_ANNONCE, id, retiree, desk.name);
  await audit("annonce.retire", "annonce", id, { before: annonce, after: retiree });
  rafraichir();
  redirect("/desk/annonce?retiree=1");
}
