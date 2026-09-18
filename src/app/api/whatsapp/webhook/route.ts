import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { answerInbound, botAvailable } from "@/lib/bot/reply";
import { fetchWhatsAppMedia, sendWhatsAppText, whatsappConfigured } from "@/lib/notify/providers";
import { audit } from "@/lib/audit";
import { ingestSource, trustedSender } from "@/lib/intake/ingest";

/**
 * Meta WhatsApp Cloud API webhook.
 *  GET  — verification handshake (hub.challenge) with WHATSAPP_VERIFY_TOKEN.
 *  POST — inbound messages and delivery statuses. Inbound text is logged to
 *         the desk feed; it also opens the 24 h free-form window for that number.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN && p.get("hub.challenge")) {
    return new NextResponse(p.get("hub.challenge"), { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type Media = { id: string; mime_type?: string; filename?: string; caption?: string };
type Inbound = { entry?: { changes?: { value?: { contacts?: { profile?: { name?: string } }[]; messages?: { from: string; type: string; text?: { body: string }; button?: { text: string }; interactive?: { button_reply?: { title: string }; list_reply?: { title: string } }; document?: Media; image?: Media }[]; statuses?: { id: string; status: string; errors?: { title: string }[] }[] } }[] }[] };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Inbound;
  const r = repo();
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      for (const m of v?.messages ?? []) {
        // A document or a photo: from a staff phone it is a source for the desk queue; from a client, a piece the desk is told about.
        const media = m.document ?? m.image;
        if (media && (m.type === "document" || m.type === "image")) {
          await handleMedia(m.from, media, m.type);
          continue;
        }
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? `(${m.type})`;
        await r.logEvent({ kind: "intent", html: `<b>WhatsApp entrant</b> de +${m.from} : « ${text.slice(0, 200).replace(/</g, "&lt;")} »` });
        await r.createInbound({ channel: "whatsapp", from: `+${m.from}`, name: v?.contacts?.[0]?.profile?.name, body: text });
        const reply = await handleInbound(m.from, text);
        if (reply && whatsappConfigured()) {
          try {
            const id = await sendWhatsAppText(m.from, reply);
            await r.createNotification({ kind: "intent_update", channel: "whatsapp", to: `+${m.from}`, body: reply, status: "sent", providerId: id, sentAt: new Date().toISOString() });
          } catch (e) {
            await r.createNotification({ kind: "intent_update", channel: "whatsapp", to: `+${m.from}`, body: reply, status: "failed", error: e instanceof Error ? e.message : "échec" });
          }
        }
      }
      for (const s of v?.statuses ?? []) {
        if (s.status === "failed") await r.logEvent({ kind: "system", html: `WhatsApp : échec de remise (${s.id}) — ${s.errors?.[0]?.title ?? "erreur"}` });
      }
    }
  }
  return NextResponse.json({ ok: true });
}

/** Staff numbers (profiles with desk access) and INTAKE_TRUSTED_SENDERS feed the queue; anyone else is only logged. */
async function handleMedia(from: string, media: Media, type: "document" | "image"): Promise<void> {
  const r = repo();
  const digits = from.replace(/[^\d]/g, "");
  const staff = (await r.listStaff()).find((s) => s.phone && s.phone.replace(/[^\d]/g, "") === digits);
  const trusted = Boolean(staff) || trustedSender(`+${digits}`);
  const label = `${staff ? staff.name : `+${from}`} · WhatsApp`;
  if (!trusted) {
    await r.logEvent({ kind: "intent", html: `<b>WhatsApp entrant</b> de +${from} : ${type === "image" ? "une photo" : `un document${media.filename ? ` (${media.filename})` : ""}`}${media.caption ? ` — « ${media.caption.slice(0, 120).replace(/</g, "&lt;")} »` : ""} — non repris (numéro hors équipe)` });
    return;
  }
  if (!whatsappConfigured()) {
    await r.logEvent({ kind: "system", html: `WhatsApp : pièce de ${label} non téléchargée (WHATSAPP_TOKEN absent)` });
    return;
  }
  try {
    const { bytes, mimeType } = await fetchWhatsAppMedia(media.id);
    const res = await ingestSource({ title: media.caption || media.filename, fromLabel: label, hint: media.caption, file: { bytes, mimeType: media.mime_type ?? mimeType, name: media.filename ?? `whatsapp.${type === "image" ? "jpg" : "pdf"}` }, trusted: true });
    if (res.ok) await audit("intake.create", "intake", res.item.id, { after: { from: label, channel: "whatsapp", file: media.filename }, actor: staff?.email ?? label });
    else await r.logEvent({ kind: "system", html: `WhatsApp : pièce de ${label} refusée — ${res.error}` });
  } catch (e) {
    await r.logEvent({ kind: "system", html: `WhatsApp : pièce de ${label} non reprise — ${e instanceof Error ? e.message : "erreur"}` });
  }
}

/** Keywords first (opt-out / opt-in), then the robot when it is enabled. */
async function handleInbound(from: string, text: string): Promise<string | undefined> {
  const r = repo();
  const t = text.trim().toLowerCase();
  const contacts = await r.listContacts();
  const digits = from.replace(/[^\d]/g, "");
  const contact = contacts.find((c) => c.phone && c.phone.replace(/[^\d]/g, "") === digits);
  if (["stop", "arret", "arrêt", "désabonner", "desabonner"].includes(t)) {
    if (contact) await r.setContactOptIn(contact.id, false);
    await r.logEvent({ kind: "system", html: `STOP reçu de +${from} — diffusion WhatsApp désactivée` });
    return "C'est noté : vous ne recevrez plus nos offres sur WhatsApp. Répondez START pour les réactiver. Vos documents et avis restent disponibles dans votre espace Guichet.";
  }
  if (["start", "oui", "ok", "reprendre"].includes(t)) {
    if (contact) await r.setContactOptIn(contact.id, true);
    return "Merci ! Vous recevrez à nouveau nos offres et avis sur WhatsApp. Répondez STOP à tout moment pour arrêter.";
  }
  if (!botAvailable()) return undefined;
  try {
    const { answer } = await answerInbound(from, text);
    return answer.reply;
  } catch (e) {
    await r.logEvent({ kind: "system", html: `Robot indisponible : ${e instanceof Error ? e.message : "erreur"}` });
    return undefined;
  }
}
