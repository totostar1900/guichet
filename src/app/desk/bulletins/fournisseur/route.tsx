import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { classeurFournisseur } from "@/lib/market/rapport-classeur";
import { construireRapport } from "@/lib/market/rapport-fournisseur";

/**
 * LE RELEVÉ DE QUALITÉ DES DONNÉES, EN CLASSEUR, ET RIEN D'AUTRE.
 *
 * LE PDF A ÉTÉ RETIRÉ le 13 octobre 2026, à la demande de Georges, et la
 * raison vaut d'être écrite : il essayait d'être deux choses à la fois. Un
 * courrier se signe sur papier à en-tête et argumente ; un relevé s'exploite,
 * se trie et se filtre. Le même document ne peut pas faire les deux, et c'est
 * le relevé qui a souffert du compromis.
 *
 * Le courrier, quand il partira, est un document à part, comme celui sur la
 * méthodologie de l'indice. Ce classeur en est l'annexe.
 *
 * DESK SEULEMENT, et la raison dépasse la confidentialité : ce document met
 * en cause la publication d'un tiers.
 */
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const p = req.nextUrl.searchParams;
  const du = p.get("du") ?? "";
  const au = p.get("au") ?? "";
  if (!JOUR.test(du) || !JOUR.test(au)) return new NextResponse("Dates attendues au format AAAA-MM-JJ", { status: 400 });
  if (du > au) return new NextResponse("La date de début suit la date de fin", { status: 400 });

  const rapport = construireRapport(await repo().listBulletins(3000), du, au);
  /* Une plage vide rend 404 plutôt qu'un document vide : un classeur de
     feuilles blanches envoyé à un tiers est pire que pas de classeur. */
  if (rapport.seances === 0) return new NextResponse("Aucune séance sur cette plage", { status: 404 });

  const xlsx = await classeurFournisseur(rapport);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="qualite-donnees-boc-${du}-${au}.xlsx"`,
    },
  });
}
