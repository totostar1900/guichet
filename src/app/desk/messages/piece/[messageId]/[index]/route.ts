import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/**
 * Sert une pièce jointe d'un message : desk seulement.
 *
 * ELLE SE DÉSIGNE PAR SON MESSAGE ET SON RANG, JAMAIS PAR SA CLEF. Une adresse
 * qui porterait la clef du dépôt laisserait demander n'importe quel fichier du
 * seau : les pièces d'un dossier KYC, les documents générés, les communiqués.
 * Ici l'appelant nomme un message et un rang, et le serveur va chercher la clef
 * lui-même : on ne peut demander que ce qui est effectivement attaché à ce
 * message-là.
 *
 * La route de « À valider » sert les pièces par identifiant d'entrée d'intake.
 * Une pièce de message n'en a plus, depuis que la pièce vit avec son message :
 * c'est pour cela que celle-ci existe.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ messageId: string; index: string }> }) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const { messageId, index } = await ctx.params;
  const rang = Number(index);
  if (!Number.isInteger(rang) || rang < 0) return new NextResponse("Rang invalide", { status: 400 });

  const message = (await repo().listInbound(400)).find((m) => m.id === messageId);
  const piece = message?.attachments?.[rang];
  if (!piece) return new NextResponse("Aucune pièce à ce rang", { status: 404 });

  const bytes = await readSource(piece.fileKey);
  /* UN SEUL EN-TÊTE SÉPARE LES DEUX GESTES. « inline » affiche la pièce dans le
     navigateur, « attachment » l'enregistre. Une pièce jointe n'est pas toujours
     un PDF : un .docx ou un .zip ne s'affichent pas, et le navigateur les
     téléchargerait de toute façon ou montrerait une page cassée. */
  const enregistrer = req.nextUrl.searchParams.get("t") === "1";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": piece.mimeType || "application/octet-stream",
      "content-disposition": `${enregistrer ? "attachment" : "inline"}; filename="${piece.name.replace(/["\\]/g, "")}"`,
      "cache-control": "private, max-age=300",
    },
  });
}
