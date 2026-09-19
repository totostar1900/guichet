"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emailConfigured, sendEmail, sendWhatsAppText, whatsappConfigured } from "@/lib/notify/providers";

const replySchema = z.object({ to: z.string().min(3), channel: z.enum(["whatsapp", "email"]), body: z.string().min(1).max(4000), subject: z.string().optional(), name: z.string().optional() });

/** The desk answers from the inbox; the message is journalised like every other outbound one. */
export async function replyAction(_prev: { ok: boolean; error?: string } | null, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const desk = await requireDesk();
  const p = replySchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== "")));
  if (!p.success) return { ok: false, error: "Écrivez un message." };
  const { to, channel, body, subject, name } = p.data;
  const r = repo();
  const text = `${body.trim()}\n\n${desk.name}, Purpose Capital`;
  const row = await r.createNotification({ kind: "intent_update", channel, to, contactName: name, subject: channel === "email" ? subject || "Purpose Capital : votre demande" : undefined, body: text, status: "queued" });
  const configured = channel === "whatsapp" ? whatsappConfigured() : emailConfigured();
  if (!configured) {
    await r.updateNotification(row.id, { status: "skipped", error: `${channel === "whatsapp" ? "WhatsApp Cloud API" : "E-mail"} non configuré` });
    revalidatePath("/desk/messages");
    return { ok: false, error: `Message préparé mais non envoyé : ${channel === "whatsapp" ? "WhatsApp" : "l'e-mail"} n'est pas encore configuré (clés à renseigner sur Vercel).` };
  }
  try {
    const id = channel === "whatsapp" ? await sendWhatsAppText(to, text) : await sendEmail(to, subject || "Purpose Capital : votre demande", `<p>${text.replace(/\n/g, "<br>")}</p>`, text);
    await r.updateNotification(row.id, { status: "sent", providerId: id, sentAt: new Date().toISOString() });
  } catch (e) {
    await r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
    return { ok: false, error: `Échec d'envoi : ${e instanceof Error ? e.message : "erreur"}` };
  }
  await audit("message.reply", "contact", to, { after: { channel, chars: text.length }, actor: desk.name });
  revalidatePath("/desk/messages");
  return { ok: true };
}

/** Marks every message of a conversation as handled. */
export async function handledAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const to = String(form.get("to") ?? "");
  if (!to) return;
  const r = repo();
  const open = (await r.listInbound(500)).filter((m) => m.from === to && !m.handledAt);
  for (const m of open) await r.markInboundHandled(m.id, desk.name);
  revalidatePath("/desk/messages");
}
