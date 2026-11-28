"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { accepterUneProposition, deposerUneAnnonce, peutParticiper, placeOuverte, refuserUneProposition, repondre } from "@/lib/place-donnees";

/**
 * LES GESTES DU CLIENT SUR LA PLACE DE MARCHÉ (28 novembre 2026) : déposer, répondre, accepter ou refuser une proposition. Chacun vérifie l'interrupteur et que le client peut participer ; aucun ne reçoit ni
 * ne rend l'identité d'un autre participant.
 */
export type PlaceResult = { ok: true; message: string } | { ok: false; error: string };

const chiffres = (v: unknown): number => Number(String(v ?? "").replace(/[^\d.,]/g, "").replace(",", "."));

const depot = z.object({
  sens: z.enum(["vend", "achete"]),
  offerId: z.string().min(1, "Choisissez une ligne."),
  facial: z.preprocess(chiffres, z.number().min(1, "Indiquez le facial.")),
  prix: z.preprocess(chiffres, z.number().positive("Indiquez le prix.")),
  decoupage: z.preprocess((v) => v === "on", z.boolean()),
  arrangeur: z.literal("on", { message: "Acceptez le rôle d'arrangeur de Purpose pour déposer." }),
});

async function participant() {
  const s = await requireSession("/place");
  if (!placeOuverte() || !peutParticiper(s)) redirect("/");
  return s;
}

export async function deposer(_prev: PlaceResult | null, form: FormData): Promise<PlaceResult> {
  const s = await participant();
  const p = depot.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const r = await deposerUneAnnonce(s, { sens: p.data.sens, offerId: p.data.offerId, facial: p.data.facial, prix: p.data.prix, decoupage: p.data.decoupage });
  if (!r.ok) return { ok: false, error: r.erreur };
  revalidatePath("/place");
  redirect("/place?depose=1");
}

const reponse = z.object({ annonceId: z.string().min(1), facial: z.preprocess((v) => (v === "" || v == null ? undefined : chiffres(v)), z.number().optional()), prix: z.preprocess(chiffres, z.number().positive("Indiquez le prix.")) });

export async function repondreAction(_prev: PlaceResult | null, form: FormData): Promise<PlaceResult> {
  const s = await participant();
  const p = reponse.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Saisie invalide." };
  const r = await repondre(s, p.data.annonceId, { facial: p.data.facial, prix: p.data.prix });
  if (!r.ok) return { ok: false, error: r.erreur };
  revalidatePath(`/place/${p.data.annonceId}`);
  return { ok: true, message: "Proposition envoyée. L'annonceur la verra ; vous serez prévenu de sa réponse." };
}

export async function accepterAction(form: FormData): Promise<void> {
  const s = await participant();
  const annonceId = String(form.get("annonceId") ?? "");
  const propositionId = String(form.get("propositionId") ?? "");
  await accepterUneProposition(s, annonceId, propositionId);
  revalidatePath(`/place/${annonceId}`);
}

export async function refuserAction(form: FormData): Promise<void> {
  const s = await participant();
  const annonceId = String(form.get("annonceId") ?? "");
  await refuserUneProposition(s, annonceId, String(form.get("propositionId") ?? ""));
  revalidatePath(`/place/${annonceId}`);
}
