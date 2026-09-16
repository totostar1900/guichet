import "server-only";

/**
 * Thin clients for the two outbound channels. Each returns a provider id on
 * success and throws on failure; `configured()` tells the dispatcher whether
 * to send or to record the message as "skipped" (dev, or channel not set up).
 */

/* ---------- WhatsApp Cloud API (Meta Graph) ---------- */

const GRAPH = "https://graph.facebook.com/v21.0";
const wa = () => ({ token: process.env.WHATSAPP_TOKEN, phoneId: process.env.WHATSAPP_PHONE_ID });
export const whatsappConfigured = (): boolean => Boolean(wa().token && wa().phoneId);

async function graph(path: string, body: unknown): Promise<{ id: string }> {
  const { token, phoneId } = wa();
  const res = await fetch(`${GRAPH}/${phoneId}/${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
  if (!res.ok || !json.messages?.[0]) throw new Error(json.error?.message ?? `WhatsApp HTTP ${res.status}`);
  return { id: json.messages[0].id };
}

/** Approved marketing/utility template with positional body parameters. */
export async function sendWhatsAppTemplate(to: string, template: string, params: string[], lang = "fr"): Promise<string> {
  const r = await graph("messages", {
    messaging_product: "whatsapp",
    to: to.replace(/[^\d]/g, ""),
    type: "template",
    template: { name: template, language: { code: lang }, components: params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [] },
  });
  return r.id;
}

/** Free-form text — only valid inside the 24 h service window opened by the client. */
export async function sendWhatsAppText(to: string, body: string): Promise<string> {
  const r = await graph("messages", { messaging_product: "whatsapp", to: to.replace(/[^\d]/g, ""), type: "text", text: { body, preview_url: true } });
  return r.id;
}

/** Uploads a PDF then sends it as a document message with a caption. */
export async function sendWhatsAppDocument(to: string, pdf: Uint8Array, filename: string, caption: string): Promise<string> {
  const { token, phoneId } = wa();
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", new Blob([Buffer.from(pdf)], { type: "application/pdf" }), filename);
  const up = await fetch(`${GRAPH}/${phoneId}/media`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  const upJson = (await up.json()) as { id?: string; error?: { message: string } };
  if (!up.ok || !upJson.id) throw new Error(upJson.error?.message ?? `WhatsApp media HTTP ${up.status}`);
  const r = await graph("messages", { messaging_product: "whatsapp", to: to.replace(/[^\d]/g, ""), type: "document", document: { id: upJson.id, filename, caption } });
  return r.id;
}

/** Downloads an inbound media (document, image) by its id: the Graph API gives a short-lived URL, then the bytes. */
export async function fetchWhatsAppMedia(mediaId: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const { token } = wa();
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { authorization: `Bearer ${token}` } });
  const m = (await meta.json()) as { url?: string; mime_type?: string; error?: { message: string } };
  if (!meta.ok || !m.url) throw new Error(m.error?.message ?? `WhatsApp media HTTP ${meta.status}`);
  const file = await fetch(m.url, { headers: { authorization: `Bearer ${token}` } });
  if (!file.ok) throw new Error(`WhatsApp media download HTTP ${file.status}`);
  return { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: m.mime_type ?? file.headers.get("content-type") ?? "application/octet-stream" };
}

/* ---------- E-mail (Resend) ---------- */

export const emailConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(to: string, subject: string, html: string, text: string, attachments: { filename: string; content: Uint8Array }[] = []): Promise<string> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      attachments: attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })),
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string };
  if (!res.ok || !json.id) throw new Error(json.message ?? `Resend HTTP ${res.status}`);
  return json.id;
}
