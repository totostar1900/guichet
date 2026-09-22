import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { indexQuarterFor, publishQuarterNote } from "@/lib/documents/generate";
import { fillAll } from "@/lib/market/index-quarter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Note trimestrielle sur l'indice : préparée au début du trimestre suivant,
 * gardée dans Documents, jamais envoyée. Le desk relit et publie la page.
 * Idempotente : un trimestre ne produit qu'un document (même numéro).
 * Appel avec `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const now = new Date();
  const q = Math.floor(now.getUTCMonth() / 3) + 1;
  const key = q === 1 ? `${now.getUTCFullYear() - 1}-T4` : `${now.getUTCFullYear()}-T${q - 1}`;
  const note = await indexQuarterFor(key);
  if (!note) return NextResponse.json({ ok: true, key, skipped: "aucune séance lue sur ce trimestre" });
  const already = (await repo().listDocuments().catch(() => [])).find((d) => d.type === "note_indice" && d.number === note.number);
  if (already) return NextResponse.json({ ok: true, key, already: already.number });
  const doc = await publishQuarterNote(key, "le robot");
  if (!doc) return NextResponse.json({ ok: false, key, error: "note non produite" }, { status: 500 });
  await repo().logEvent({ kind: "desk", html: `Note trimestrielle sur l'indice : ${doc.number} · ${fillAll(note.headline)} · à relire avant diffusion` });
  return NextResponse.json({ ok: true, key, number: doc.number, methodOpen: note.methodOpen });
}
