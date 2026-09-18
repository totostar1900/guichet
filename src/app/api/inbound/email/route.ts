import { NextResponse, type NextRequest } from "next/server";
import PostalMime from "postal-mime";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import { ingestSource, trustedSender } from "@/lib/intake/ingest";

/**
 * Inbound e-mail → « À valider ». Point a mailbox at this endpoint:
 *  - Cloudflare Email Routing (free): a Worker forwards the raw message
 *    (content-type message/rfc822) with `Authorization: Bearer INBOUND_SECRET`;
 *  - any provider that posts JSON { from, subject, text, attachments:[{filename, contentType, contentBase64}] }.
 * Each attachment (PDF / image) becomes its own intake item; the body alone
 * becomes a text item when there is no attachment. A sender listed in
 * INTAKE_TRUSTED_SENDERS starts as an official source.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JsonMail = { from?: string; subject?: string; text?: string; html?: string; attachments?: { filename?: string; contentType?: string; contentBase64?: string }[] };

export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_SECRET;
  if (!secret) return NextResponse.json({ error: "INBOUND_SECRET non configuré" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  let mail: { from: string; subject: string; text: string; attachments: { name: string; mimeType: string; bytes: Uint8Array }[] };
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("message/rfc822") || ct.includes("text/plain")) {
    const raw = new Uint8Array(await req.arrayBuffer());
    const parsed = await new PostalMime().parse(raw);
    mail = {
      from: parsed.from?.address ?? parsed.from?.name ?? "inconnu",
      subject: parsed.subject ?? "",
      text: parsed.text ?? (parsed.html ?? "").replace(/<[^>]+>/g, " "),
      attachments: parsed.attachments.map((a) => ({ name: a.filename ?? "piece", mimeType: a.mimeType, bytes: typeof a.content === "string" ? new TextEncoder().encode(a.content) : new Uint8Array(a.content) })),
    };
  } else {
    const j = (await req.json().catch(() => ({}))) as JsonMail;
    mail = {
      from: j.from ?? "inconnu",
      subject: j.subject ?? "",
      text: j.text ?? (j.html ?? "").replace(/<[^>]+>/g, " "),
      attachments: (j.attachments ?? []).filter((a) => a.contentBase64).map((a) => ({ name: a.filename ?? "piece", mimeType: a.contentType ?? "application/octet-stream", bytes: new Uint8Array(Buffer.from(a.contentBase64!, "base64")) })),
    };
  }

  const trusted = trustedSender(mail.from);
  const fromLabel = `${mail.from} · e-mail`;
  // Every e-mail is also a message in the desk inbox (a client's question is not a source to ingest).
  await repo().createInbound({ channel: "email", from: mail.from.toLowerCase(), subject: mail.subject, body: mail.text.slice(0, 4000) });
  if (!trusted && mail.attachments.length === 0) return NextResponse.json({ ok: true, created: [], errors: [] });
  const hint = mail.subject ? `Objet du courriel : ${mail.subject}` : undefined;
  const created: string[] = [];
  const errors: string[] = [];
  const usable = mail.attachments.filter((a) => a.mimeType === "application/pdf" || a.mimeType.startsWith("image/"));
  if (usable.length === 0) {
    const res = await ingestSource({ title: mail.subject, fromLabel, hint, text: `Objet : ${mail.subject}\nDe : ${mail.from}\n\n${mail.text}`, trusted, source: "mail" });
    if (res.ok) created.push(res.item.id);
    else errors.push(res.error);
  }
  for (const a of usable) {
    const res = await ingestSource({ title: mail.subject || a.name, fromLabel, hint: `${hint ?? ""} Pièce jointe ${a.name}.`.trim(), file: a, trusted });
    if (res.ok) created.push(res.item.id);
    else errors.push(`${a.name} : ${res.error}`);
  }
  for (const id of created) await audit("intake.create", "intake", id, { after: { from: mail.from, subject: mail.subject, channel: "email" }, actor: "courriel entrant" });
  if (errors.length) await repo().logEvent({ kind: "system", html: `Courriel de ${mail.from} : ${errors.join(" · ")}` });
  return NextResponse.json({ ok: true, created, errors });
}
