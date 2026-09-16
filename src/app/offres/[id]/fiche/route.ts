import { NextResponse } from "next/server";
import { loadRegistry } from "@/lib/reference";
import { renderOfferSheet } from "@/lib/documents/generate";

/** Fiche PDF d'une ligne — publique, comme la page ; à joindre sur WhatsApp ou par e-mail. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await loadRegistry();
  const { id } = await ctx.params;
  const out = await renderOfferSheet(id);
  if (!out) return new NextResponse("Ligne inconnue", { status: 404 });
  return new NextResponse(new Uint8Array(out.pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${out.number}.pdf"` } });
}
