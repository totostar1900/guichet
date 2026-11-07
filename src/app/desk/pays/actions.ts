"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { localIso } from "@/lib/format";
import { rafraichirIndicateurs } from "@/lib/market/pays-lecture";
import { ETATS, GENRES, INSTITUTIONS, cleDEchelle, placeSurLEchelle, type NouveauFait } from "@/lib/market/pays";

export type PaysResult = { ok: true; message: string } | { ok: false; error: string };

const entitesConnues = [...ETATS.map((e) => e.entite), ...INSTITUTIONS.map((i) => i.entite)];
const slugDe = (entite: string) => ETATS.find((e) => e.entite === entite)?.slug ?? INSTITUTIONS.find((i) => i.entite === entite)?.slug ?? entite;

/** Relit le FMI et la Banque mondiale. Ce qui était lu reste si une source ne répond pas, et le bilan dit lesquelles. */
export async function rafraichirPays(_p: PaysResult | null): Promise<PaysResult> {
  const me = await requireDesk("/desk/pays");
  const b = await rafraichirIndicateurs();
  await audit("pays.indicateurs", "pays_indicateurs", "fmi-banque-mondiale", { after: { lues: b.lues, erreurs: b.erreurs }, actor: me.name, reason: `lecture du FMI et de la Banque mondiale : ${b.lues} valeur(s)` });
  revalidatePath("/desk/pays");
  revalidatePath("/pays", "layout");
  if (!b.lues) return { ok: false, error: `Aucune valeur lue. ${b.erreurs.slice(0, 3).join(" · ")}` };
  return { ok: true, message: `${b.lues} valeur(s) lue(s)${b.erreurs.length ? `, ${b.erreurs.length} source(s) injoignable(s) : ce qui existait est conservé.` : "."}` };
}

const faitSchema = z.object({
  entite: z.enum(entitesConnues as [string, ...string[]]),
  genre: z.enum(GENRES),
  organisme: z.string().trim().min(1).max(60),
  valeur: z.string().trim().min(1).max(160),
  perspective: z.string().trim().max(80).optional(),
  unite: z.string().trim().max(40).optional(),
  dateFait: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  url: z.string().trim().url().refine((u) => u.startsWith("https://"), "https"),
});

/**
 * Un fait saisi : une notation, un chiffre des comptes.
 * Toujours avec sa date et le lien de sa pièce ; jamais un commentaire. Une note doit être sur l'échelle officielle de son agence : « BBB- » chez S&P, « Baa3 » chez Moody's.
 */
export async function ajouterFait(_p: PaysResult | null, form: FormData): Promise<PaysResult> {
  const me = await requireDesk("/desk/pays");
  const brut = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? undefined : v]));
  const p = faitSchema.safeParse(brut);
  if (!p.success) return { ok: false, error: "Renseignez la nature du fait, qui le dit, sa valeur, sa date et le lien https de la pièce." };
  const f = p.data;
  if (f.dateFait > localIso(new Date())) return { ok: false, error: "La date d'un fait ne peut pas être dans le futur." };
  if (f.genre === "notation") {
    if (!cleDEchelle(f.organisme)) return { ok: false, error: "Une notation vient de S&P, Moody's ou Fitch : c'est leur échelle qui la lit." };
    if (!placeSurLEchelle(f.organisme, f.valeur)) return { ok: false, error: `« ${f.valeur} » n'est pas une note de l'échelle de ${f.organisme}.` };
  }
  const fait: NouveauFait = { entite: f.entite, genre: f.genre, organisme: f.organisme, valeur: f.valeur, perspective: f.perspective, unite: f.unite, dateFait: f.dateFait, url: f.url, saisiPar: me.name };
  const ajoute = await repo().addEntiteFait(fait);
  await audit("pays.fait", "entite_fait", ajoute.id, { after: ajoute, actor: me.name, reason: `${f.genre} · ${f.entite} · ${f.organisme} ${f.valeur}` });
  revalidatePath(`/desk/pays/${slugDe(f.entite)}`);
  revalidatePath(`/pays/${slugDe(f.entite)}`);
  return { ok: true, message: "Fait enregistré, avec sa pièce." };
}

/** Retire un fait saisi. La trace garde ce qui a été retiré, par qui et quand. */
export async function retirerFait(form: FormData): Promise<void> {
  const me = await requireDesk("/desk/pays");
  const id = String(form.get("id") ?? "");
  if (!id) return;
  const avant = await repo().deleteEntiteFait(id);
  if (!avant) return;
  await audit("pays.fait.retire", "entite_fait", id, { before: avant, actor: me.name, reason: `fait retiré : ${avant.genre} · ${avant.entite} · ${avant.organisme} ${avant.valeur}` });
  revalidatePath(`/desk/pays/${slugDe(avant.entite)}`);
  revalidatePath(`/pays/${slugDe(avant.entite)}`);
}
