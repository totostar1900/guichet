import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/**
 * Sert le PDF archivé d'une séance : desk seulement.
 *
 * IL SE DÉSIGNE PAR SA SÉANCE, JAMAIS PAR SA CLEF DE DÉPÔT. Une adresse qui
 * porterait la clef laisserait demander n'importe quel fichier du seau : les
 * pièces d'un dossier KYC, les communiqués, les documents générés. Ici
 * l'appelant nomme une date, et le serveur va chercher la clef lui-même. C'est
 * la règle déjà suivie par les pièces de message, et elle vaut pour la même
 * raison.
 *
 * Trente-quatre bulletins sur huit cent huit sont archivés : le rattrapage de
 * l'historique ne gardait pas les PDF. Pour les autres, la page du dépôt mène
 * à l'adresse d'origine, sur le site de la bourse.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ seance: string }> }) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const { seance } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(seance)) return new NextResponse("Séance invalide", { status: 400 });

  const bulletin = (await repo().listBulletins(2000)).find((b) => b.sessionDate === seance);
  if (!bulletin?.fileKey) return new NextResponse("Aucun PDF archivé pour cette séance", { status: 404 });

  let bytes: Uint8Array;
  try {
    bytes = await readSource(bulletin.fileKey);
  } catch {
    /* La base dit que le fichier existe, le dépôt dit que non. Le cas se
       produit après un nettoyage de seau, et un 500 ferait croire à une panne
       de la page : c'est une pièce manquante, et elle se nomme. */
    return new NextResponse("Le PDF a été archivé puis retiré du dépôt", { status: 404 });
  }

  const enregistrer = req.nextUrl.searchParams.get("t") === "1";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${enregistrer ? "attachment" : "inline"}; filename="BOC-${seance}.pdf"`,
      "cache-control": "private, max-age=300",
    },
  });
}
