import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/** Serves a document the desk attached to a line (public, like the line itself). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await ctx.params;
  const o = await repo().getOffer(id);
  const d = o?.documents[Number(n)];
  if (!o || o.hidden || !d?.fileKey) return new NextResponse("Document introuvable", { status: 404 });
  const bytes = await readSource(d.fileKey);
  const name = d.fileKey.split("/").pop() ?? "document";
  return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": d.mimeType ?? "application/pdf", "content-disposition": `inline; filename="${name}"`, "cache-control": "public, max-age=3600" } });
}
