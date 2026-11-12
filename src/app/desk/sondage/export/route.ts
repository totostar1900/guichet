import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { toCsv } from "@/lib/reporting";
import { localIso } from "@/lib/format";
import { demandesDuGroupe, ENTETES_D_EXPORT, lignesDExport } from "@/lib/domain/sondage-analyse";

/**
 * L'EXTRACTION DU SONDAGE : desk seulement (12 novembre 2026, planche « Annonces », choix 2A).
 *
 * Sans paramètre, toutes les lignes sondées (questions du desk, réponses, demandes de clients) : de quoi conduire une analyse dans un tableur. Avec `cle`, un seul sondage : ses
 * demandes, plus la question du desk quand il y en a une. Les coordonnées du client (nom, segment) y sont, comme dans le détail de la page : le desk les voit déjà.
 */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const lignes = await repo().listLignesSondees();
  const parId = new Map(lignes.map((l) => [l.id, l]));
  const cle = req.nextUrl.searchParams.get("cle");
  const choisies = cle ? [...(cle.startsWith("desk:") && parId.get(cle.slice(5)) ? [parId.get(cle.slice(5))!] : []), ...demandesDuGroupe(lignes, cle)] : lignes;
  const csv = toCsv(ENTETES_D_EXPORT, lignesDExport(choisies, parId));
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="sondage-${cle ? "selection" : "tout"}-${localIso(new Date())}.csv"`,
    },
  });
}
