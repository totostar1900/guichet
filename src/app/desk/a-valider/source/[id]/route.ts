import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/** Serves the original source file of an intake item — desk only. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || s.role !== "desk") return new NextResponse("Accès desk requis", { status: 403 });
  const item = await repo().getIntake((await ctx.params).id);
  if (!item?.fileName) return new NextResponse("Aucun fichier", { status: 404 });
  const bytes = await readSource(item.fileName);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": item.mimeType ?? "application/octet-stream", "content-disposition": `inline; filename="${item.fileName}"`, "cache-control": "private, max-age=300" },
  });
}
