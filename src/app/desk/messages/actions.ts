"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { emailConfigured, sendEmail, sendWhatsAppText, whatsappConfigured } from "@/lib/notify/providers";
import { signLineLink } from "@/lib/channels";

const replySchema = z.object({ to: z.string().min(3), channel: z.enum(["whatsapp", "email"]), body: z.string().min(1).max(4000), subject: z.string().optional(), name: z.string().optional(), offerId: z.string().optional() });

/** The desk answers from the inbox; the message is journalised like every other outbound one. */
export async function replyAction(_prev: { ok: boolean; error?: string } | null, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const desk = await requireDesk();
  const p = replySchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v.trim() !== "")));
  if (!p.success) return { ok: false, error: "Écrivez un message." };
  const { to, channel, body, subject, name, offerId } = p.data;
  const r = repo();
  // « Répondre avec la ligne » : the fiche, and on WhatsApp a link that vouches for the number.
  let lineText = "";
  if (offerId) {
    const o = await r.getOffer(offerId);
    if (!o) return { ok: false, error: "Ligne introuvable." };
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = channel === "whatsapp" ? `${base}/offres/${o.id}?de=${signLineLink(to)}` : `${base}/offres/${o.id}`;
    lineText = `\n\n${o.title}\n${url}${channel === "whatsapp" ? "\nCe lien reconnaît votre numéro : votre intention ne demande plus que le code e-mail." : ""}`;
  }
  const text = `${body.trim()}${lineText}\n\n${desk.name}, Purpose Capital`;
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
  await audit("message.reply", "contact", to, { after: { channel, chars: text.length, offerId }, actor: desk.name });
  revalidatePath("/desk/messages");
  return { ok: true };
}

/** Marks every message of a conversation as handled. */
/**
 * Promouvoir une pièce d'un message vers « À valider ».
 *
 * POURQUOI C'EST UN GESTE DE PERSONNE, ET NON UNE RÈGLE. « À valider » sert à ce
 * qui peut devenir une LIGNE DE MARCHÉ. Un document qu'un régulateur ou un
 * client envoie n'a rien à y devenir, et le bouton « Publier » n'a aucun sens à
 * côté de lui. Mais rien dans le courriel ne dit lequel des deux il est : un
 * membre de l'équipe transfère aussi bien un communiqué du Trésor qu'une lettre
 * de la COSUMAF, donc l'expéditeur ne tranche pas. C'est une personne qui
 * reconnaît un communiqué, et ce bouton est l'endroit où elle le dit.
 *
 * LA PIÈCE NE SE RECOPIE PAS : elle est déjà au dépôt sous sa clef, et
 * « fileKeyExistant » dit à l'ingestion de la reprendre telle quelle. Vingt-deux
 * doublons ont été retirés du dépôt le 2026-10-02, il serait dommage d'en
 * fabriquer d'autres le même jour.
 *
 * La lecture suit tout de suite, parce qu'ici une personne attend le résultat :
 * c'est elle qui vient d'affirmer que ce document est un communiqué.
 */
export async function promouvoirPieceAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/messages");
  const messageId = String(form.get("messageId") ?? "");
  const fileKey = String(form.get("fileKey") ?? "");
  if (!messageId || !fileKey) return;

  const r = repo();
  const message = (await r.listInbound(400)).find((m) => m.id === messageId);
  const piece = message?.attachments?.find((a) => a.fileKey === fileKey);
  if (!message || !piece) {
    await r.logEvent({ kind: "desk", html: `Promotion demandée par ${desk.name} : <b>pièce introuvable</b> sur ce message` }).catch(() => undefined);
    return;
  }
  if (piece.intakeId) return; // déjà partie : le bouton disparaît, mais un double envoi se rejoue

  try {
    const { readSource } = await import("@/lib/intake/storage");
    const { ingestSource } = await import("@/lib/intake/ingest");
    const bytes = await readSource(fileKey);
    const res = await ingestSource({
      title: message.subject || piece.name,
      fromLabel: `${message.from} · promue depuis Messages`,
      hint: message.subject ? `Objet du courriel : ${message.subject}` : undefined,
      file: { name: piece.name, mimeType: piece.mimeType, bytes },
      fileKeyExistant: fileKey,
      // Promue par une personne qui affirme que c'en est un : la source est officielle.
      trusted: true,
      keepUnsupported: true,
    });
    if (!res.ok) {
      await r.logEvent({ kind: "desk", html: `Promotion de <b>${piece.name}</b> par ${desk.name} : ${res.error}` });
      return;
    }
    // Le lien dans les deux sens : le message sait où sa pièce est partie.
    await r.setInboundAttachments(
      messageId,
      (message.attachments ?? []).map((a) => (a.fileKey === fileKey ? { ...a, intakeId: res.item.id } : a)),
    );
    await audit("intake.promote", "intake", res.item.id, {
      after: { messageId, fileKey, from: message.from },
      reason: `pièce promue depuis Messages par ${desk.name}`,
    });
    await r.logEvent({ kind: "desk", html: `<b>${piece.name}</b> promue en source par ${desk.name} : à valider` });
  } catch (e) {
    /* Rien ne sort d'ici sans le dire : un clic sans trace est indistinguable
       d'un clic qui n'a pas eu lieu, et ça a coûté une nuit. */
    await r
      .logEvent({ kind: "desk", html: `Promotion de <b>${piece.name}</b> par ${desk.name} <b>interrompue</b> : ${e instanceof Error ? e.message : "erreur inconnue"}` })
      .catch(() => undefined);
  }
  revalidatePath("/desk/messages");
  revalidatePath("/desk/a-valider");
}

export async function handledAction(form: FormData): Promise<void> {
  const desk = await requireDesk();
  const to = String(form.get("to") ?? "");
  if (!to) return;
  const r = repo();
  const open = (await r.listInbound(500)).filter((m) => m.from === to && !m.handledAt);
  for (const m of open) await r.markInboundHandled(m.id, desk.name);
  revalidatePath("/desk/messages");
}
