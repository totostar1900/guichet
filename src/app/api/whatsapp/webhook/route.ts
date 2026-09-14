import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";

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

type Inbound = { entry?: { changes?: { value?: { messages?: { from: string; type: string; text?: { body: string }; button?: { text: string }; interactive?: { button_reply?: { title: string }; list_reply?: { title: string } } }[]; statuses?: { id: string; status: string; errors?: { title: string }[] }[] } }[] }[] };

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Inbound;
  const r = repo();
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      for (const m of v?.messages ?? []) {
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? `(${m.type})`;
        await r.logEvent({ kind: "intent", html: `<b>WhatsApp entrant</b> de +${m.from} : « ${text.slice(0, 200).replace(/</g, "&lt;")} »` });
      }
      for (const s of v?.statuses ?? []) {
        if (s.status === "failed") await r.logEvent({ kind: "system", html: `WhatsApp : échec de remise (${s.id}) — ${s.errors?.[0]?.title ?? "erreur"}` });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
