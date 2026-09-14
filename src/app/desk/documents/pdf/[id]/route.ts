import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/** Serves a generated PDF: desk, or the client the document belongs to. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Connexion requise", { status: 401 });
  const doc = await repo().getDocument((await ctx.params).id);
  if (!doc) return new NextResponse("Document introuvable", { status: 404 });
  if (s.role !== "desk") {
    if (doc.type === "dossier_svt" || doc.type === "bordereau") return new NextResponse("Accès refusé", { status: 403 });
    let mine = false;
    if (doc.intentId) mine = (await repo().listIntents()).some((i) => i.id === doc.intentId && i.clientId === s.userId);
    if (!mine && doc.clientFileId) mine = (await repo().getClientFile(doc.clientFileId))?.userId === s.userId;
    if (!mine && doc.clientId) mine = doc.clientId === s.userId;
    if (!mine) return new NextResponse("Accès refusé", { status: 403 });
  }
  const bytes = await readSource(doc.fileKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${doc.number}.pdf"`, "cache-control": "private, max-age=300" },
  });
}
