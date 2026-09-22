import { NextResponse } from "next/server";
import { renderQuarterNote } from "@/lib/documents/generate";

export const dynamic = "force-dynamic";

/** La note trimestrielle en PDF : publique, comme la page, et rendue des mêmes chiffres. */
export async function GET(_req: Request, { params }: { params: Promise<{ trimestre: string }> }) {
  const { trimestre } = await params;
  const made = await renderQuarterNote(trimestre.toUpperCase());
  if (!made) return new NextResponse("Aucune séance lue sur ce trimestre", { status: 404 });
  return new NextResponse(new Uint8Array(made.pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${made.note.number}.pdf"`, "cache-control": "public, max-age=600" },
  });
}
