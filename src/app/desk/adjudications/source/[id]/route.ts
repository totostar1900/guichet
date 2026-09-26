import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/** Le communiqué de résultats d'une séance, tel qu'il a été rapatrié : desk seulement. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });
  const r = await repo().getAuctionResult((await ctx.params).id);
  if (!r?.fileKey) return new NextResponse("Aucun fichier", { status: 404 });
  const bytes = await readSource(r.fileKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${r.fileKey.split("/").pop()}"`,
      "cache-control": "private, max-age=300",
    },
  });
}
