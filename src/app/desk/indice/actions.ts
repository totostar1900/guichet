"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { publishIndexNote } from "@/lib/documents/generate";
import { noteSummary } from "@/lib/market/index-note";
import { indexNoteFor } from "@/lib/documents/generate";

/** Publish the month's note: the PDF is kept in Documents, numbered, with its wording versions. */
export async function publishNoteAction(_prev: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const desk = await requireDesk("/desk/indice");
  const month = String(form.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Mois inconnu." };
  const doc = await publishIndexNote(month, desk.name);
  if (!doc) return { error: "Aucune séance lue sur ce mois : pas de note à publier." };
  const note = await indexNoteFor(month);
  await repo().logEvent({ kind: "desk", html: `Note mensuelle sur l'indice publiée : ${doc.number}${note ? ` · ${noteSummary(note)}` : ""} · ${desk.name}` });
  revalidatePath("/desk/indice");
  redirect(`/desk/indice?mois=${month}&ok=1`);
}
