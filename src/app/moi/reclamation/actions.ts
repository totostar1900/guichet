"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { confirmPhoneProof, proofDemoAllowed, requestPhoneProof } from "@/lib/channels";
import { repo } from "@/lib/data";
import { generateComplaint } from "@/lib/documents/generate";
import { notifyClientDocument } from "@/lib/notify/dispatch";
import { INTENT_LABEL } from "@/lib/domain/intent";

/**
 * The client's complaint: the facts and the request in their words, the
 * operation it concerns, then a signature by code on the proven phone (or,
 * when the phone is not proven, the signed-in e-mail stands as the channel).
 * The PDF is numbered, kept in Mes documents, and the desk gets it in
 * Messages with the acknowledgement clock.
 */
export type ComplaintStep = { ok: true; step: "code"; channel: "whatsapp" | "email"; demoCode?: string } | { ok: true; step: "done"; number: string; id: string; ackBy: string; answerBy: string } | { ok: false; error: string };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Step 1 → 2: checks the text, sends the signature code (WhatsApp) or accepts the e-mail session. */
export async function complaintPrepareAction(_p: ComplaintStep | null, form: FormData): Promise<ComplaintStep> {
  const s = await requireSession("/moi/reclamation");
  const facts = clean(form.get("facts"), 2000);
  const ask = clean(form.get("ask"), 1000);
  if (facts.length < 10) return { ok: false, error: "Dites ce qui s'est passé, en quelques phrases." };
  if (ask.length < 5) return { ok: false, error: "Dites ce que vous demandez." };
  const r = repo();
  const ch = await r.getChannelStatus(s.userId).catch(() => undefined);
  const phone = ch?.phone ?? s.phone;
  if (ch?.phoneVerifiedAt && phone) {
    const sent = await requestPhoneProof(s.userId, phone);
    if (!sent.ok && !sent.unavailable) return { ok: false, error: sent.error };
    if (sent.ok) return { ok: true, step: "code", channel: "whatsapp", demoCode: proofDemoAllowed() ? sent.demoCode : undefined };
  }
  return { ok: true, step: "code", channel: "email" };
}

/** Step 3: the code (or the e-mail session) signs; the document is produced and routed. */
export async function complaintDepositAction(_p: ComplaintStep | null, form: FormData): Promise<ComplaintStep> {
  const s = await requireSession("/moi/reclamation");
  const facts = clean(form.get("facts"), 2000);
  const ask = clean(form.get("ask"), 1000);
  const opRef = clean(form.get("operation"), 40);
  const channel = form.get("channel") === "whatsapp" ? "whatsapp" : "email";
  if (facts.length < 10 || ask.length < 5) return { ok: false, error: "La réclamation est incomplète." };
  const r = repo();
  let signedBy: string;
  if (channel === "whatsapp") {
    const ch = await r.getChannelStatus(s.userId).catch(() => undefined);
    const phone = ch?.phone ?? s.phone ?? "";
    const code = String(form.get("code") ?? "");
    const check = await confirmPhoneProof(s.userId, phone, code);
    if (!check.ok) return { ok: false, error: check.error };
    signedBy = `code de signature ${code.slice(-4).padStart(4, "•")} sur WhatsApp (${phone})`;
  } else {
    if (form.get("confirm") !== "on") return { ok: false, error: "Cochez la case pour signer avec votre e-mail de connexion." };
    signedBy = `session e-mail prouvée (${s.email ?? ""})`;
  }
  let operation: string | undefined;
  if (opRef) {
    const [intents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
    const i = intents.find((x) => x.ref === opRef && x.clientId === s.userId);
    if (i) {
      const o = offers.find((x) => x.id === i.offerId);
      operation = `${i.ref} · ${o?.title ?? ""} · ${INTENT_LABEL[i.type]}${i.amount ? ` · ${i.amount.toLocaleString("fr-FR")}` : ""} · ${i.state}`;
    }
  }
  const fallback = { id: s.userId, name: s.name, segment: s.segment ?? "", phone: s.phone, email: s.email, whatsappOptIn: true };
  let doc: Awaited<ReturnType<typeof generateComplaint>>;
  try {
    doc = await generateComplaint(s.userId, { operation, facts, ask, receivedVia: "Mon espace", signedBy, contact: fallback });
  } catch (e) {
    return { ok: false, error: `Dépôt impossible : ${(e as Error).message}` };
  }
  const contact = (await r.getContact(s.userId)) ?? fallback;
  await r.createInbound({ channel, from: (channel === "whatsapp" ? contact?.phone : contact?.email) ?? s.email ?? s.userId, name: s.name, subject: `Réclamation ${doc.number}`, body: `${operation ? `Opération : ${operation}\n\n` : ""}${facts}\n\nDemande : ${ask}\n\nAccusé de réception avant le ${doc.ackBy}, réponse avant le ${doc.answerBy}. Document : ${doc.number}.` });
  if (contact) await notifyClientDocument(doc, contact, channel).catch(() => undefined);
  await r.logEvent({ kind: "desk", html: `<b>Réclamation</b> ${doc.number} déposée par ${s.name} depuis Mon espace · accusé de réception avant le ${doc.ackBy}` });
  revalidatePath("/moi");
  revalidatePath("/desk/messages");
  return { ok: true, step: "done", number: doc.number, id: doc.id, ackBy: doc.ackBy, answerBy: doc.answerBy };
}
