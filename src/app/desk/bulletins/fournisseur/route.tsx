import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { RapportFournisseurPdf } from "@/lib/documents/pdf/fournisseur-templates";
import { classeurFournisseur } from "@/lib/market/rapport-classeur";
import { construireRapport } from "@/lib/market/rapport-fournisseur";

/**
 * LE RAPPORT AU FOURNISSEUR, SUR UNE PLAGE DE DATES, EN CLASSEUR OU EN PDF.
 *
 * Une seule route pour les deux formats : les données sont les mêmes, et deux
 * routes auraient dérivé l'une de l'autre au premier changement. Le format se
 * demande en paramètre.
 *
 * DESK SEULEMENT, et la raison dépasse la confidentialité : ce document porte
 * l'en-tête de la maison et met en cause la publication d'un tiers. Il n'est
 * pas une page, c'est un courrier.
 */
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const p = req.nextUrl.searchParams;
  const du = p.get("du") ?? "";
  const au = p.get("au") ?? "";
  const format = p.get("format") === "pdf" ? "pdf" : "xlsx";
  if (!JOUR.test(du) || !JOUR.test(au)) return new NextResponse("Dates attendues au format AAAA-MM-JJ", { status: 400 });
  if (du > au) return new NextResponse("La date de début suit la date de fin", { status: 400 });

  const rapport = construireRapport(await repo().listBulletins(3000), du, au);
  /* Une plage vide rend 404 plutôt qu'un document vide : un classeur de six
     feuilles blanches envoyé à un tiers est pire que pas de classeur. */
  if (rapport.seances === 0) return new NextResponse("Aucune séance sur cette plage", { status: 404 });

  const nom = `qualite-donnees-boc-${du}-${au}`;
  if (format === "pdf") {
    const pdf = await renderToBuffer(<RapportFournisseurPdf r={rapport} />);
    return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${nom}.pdf"` } });
  }
  const xlsx = await classeurFournisseur(rapport);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${nom}.xlsx"` },
  });
}
