import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { toCsv } from "@/lib/reporting";
import { localIso } from "@/lib/format";
import { donneesDe, lignesBeac, lireReglages } from "@/lib/market/courbes-beac-vue";

/**
 * L'EXTRACTION DES COURBES DE LA BEAC : desk seulement.
 *
 * Deux portées. Par défaut, ce que la figure trace : les réglages de l'adresse sont
 * ceux de la page (axe, Trésors, mois ou durée suivie), donc le fichier est la
 * figure vue de près. Avec `tout=1`, toute la base, tous mois et Trésors confondus.
 *
 * Ce sont les chiffres de la BEAC tels que la base les porte : une ligne par point,
 * avec l'adresse de sa feuille quand il en a une. Aucune de nos courbes n'y est :
 * elles sont ajustées et datées d'aujourd'hui, elles sortent par l'export d'Analyses.
 */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || !isDesk(s)) return new NextResponse("Accès desk requis", { status: 403 });

  const points = await repo().courbesBeac().catch(() => []);
  const sp = Object.fromEntries([...new Set(req.nextUrl.searchParams.keys())].map((k) => [k, req.nextUrl.searchParams.getAll(k)]));
  const tout = req.nextUrl.searchParams.get("tout") === "1";
  const lignes = lignesBeac(points, lireReglages(sp, donneesDe(points)), tout);
  const csv = toCsv(
    ["Trésor", "Mois", "Durée d'émission", "Années", "Taux %", "Feuille de la BEAC"],
    lignes.map((l) => [l.pays, l.mois, l.duree, String(l.annees).replace(".", ","), l.taux.toFixed(2).replace(".", ","), l.feuille]),
  );
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="courbes-beac-${tout ? "base" : "selection"}-${localIso(new Date())}.csv"`,
    },
  });
}
