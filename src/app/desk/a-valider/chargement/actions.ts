"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { appliquerLePlan, emetteursDuRegistre, planifierLeClasseur, type LignePlanifiee, type ResultatPlanifie } from "@/lib/chargement-plan";

export interface ApercuClasseur {
  ok: boolean;
  erreur?: string;
  nom?: string;
  lignes?: LignePlanifiee[];
  resultats?: ResultatPlanifie[];
  /** Vrai une fois le classeur écrit : l'aperçu devient le compte rendu. */
  charge?: { pieces: number; seancesCompletees: number; seancesCreees: number };
}

const MAX = 5 * 1024 * 1024;

async function lire(form: FormData): Promise<{ octets: Uint8Array; nom: string } | string> {
  const f = form.get("classeur");
  if (!(f instanceof File) || f.size === 0) return "Choisissez un classeur Excel (.xlsx).";
  if (f.size > MAX) return "Classeur trop lourd (5 Mo au plus) : le modèle tient largement dans 300 lignes par feuille.";
  if (!/\.xlsx$/i.test(f.name)) return "Un classeur .xlsx : enregistrez le fichier au format Excel (.xlsx).";
  return { octets: new Uint8Array(await f.arrayBuffer()), nom: f.name };
}

/** L'aperçu : rien n'est écrit. */
export async function apercuDuClasseurAction(_prev: ApercuClasseur | null, form: FormData): Promise<ApercuClasseur> {
  await requireDesk("/desk/a-valider");
  const l = await lire(form);
  if (typeof l === "string") return { ok: false, erreur: l };
  try {
    const plan = await planifierLeClasseur(l.octets, l.nom, await emetteursDuRegistre());
    return { ok: true, nom: l.nom, lignes: plan.lignes, resultats: plan.resultats };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Classeur illisible." };
  }
}

/** Le chargement : le fichier est relu et replanifié (rien n'est gardé entre l'aperçu et ici), puis écrit. */
export async function chargerLeClasseurAction(_prev: ApercuClasseur | null, form: FormData): Promise<ApercuClasseur> {
  const desk = await requireDesk("/desk/a-valider");
  const l = await lire(form);
  if (typeof l === "string") return { ok: false, erreur: l };
  try {
    const plan = await planifierLeClasseur(l.octets, l.nom, await emetteursDuRegistre());
    const charge = await appliquerLePlan(plan, desk.name);
    revalidatePath("/desk/a-valider");
    revalidatePath("/desk/adjudications");
    return { ok: true, nom: l.nom, lignes: plan.lignes, resultats: plan.resultats, charge };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Chargement impossible." };
  }
}
