"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { generateBordereau, generateForIntent } from "@/lib/documents/generate";
import { DOC_LABEL } from "@/lib/documents/registry";
import { notifyDocument } from "@/lib/notify/dispatch";

export type DocResult = { ok: true; id: string } | { ok: false; error: string };

const genSchema = z.object({
  type: z.enum(["bulletin", "fonds", "cession", "allocation", "non_allocation", "opere"]),
  intentId: z.string().min(1),
  allocation: z.coerce.number().min(0).max(100).optional(),
});

export async function generateDocumentAction(_prev: DocResult | null, form: FormData): Promise<DocResult> {
  const desk = await requireDesk("/desk/documents");
  const p = genSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: "Demande invalide." };
  try {
    const doc = await generateForIntent(p.data.type, p.data.intentId, { advisor: desk.name, allocation: p.data.allocation != null ? p.data.allocation / 100 : undefined });
    revalidatePath("/desk/documents");
    revalidatePath("/desk");
    return { ok: true, id: doc.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Génération impossible." };
  }
}

export async function generateBordereauAction(_prev: DocResult | null, form: FormData): Promise<DocResult> {
  const desk = await requireDesk("/desk/documents");
  const country = String(form.get("country") ?? "");
  const deadlineAt = String(form.get("deadlineAt") ?? "");
  if (!country || !deadlineAt) return { ok: false, error: "Adjudication non précisée." };
  try {
    const doc = await generateBordereau(country, deadlineAt, { advisor: desk.name });
    // Orders on the bordereau are now transmitted.
    const r = repo();
    const intents = await r.listIntents();
    const offers = await r.listOffers();
    const ids = new Set(offers.filter((o) => o.country === country && o.deadlineAt === deadlineAt).map((o) => o.id));
    for (const i of intents) {
      if (ids.has(i.offerId) && (i.type === "ferme" || i.type === "cession") && i.state === "confirmee") await r.setIntentState(i.id, "transmise");
    }
    revalidatePath("/desk/documents");
    revalidatePath("/desk");
    return { ok: true, id: doc.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Génération impossible." };
  }
}

const markSchema = z.object({ docId: z.string().min(1), mark: z.enum(["WhatsApp", "E-mail", "signe"]) });

export async function markDocumentAction(form: FormData): Promise<void> {
  const desk = await requireDesk("/desk/documents");
  const p = markSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return;
  const r = repo();
  const doc = await r.getDocument(p.data.docId);
  if (!doc) return;
  const now = new Date().toISOString();
  if (p.data.mark === "signe") {
    await r.updateDocument(doc.id, { status: "signe", signedAt: now });
    await r.logEvent({ kind: "document", intentId: doc.intentId, offerId: doc.offerId, html: `${DOC_LABEL[doc.type]} ${doc.number} <b>signé</b> : reçu par ${desk.name}` });
  } else {
    const n = await notifyDocument(doc, p.data.mark === "WhatsApp" ? "whatsapp" : "email");
    const outcome = !n ? "aucun destinataire" : n.status === "sent" ? "envoyé" : n.status === "skipped" ? `préparé (${n.error})` : `échec (${n.error})`;
    if (n && n.status === "sent") {
      const sentVia = Array.from(new Set([...(doc.sentVia ?? []), p.data.mark]));
      await r.updateDocument(doc.id, { status: doc.status === "signe" ? "signe" : "envoye", sentVia, sentAt: now });
    }
    await r.logEvent({ kind: "document", intentId: doc.intentId, offerId: doc.offerId, html: `${DOC_LABEL[doc.type]} ${doc.number} : <b>${outcome}</b> par ${p.data.mark}${doc.clientName ? ` à ${doc.clientName}` : ""} · ${desk.name}` });
  }
  revalidatePath("/desk/documents");
  revalidatePath("/desk");
}
