import { NextResponse, type NextRequest } from "next/server";
import { requireDesk } from "@/lib/auth";
import { renderIndexNote } from "@/lib/documents/generate";

/** Aperçu PDF de la note d'un mois : rendu à la demande, jamais stocké tant que le desk n'a pas publié. */
export async function GET(req: NextRequest) {
  await requireDesk("/desk/indice");
  const month = req.nextUrl.searchParams.get("mois") ?? undefined;
  const made = await renderIndexNote(month);
  if (!made) return new NextResponse("Aucune séance lue sur ce mois", { status: 404 });
  return new NextResponse(new Uint8Array(made.pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${made.note.number}.pdf"`, "cache-control": "private, no-store" } });
}
