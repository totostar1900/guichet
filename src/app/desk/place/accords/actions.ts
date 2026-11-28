"use server";

import { revalidatePath } from "next/cache";
import { requireDesk, requireResponsable } from "@/lib/auth";
import { convenirLesFrais, passageDuDesk, poserLaFourchette } from "@/lib/place-donnees";

const nb = (v: FormDataEntryValue | null): number => Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));

/** Le desk convient de frais avec une partie ; hors fourchette, seule la direction passe, avec le motif de sa dérogation. */
export async function fraisConvenus(form: FormData): Promise<void> {
  const s = await requireDesk("/desk/place/accords");
  const partie = form.get("partie") === "acheteur" ? "acheteur" : "vendeur";
  await convenirLesFrais(s, String(form.get("id") ?? ""), partie, { montant: nb(form.get("montant")), motif: String(form.get("motif") ?? "").trim(), derogation: String(form.get("derogation") ?? "").trim() || undefined });
  revalidatePath("/desk/place/accords");
}

export async function passage(form: FormData): Promise<void> {
  const s = await requireDesk("/desk/place/accords");
  const p = String(form.get("passage") ?? "");
  if (p === "bloquer_fonds" || p === "bloquer_titres" || p === "regler" || p === "echouer" || p === "annuler") await passageDuDesk(s, String(form.get("id") ?? ""), p);
  revalidatePath("/desk/place/accords");
}

/** La fourchette de frais : la direction seule. */
export async function poserFourchette(form: FormData): Promise<void> {
  const s = await requireResponsable("/desk/place/accords");
  await poserLaFourchette(s, { pctMin: nb(form.get("pctMin")), pctMax: nb(form.get("pctMax")), plancher: nb(form.get("plancher")), plafond: nb(form.get("plafond")) });
  revalidatePath("/desk/place/accords");
}
