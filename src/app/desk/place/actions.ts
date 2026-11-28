"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { modererUneAnnonce } from "@/lib/place-donnees";

/** La modération : publier, ou refuser avec un motif écrit. */
export async function moderer(form: FormData): Promise<void> {
  const s = await requireDesk("/desk/place");
  const id = String(form.get("id") ?? "");
  const decision = form.get("decision") === "publier" ? "publier" : "refuser";
  await modererUneAnnonce(s, id, decision, String(form.get("motif") ?? "").trim() || undefined);
  revalidatePath("/desk/place");
}
