"use server";

import { revalidatePath } from "next/cache";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { escapeHtml } from "@/lib/format";
import { messageDef } from "@/lib/documents/messages-catalog";

/**
 * Le message est parti de la main de l'opérateur, dans WhatsApp ou dans son
 * courrier : l'application ne l'a pas envoyé et ne peut pas le prétendre. Elle
 * note seulement qu'il a été ouvert, avec ses premiers mots.
 *
 * Sans cette trace, le collègue qui reprend l'ordre demain ne voit rien et
 * réécrit la même chose. C'est le fil de la relation qui compte, pas la preuve
 * d'un envoi.
 */
export async function notePreparedMessage(intentId: string, key: string, channel: "whatsapp" | "email" | "copie", body: string): Promise<void> {
  const desk = await requireDesk("/desk");
  const label = messageDef(key)?.label ?? key;
  const where = channel === "whatsapp" ? "ouvert dans WhatsApp" : channel === "email" ? "ouvert dans le courrier" : "copié";
  const extract = body.replace(/\s+/g, " ").trim().slice(0, 200);
  await repo().logEvent({ kind: "desk", intentId, html: `<b>Message préparé</b> · « ${label} » ${where} par ${desk.name} : « ${escapeHtml(extract)}${body.length > 200 ? "…" : ""} »` });
  revalidatePath(`/desk/intentions/${intentId}`);
}
