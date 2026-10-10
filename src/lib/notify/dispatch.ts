import "server-only";
import { repo } from "@/lib/data";
import type { Contact, GeneratedDocument, Intent, IntentState, Notification, NotifyChannel, NotifyKind, Offer } from "@/lib/domain/types";
import { readSource } from "@/lib/intake/storage";
import { positionsFrom } from "@/lib/positions";
import { documentSent, emailHtml, intentReceived, intentUpdated, offerPublished, type Message } from "./compose";
import { isPromotional, mayReceive } from "./consent";
import { optOutUrl } from "@/lib/channels";
import { emailConfigured, sendEmail, sendWhatsAppDocument, sendWhatsAppTemplate, sendWhatsAppText, whatsappConfigured } from "./providers";
import { pushConfigured, sendPush, type PushPayload } from "./push";

/**
 * Records every outbound message, then sends it when the channel is configured.
 * Without credentials the row is kept as "skipped" so the desk sees exactly what
 * would have gone out : and the audit trail exists from day one.
 */

interface Target {
  channel: NotifyChannel;
  to: string;
  name: string;
  /** L’identifiant du client : le pied d’un message promotionnel en tire son lien de sortie. */
  id?: string;
}

/**
 * Les adresses joignables pour ce message.
 *
 * Le goulot par lequel passent tous les envois du desk, et donc le bon
 * endroit pour la règle : un message de service part sur ce qu'on a, une
 * information ou une opportunité seulement là où le client a dit oui.
 * WhatsApp avait sa case depuis toujours, l'e-mail partait à toute adresse
 * connue ; c'est cette asymétrie qui se referme ici.
 */
function targets(c: Contact, channels: NotifyChannel[], kind: NotifyKind): Target[] {
  const out: Target[] = [];
  if (channels.includes("whatsapp") && c.phone && c.whatsappOptIn && mayReceive(c, kind, "whatsapp")) out.push({ channel: "whatsapp", to: c.phone, name: c.name, id: c.id });
  if (channels.includes("email") && c.email && mayReceive(c, kind, "email")) out.push({ channel: "email", to: c.email, name: c.name, id: c.id });
  return out;
}

async function deliver(kind: NotifyKind, t: Target, m: Message, refs: { intentId?: string; offerId?: string; documentId?: string; pdf?: { bytes: Uint8Array; filename: string } }): Promise<Notification> {
  const r = repo();
  const row = await r.createNotification({ kind, channel: t.channel, to: t.to, contactName: t.name, subject: t.channel === "email" ? m.subject : m.template?.name, body: m.text, intentId: refs.intentId, offerId: refs.offerId, documentId: refs.documentId, status: "queued" });
  const configured = t.channel === "whatsapp" ? whatsappConfigured() : emailConfigured();
  /* LE MODE DÉMONSTRATION DES ENVOIS, et pourquoi il est explicite.
     Sans fournisseur, une notification est « skipped », et c'est juste : rien
     n'est parti. Mais plusieurs écrans refusent d'avancer tant qu'un message
     n'est pas parti, à commencer par la remise d'une échéance de prélèvement
     (« pas d'exécution sans préavis réellement parti ») : en local, où aucun
     fournisseur n'est posé, ces écrans n'étaient tout simplement PAS
     PARCOURABLES. C'est ainsi que la moitié desk des prélèvements est restée
     des semaines sans que personne ne l'ait vue fonctionner.
     NOTIFY_DEMO=1, posé à la main dans .env.local, fait comme si le canal
     avait répondu. La ligne porte « sent » et un identifiant « demo-… » :
     rien ne ressemble à un vrai envoi, et le journal des notifications le dit.
     Jamais en production, où la variable n'existe pas et où un fournisseur
     absent doit rester un envoi absent. */
  if (!configured && process.env.NOTIFY_DEMO === "1") return r.updateNotification(row.id, { status: "sent", providerId: `demo-${t.channel}`, sentAt: new Date().toISOString() });
  if (!configured) return r.updateNotification(row.id, { status: "skipped", error: `${t.channel === "whatsapp" ? "WhatsApp Cloud API" : "E-mail"} non configuré` });
  try {
    let providerId: string;
    if (t.channel === "whatsapp") {
      if (refs.pdf) providerId = await sendWhatsAppDocument(t.to, refs.pdf.bytes, refs.pdf.filename, m.text);
      else if (m.template && process.env.WA_FREEFORM !== "1") providerId = await sendWhatsAppTemplate(t.to, m.template.name, m.template.params);
      else providerId = await sendWhatsAppText(t.to, m.text);
    } else {
      // Le lien de sortie, sur les messages qui partent de nous seulement : un
      // avis d'opéré ne se refuse pas, il découle d'un ordre que le client a passé.
      providerId = await sendEmail(t.to, m.subject, emailHtml(m, isPromotional(kind) && t.id ? optOutUrl(t.id, "email") : undefined), m.text, refs.pdf ? [{ filename: refs.pdf.filename, content: refs.pdf.bytes }] : []);
    }
    return r.updateNotification(row.id, { status: "sent", providerId, sentAt: new Date().toISOString() });
  } catch (e) {
    return r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
  }
}

const contactForIntent = async (i: Intent): Promise<Contact | undefined> => {
  const c = i.clientId ? await repo().getContact(i.clientId) : undefined;
  if (!c) return i.contactPhone || i.contactEmail ? { id: i.clientId ?? i.id, name: i.clientName, segment: i.clientSegment, phone: i.contactPhone, email: i.contactEmail, whatsappOptIn: Boolean(i.contactPhone) } : undefined;
  return { ...c, phone: i.contactPhone ?? c.phone, email: i.contactEmail ?? c.email, whatsappOptIn: c.whatsappOptIn || Boolean(i.contactPhone) };
};

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
    for (const t of targets(c, wanted, "offer_published")) {
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

/**
 * Acknowledgement to the client who just raised a hand : on WhatsApp and by
 * e-mail whenever both are known, so the client sees at once that both work.
 */
export async function notifyIntentReceived(i: Intent, o: Offer, estimate?: string): Promise<Notification[]> {
  const c = await contactForIntent(i);
  if (!c) return [];
  const m = intentReceived(i, o, estimate);
  const out: Notification[] = [];
  for (const t of targets(c, ["whatsapp", "email"], "intent_received")) out.push(await deliver("intent_received", t, m, { intentId: i.id, offerId: o.id }));
  return out;
}

/** Lifecycle update to the client (confirmée, transmise, servie…). */
export async function notifyIntentUpdated(i: Intent, o: Offer, state: IntentState, advisor?: string): Promise<void> {
  const c = await contactForIntent(i);
  if (!c) return;
  const m = intentUpdated(i, o, state, advisor);
  const kind: NotifyKind = state === "servie" || state === "non_servie" ? "results" : "intent_update";
  for (const t of targets(c, ["whatsapp", "email"], kind)) await deliver(kind, t, m, { intentId: i.id, offerId: o.id });
  /* LE PUSH NE PORTAIT QUE LES OPPORTUNITÉS, et c'était l'inverse de ce qu'il
     faut. Un client qui installe le Guichet et accepte les alertes recevait
     « une nouvelle ligne est ouverte » et jamais « votre ordre est servi ». Or
     l'une se lit à loisir et l'autre engage son argent : « servi », « non
     servi » et « réglé » sont précisément les mots qu'on veut savoir dans la
     seconde, sans ouvrir sa boîte mail. */
  await pousser(c, kind, { title: pushTitre(state), body: m.text.slice(0, 140), url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/offres/${o.id}`, tag: `intent-${i.id}` }, { intentId: i.id, offerId: o.id });
}

/** Le titre d'une notification : court, et il dit l'état plutôt que « Guichet ». */
function pushTitre(state: IntentState): string {
  const mots: Partial<Record<IntentState, string>> = {
    confirmee: "Votre ordre est confirmé",
    transmise: "Votre ordre est transmis",
    servie: "Votre ordre est servi",
    non_servie: "Votre ordre n'a pas été servi",
    reglee: "Votre règlement est fait",
    contre_proposee: "Une proposition vous attend",
    annulee: "Votre ordre est clos",
  };
  return mots[state] ?? "Votre ordre avance";
}

/**
 * Pousser vers tous les appareils d'un client, et garder trace de chacun.
 *
 * Une notification par appareil, parce que chacune part ou échoue de son côté :
 * un téléphone désinscrit ne doit pas faire croire que la tablette n'a rien
 * reçu. Et comme pour les deux autres canaux, la ligne s'écrit même quand le
 * canal n'est pas configuré : le desk voit ce qui SERAIT parti.
 *
 * Le consentement est celui du canal, et il vaut aussi ici : un client qui a
 * refusé les alertes n'en reçoit pas, fût-ce sur son propre ordre.
 */
async function pousser(c: Contact, kind: NotifyKind, payload: PushPayload, refs: { intentId?: string; offerId?: string }): Promise<void> {
  if (!c.id || !mayReceive(c, kind, "push")) return;
  const r = repo();
  const subs = await r.listPushSubscriptions([c.id]).catch(() => []);
  for (const sub of subs) {
    const row = await r.createNotification({ kind, channel: "push", to: `${sub.endpoint.slice(0, 60)}…`, contactName: c.name, subject: payload.title, body: payload.body, intentId: refs.intentId, offerId: refs.offerId, status: "queued" });
    if (!pushConfigured()) {
      await r.updateNotification(row.id, { status: "skipped", error: "Push non configuré (VAPID)" });
      continue;
    }
    try {
      await sendPush(sub, payload);
      await r.updateNotification(row.id, { status: "sent", sentAt: new Date().toISOString() });
    } catch (e) {
      await r.updateNotification(row.id, { status: "failed", error: e instanceof Error ? e.message : "échec d'envoi" });
    }
  }
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
  const [t] = targets(c, [channel], "document");
  if (!t) {
    return r.createNotification({ kind: "document", channel, to: "—", contactName: c.name, subject: m.subject, body: m.text, documentId: d.id, intentId: i.id, offerId: o?.id, status: "skipped", error: channel === "whatsapp" ? "Pas de numéro WhatsApp avec opt-in" : "Pas d'adresse e-mail" });
  }
  const bytes = await readSource(d.fileKey);
  return deliver("document", t, m, { intentId: i.id, offerId: o?.id, documentId: d.id, pdf: { bytes, filename: `${d.number}.pdf` } });
}

/**
 * Sends a document that belongs to a client rather than to an intention (a
 * coupon notice, a mandate, a complaint copy, a transfer order) on one channel;
 * « skipped » with the reason when the client cannot be reached there.
 */
export async function notifyClientDocument(d: GeneratedDocument, c: Contact, channel: NotifyChannel): Promise<Notification> {
  const r = repo();
  const o = d.offerId ? await r.getOffer(d.offerId) : undefined;
  const m = documentSent(d, o ?? undefined);
  const [t] = targets(c, [channel], "document");
  if (!t) return r.createNotification({ kind: "document", channel, to: "—", contactName: c.name, subject: m.subject, body: m.text, documentId: d.id, intentId: d.intentId, offerId: d.offerId, status: "skipped", error: channel === "whatsapp" ? "Pas de numéro WhatsApp avec opt-in" : "Pas d'adresse e-mail" });
  const bytes = await readSource(d.fileKey);
  return deliver("document", t, m, { intentId: d.intentId, offerId: d.offerId, documentId: d.id, pdf: { bytes, filename: `${d.number}.pdf` } });
}

/**
 * A plain message to one contact on every channel they have (used by the
 * followed-lines alerts).
 *
 * LE MODÈLE EST FACULTATIF, ET SON ABSENCE A UN PRIX. Meta n'accepte un texte
 * libre que dans la fenêtre de vingt-quatre heures ouverte par le client ;
 * hors de cette fenêtre, seul un modèle approuvé passe. Un message qu'on
 * envoie au moment qu'on choisit, et non en réponse, doit donc en porter un,
 * sans quoi il échoue à l'envoi pour une raison qui n'a rien à voir avec son
 * contenu. L'e-mail, lui, ne lit que le sujet et le texte : un modèle ne
 * change rien de ce côté.
 */
export async function notifyRaw(kind: NotifyKind, c: Contact, m: { subject: string; text: string; template?: { name: string; params: string[] } }, refs: { offerId?: string } = {}): Promise<Notification[]> {
  const out: Notification[] = [];
  for (const t of targets(c, ["whatsapp", "email"], kind)) out.push(await deliver(kind, t, { subject: m.subject, text: m.text, template: m.template }, refs));
  return out;
}
