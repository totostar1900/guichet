"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { REF } from "@/lib/reference";
import { baremeCourant, baremeEnBrouillon } from "@/lib/desk/activite-data";
import { BAREME_KEY, baremeValide, INGREDIENTS, sommeDesPoids, type Bareme } from "@/lib/domain/activite";

export type BaremeResult = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  presence: z.coerce.number().min(0).max(100),
  volume: z.coerce.number().min(0).max(100),
  suite: z.coerce.number().min(0).max(100),
  regularite: z.coerce.number().min(0).max(100),
  dossier: z.coerce.number().min(0).max(100),
  quoi: z.string().trim().max(200).optional(),
});

/**
 * ENREGISTRER UN BARÈME : UN BROUILLON, JAMAIS UNE PUBLICATION.
 *
 * Les poids commandent les cohortes, et les cohortes commandent les envois :
 * un poids changé d'un trait modifierait une liste de diffusion sans que
 * personne ne l'ait regardée. Le brouillon laisse voir qui bouge avant de
 * publier, comme les autres textes du référentiel.
 */
export async function enregistrerBaremeAction(_p: BaremeResult | null, form: FormData): Promise<BaremeResult> {
  const me = await requireResponsable("/desk/referentiel/bareme");
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Chaque poids est un nombre entre 0 et 100." };
  const poids = Object.fromEntries(INGREDIENTS.map((k) => [k, p.data[k]])) as Bareme["poids"];
  const courant = await baremeCourant();
  const next: Bareme = { ...courant, poids, quoi: p.data.quoi || undefined };
  if (!baremeValide(next)) return { ok: false, error: `La somme des poids fait ${sommeDesPoids(next)} : elle doit faire 100.` };
  await repo().saveReferenceDraft(REF.bareme, BAREME_KEY, { op: "set", data: next }, me.name);
  revalidatePath("/desk/referentiel/bareme");
  return { ok: true, message: "Barème enregistré en brouillon. Rien n'a bougé : publiez-le pour qu'il compte." };
}

/**
 * PUBLIER : LA VERSION MONTE, ET C'EST ELLE QUI REND LES SCORES COMPARABLES.
 *
 * Sans numéro ni date, « 56 en octobre, 71 en novembre » ne voudrait rien
 * dire : on ne saurait pas si le client a bougé ou si le barème a bougé.
 */
export async function publierBaremeAction(_p: BaremeResult | null, form: FormData): Promise<BaremeResult> {
  const me = await requireResponsable("/desk/referentiel/bareme");
  const mot = String(form.get("mot") ?? "").trim().toLowerCase();
  if (mot !== "publier") return { ok: false, error: "Recopiez le mot « publier » pour confirmer." };
  const brouillon = await baremeEnBrouillon();
  if (!brouillon) return { ok: false, error: "Aucun brouillon à publier." };
  const avant = await baremeCourant();
  const r = repo();
  await r.saveReferenceDraft(REF.bareme, BAREME_KEY, { op: "set", data: { ...brouillon, version: avant.version + 1, publieLe: new Date().toISOString(), publiePar: me.name } }, me.name);
  await r.publishReference(REF.bareme, [BAREME_KEY]);
  await audit("bareme.publish", "reference", `${REF.bareme}/${BAREME_KEY}`, { before: avant, after: { ...brouillon, version: avant.version + 1 }, reason: brouillon.quoi });
  await r.logEvent({ kind: "desk", html: `Barème de l'activité <b>v${avant.version + 1}</b> publié par ${me.name}${brouillon.quoi ? ` · ${brouillon.quoi}` : ""}` });
  revalidatePath("/desk/referentiel/bareme");
  revalidatePath("/desk/repertoire");
  return { ok: true, message: `Barème v${avant.version + 1} publié. Les scores affichés le citent désormais.` };
}

export async function jeterBaremeAction(): Promise<BaremeResult> {
  await requireResponsable("/desk/referentiel/bareme");
  await repo().discardReference(REF.bareme, [BAREME_KEY]);
  revalidatePath("/desk/referentiel/bareme");
  return { ok: true, message: "Brouillon abandonné." };
}
