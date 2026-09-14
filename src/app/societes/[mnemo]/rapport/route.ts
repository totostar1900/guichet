import { NextResponse, type NextRequest } from "next/server";
import { renderCompanyReport } from "@/lib/documents/generate";

/** Rapport PDF sur une société cotée, sur la période du graphique (?p=1m|3m|ytd|1a|max). Public, comme la page. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ mnemo: string }> }) {
  const { mnemo } = await ctx.params;
  const out = await renderCompanyReport(mnemo, req.nextUrl.searchParams.get("p") ?? "ytd");
  if (!out) return new NextResponse("Société inconnue", { status: 404 });
  return new NextResponse(new Uint8Array(out.pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${out.number}.pdf"` } });
}
