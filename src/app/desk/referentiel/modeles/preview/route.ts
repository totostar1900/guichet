import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import type { DocumentType } from "@/lib/domain/types";
import { renderPreview } from "@/lib/documents/generate";
import { PASSAGES } from "@/lib/documents/passages";

/**
 * A document model on demonstration data: with its wording in force
 * (?type=), with one saved version substituted (?v=<id>), or with a draft
 * text for one passage (?passage=&fr=). The bordereau has two layouts
 * (?variante=opcvm for the fund centralisation). Desk only; never stored.
 */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  if (!(type in PASSAGES)) return new NextResponse("Modèle inconnu", { status: 404 });
  let override: { passage: string; fr: string } | undefined;
  const v = sp.get("v");
  if (v) {
    const row = (await repo().listTemplateTexts(type as DocumentType)).find((r) => r.id === v);
    if (row) override = { passage: row.passage, fr: row.fr };
  } else if (sp.get("passage") && sp.get("fr") != null) {
    override = { passage: sp.get("passage")!, fr: sp.get("fr")!.slice(0, 4000) };
  }
  const pdf = await renderPreview(type as DocumentType, override, sp.get("variante") ?? undefined);
  if (!pdf) return new NextResponse("Pas d'aperçu pour ce modèle", { status: 404 });
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="apercu-${type}.pdf"`, "cache-control": "private, no-store" } });
}
