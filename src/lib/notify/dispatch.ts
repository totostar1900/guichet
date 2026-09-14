import "server-only";
import { repo } from "@/lib/data";
import type { Contact, GeneratedDocument, Intent, IntentState, Notification, NotifyChannel, NotifyKind, Offer } from "@/lib/domain/types";
import { readSource } from "@/lib/intake/storage";
import { positionsFrom } from "@/lib/positions";
import { documentSent, emailHtml, intentReceived, intentUpdated, offerPublished, type Message } from "./compose";
import { emailConfigured, sendEmail, sendWhatsAppDocument, sendWhatsAppTemplate, sendWhatsAppText, whatsappConfigured } from "./providers";

/**
 * Records every outbound message, then sends it when the channel is configured.
 * Without credentials the row is kept as "skipped" so the desk sees exactly what
 * would have gone out — and the audit trail exists from day one.
 */

interface Target {
  channel: NotifyChannel;
  to: string;
  name: string;
}

function targets(c: Contact, channels: NotifyChannel[]): Target[] {
  const out: Target[] = [];
  if (channels.includes("whatsapp") && c.phone && c.whatsappOptIn) out.push({ channel: "whatsapp", to: c.phone, name: c.name });
  if (channels.includes("email") && c.email) out.push({ channel: "email", to: c.email, name: c.name });
  return out;
}

async function deliver(kind: NotifyKind, t: Target, m: Message, refs: { intentId?: string; offerId?: string; documentId?: string; pdf?: { bytes: Uint8Array; filename: string } }): Promise<Notification> {
  const r = repo();
  const row = await r.createNotification({ kind, channel: t.channel, to: t.to, contactName: t.name, subject: t.channel === "email" ? m.subject : m.template?.name, body: m.text, intentId: refs.intentId, offerId: refs.offerId, documentId: refs.documentId, status: "queued" });
  const configured = t.channel === "whatsapp" ? whatsappConfigured() : emailConfigured();
  if (!configured) return r.updateNotification(row.id, { status: "skipped", error: `${t.channel === "whatsapp" ? "WhatsApp Cloud API" : "E-mail"} non configuré` });
  try {
    let providerId: string;
    if (t.channel === "whatsapp") {
      if (refs.pdf) providerId = await sendWhatsAppDocument(t.to, refs.pdf.bytes, refs.pdf.filename, m.text);
      else if (m.template && process.env.WA_FREEFORM !== "1") providerId = await sendWhatsAppTemplate(t.to, m.template.name, m.template.params);
      else providerId = await sendWhatsAppText(t.to, m.text);
    } else {
      providerId = await sendEmail(t.to, m.subject, emailHtml(m), m.text, refs.pdf ? [{ filename: refs.pdf.filename, content: refs.pdf.bytes }] : []);
    }
    return r.updateNotification(row.id, { status: "sent", providerId, sentAt: new Date().toISOString() });
  } catch (e) {
    return r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
  }
}

const contactForIntent = async (i: Intent): Promise<Contact | undefined> => (i.clientId ? repo().getContact(i.clientId) : undefined);

/** Broadcast a freshly published offer to the segment through the chosen channels. */
export async function notifyOfferPublished(o: Offer, channels: string[], segment: string): Promise<{ sent: number; skipped: number; failed: number }> {
  const wanted: NotifyChannel[] = [];
  if (channels.some((c) => /whatsapp/i.test(c))) wanted.push("whatsapp");
  if (channels.some((c) => /mail/i.test(c))) wanted.push("email");
  const tally = { sent: 0, skipped: 0, failed: 0 };
  if (!wanted.length) return tally;
  let contacts = (await repo().listContacts()).filter((c) => matchesSegment(c, segment));
  if (/porteur/i.test(segment)) {
    // Holders of the same line (ISIN): clients with a settled position on it.
    const r = repo();
    const [intents, offers] = await Promise.all([r.listIntents(), r.listOffers()]);
    const holders = new Set(positionsFrom(intents, offers).filter((p) => p.offer.isin === o.isin).map((p) => p.intent.clientId));
    contacts = (await r.listContacts()).filter((c) => holders.has(c.id));
  }
  for (const c of contacts) {
    const m = offerPublished(o, c.name.split(" ")[0]);
    for (const t of targets(c, wanted)) {
      const n = await deliver("offer_published", t, m, { offerId: o.id });
      tally[n.status === "sent" ? "sent" : n.status === "failed" ? "failed" : "skipped"] += 1;
    }
  }
  await repo().logEvent({ kind: "system", offerId: o.id, html: `Diffusion <b>${o.title}</b> (${segment}) : ${tally.sent} envoyé${tally.sent > 1 ? "s" : ""}, ${tally.skipped} en attente de configuration, ${tally.failed} en échec` });
  return tally;
}

function matchesSegment(c: Contact, segment: string): boolean {
  const s = c.segment.toLowerCase();
  if (/tous/i.test(segment)) return true;
  if (/institutionnel/i.test(segment)) return /institutionnel|entreprise/.test(s);
  if (/physique/i.test(segment)) return /physique|groupement|diaspora/.test(s);
  if (/porteur/i.test(segment)) return false; // resolved separately from positions
  return true;
}

/** Acknowledgement to the client who just raised a hand. */
export async function notifyIntentReceived(i: Intent, o: Offer, estimate?: string): Promise<void> {
  const c = await contactForIntent(i);
  if (!c) return;
  const m = intentReceived(i, o, estimate);
  const pref: NotifyChannel[] = i.channel === "E-mail" ? ["email"] : i.channel === "WhatsApp" ? ["whatsapp"] : ["whatsapp", "email"];
  for (const t of targets(c, pref)) await deliver("intent_received", t, m, { intentId: i.id, offerId: o.id });
}

/** Lifecycle update to the client (confirmée, transmise, servie…). */
export async function notifyIntentUpdated(i: Intent, o: Offer, state: IntentState, advisor?: string): Promise<void> {
  const c = await contactForIntent(i);
  if (!c) return;
  const m = intentUpdated(i, o, state, advisor);
  for (const t of targets(c, ["whatsapp", "email"])) await deliver(state === "servie" || state === "non_servie" ? "results" : "intent_update", t, m, { intentId: i.id, offerId: o.id });
}

/** Sends a generated PDF to its client on one channel. */
export async function notifyDocument(d: GeneratedDocument, channel: NotifyChannel): Promise<Notification | undefined> {
  const r = repo();
  const intents = await r.listIntents();
  const i = intents.find((x) => x.id === d.intentId);
  if (!i) return undefined;
  const c = await contactForIntent(i);
  if (!c) return undefined;
  const o = await r.getOffer(i.offerId);
  const m = documentSent(d, o);
  const [t] = targets(c, [channel]);
  if (!t) {
    return r.createNotification({ kind: "document", channel, to: "—", contactName: c.name, subject: m.subject, body: m.text, documentId: d.id, intentId: i.id, offerId: o?.id, status: "skipped", error: channel === "whatsapp" ? "Pas de numéro WhatsApp avec opt-in" : "Pas d'adresse e-mail" });
  }
  const bytes = await readSource(d.fileKey);
  return deliver("document", t, m, { intentId: i.id, offerId: o?.id, documentId: d.id, pdf: { bytes, filename: `${d.number}.pdf` } });
}
