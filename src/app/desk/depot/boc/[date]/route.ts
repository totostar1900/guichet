import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/** The bulletin's PDF as the Guichet kept it (bucket « sources », boc/BOC-YYYYMMDD.pdf) : desk only. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ date: string }> }) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });
  const { date } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new NextResponse("Date invalide", { status: 400 });
  const b = await repo().getBulletin(date);
  if (!b?.fileKey) return new NextResponse("PDF non conservé pour cette séance", { status: 404 });
  const bytes = await readSource(b.fileKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="BOC-${date.replace(/-/g, "")}.pdf"`, "cache-control": "private, max-age=3600" },
  });
}
