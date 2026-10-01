import { NextResponse, type NextRequest } from "next/server";
import { ingererCourriel, lireRfc822, type Courriel } from "@/lib/intake/courriel";
import { direLeRefus } from "@/lib/intake/refus";

/**
 * Courrier entrant par jeton partagé → Messages et « À valider ».
 *
 * Deux apporteurs possibles :
 *  - un relais, Worker ou autre, qui poste le message brut
 *    (content-type message/rfc822) avec `Authorization: Bearer INBOUND_SECRET` ;
 *  - n'importe quel service qui poste du JSON
 *    { from, subject, text, attachments:[{filename, contentType, contentBase64}] }.
 *
 * Resend entre par `/api/inbound/resend` : il prouve son identité autrement et
 * partage ce traitement, qui vit dans `lib/intake/courriel.ts`.
 *
 * LE REFUS SE DIT, depuis le 2026-10-01. Cette route répondait 401 sans laisser
 * la moindre trace : un apporteur dont le jeton ne correspond pas pouvait
 * frapper des semaines, et le desk ne voyait qu'une chose, que rien n'arrivait.
 * C'est le motif exact de la clef VAPID absente, qui s'est cachée des mois
 * parce que l'écran accusait le navigateur. Une ligne au flux à chaque refus,
 * et le désaccord se voit le jour même.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JsonMail = { from?: string; subject?: string; text?: string; html?: string; attachments?: { filename?: string; contentType?: string; contentBase64?: string }[] };

export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_SECRET;
  if (!secret) return NextResponse.json({ error: "INBOUND_SECRET non configuré" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    // Une ligne par heure au plus : la route est publique, et un remède qui
    // s'écrit à chaque coup frappé devient lui-même une porte.
    await direLeRefus("Courrier entrant <b>refusé</b> : le jeton ne correspond pas à INBOUND_SECRET");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let mail: Courriel;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("message/rfc822") || ct.includes("text/plain")) {
    mail = await lireRfc822(new Uint8Array(await req.arrayBuffer()));
  } else {
    const j = (await req.json().catch(() => ({}))) as JsonMail;
    mail = {
      from: j.from ?? "inconnu",
      subject: j.subject ?? "",
      text: j.text ?? (j.html ?? "").replace(/<[^>]+>/g, " "),
      attachments: (j.attachments ?? []).filter((a) => a.contentBase64).map((a) => ({ name: a.filename ?? "piece", mimeType: a.contentType ?? "application/octet-stream", bytes: new Uint8Array(Buffer.from(a.contentBase64!, "base64")) })),
    };
  }

  const issue = await ingererCourriel(mail);
  return NextResponse.json({ ok: true, ...issue });
}
