import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/** A KYC piece: the desk, or the file's owner. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ fileId: string; kind: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Connexion requise", { status: 401 });
  const { fileId, kind } = await ctx.params;
  const f = await repo().getClientFile(fileId);
  if (!f) return new NextResponse("Dossier introuvable", { status: 404 });
  if (s.role !== "desk" && f.userId !== s.userId) return new NextResponse("Accès refusé", { status: 403 });
  const d = f.documents.find((x) => x.kind === kind);
  if (!d) return new NextResponse("Pièce introuvable", { status: 404 });
  const bytes = await readSource(d.fileKey);
  return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": d.mimeType, "content-disposition": `inline; filename="${d.fileName}"`, "cache-control": "private, max-age=300" } });
}
