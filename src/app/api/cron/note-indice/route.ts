import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { indexNoteFor, publishIndexNote } from "@/lib/documents/generate";
import { noteSummary } from "@/lib/market/index-note";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Note mensuelle sur l'indice : produced once the month is closed, on the
 * first days of the following month. The PDF is stored and the desk is told;
 * nothing is sent to a client here : a person reads and sends it.
 * Idempotent : the note of a month is produced once (same number).
 * Call with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const r = repo();
  const now = new Date();
  // the month that just closed
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  const month = prev.toISOString().slice(0, 7);
  const note = await indexNoteFor(month);
  if (!note) return NextResponse.json({ ok: true, month, skipped: "aucune séance lue sur ce mois" });
  const already = (await r.listDocuments().catch(() => [])).find((d) => d.type === "note_indice" && d.number === note.number);
  if (already) return NextResponse.json({ ok: true, month, already: already.number });
  const doc = await publishIndexNote(month, "le robot");
  if (!doc) return NextResponse.json({ ok: false, month, error: "note non produite" }, { status: 500 });
  await r.logEvent({ kind: "desk", html: `Note mensuelle sur l'indice : ${doc.number} · ${noteSummary(note)} · à relire avant envoi` });
  return NextResponse.json({ ok: true, month, number: doc.number, summary: noteSummary(note), unexplained: note.unexplained.length });
}
