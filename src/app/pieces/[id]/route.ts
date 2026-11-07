import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/**
 * LA COPIE D'UNE SOURCE PUBLIQUE, telle que le Desk l'a prise (7 novembre 2026).
 *
 * Elle est publique par nature : c'est la loi de finances d'un État ou le communiqué d'une agence, que la fiche cite déjà par son adresse. Un PDF s'ouvre à l'écran. Une
 * page web copiée n'est JAMAIS exécutée chez nous : elle est servie sous un bac à sable sans script, sans réseau, pour qu'un texte tiers ne parle pas avec nos cookies.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-z-]{6,40}$/i.test(id)) return new NextResponse("Pièce introuvable", { status: 404 });
  const piece = (await repo().listPiecesArchivees()).find((p) => p.id === id);
  if (!piece) return new NextResponse("Pièce introuvable", { status: 404 });
  let octets: Uint8Array;
  try {
    octets = await readSource(piece.cle);
  } catch {
    return new NextResponse("La copie n'a pas pu être relue", { status: 404 });
  }
  const html = piece.typeMime === "text/html";
  return new NextResponse(new Uint8Array(octets), {
    headers: {
      "content-type": html ? "text/html; charset=utf-8" : piece.typeMime,
      "content-disposition": `inline; filename="${piece.cle.split("/").pop()}"`,
      "x-content-type-options": "nosniff",
      ...(html ? { "content-security-policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:" } : {}),
      "cache-control": "public, max-age=3600",
    },
  });
}
