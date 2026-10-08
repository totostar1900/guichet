import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";

/**
 * L'ORDRE, LU AVANT D'ÊTRE SIGNÉ.
 *
 * Rendu à la volée, jamais rangé : relire trois fois son ordre avant de
 * s'engager ne doit pas produire trois pièces au registre. Une fois signé,
 * l'ordre devient un vrai document et se lit par /api/documents/[id].
 *
 * La garde est la même que partout : le desk, ou le client dont c'est
 * l'intention. Un aperçu reste une pièce privée.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Connexion requise", { status: 401 });
  const { id } = await ctx.params;
  const intent = (await repo().listIntents()).find((i) => i.id === id);
  if (!intent) return new NextResponse("Ordre introuvable", { status: 404 });
  if (!isDesk(s) && intent.clientId !== s.userId) return new NextResponse("Accès refusé", { status: 403 });
  const { renderForIntent } = await import("@/lib/documents/generate");
  const pdf = await renderForIntent(intent.type === "rachat" ? "cession" : "bulletin", intent.id);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="ordre-${intent.ref}.pdf"`, "cache-control": "private, no-store" },
  });
}
