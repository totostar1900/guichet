import { NextResponse, type NextRequest } from "next/server";
import { routeDuRobot } from "@/lib/cron/tour";
import { rafraichirIndicateurs } from "@/lib/market/pays-lecture";

/**
 * Les indicateurs des fiches pays, lus chaque mois au FMI et à la Banque mondiale.
 *
 * Le FMI publie deux fois par an et la Banque mondiale une fois : lire chaque mois suffit, et rattrape une source injoignable le mois d'avant. Le robot ne saisit rien
 * d'autre : les notations, évaluations et événements viennent du Desk, chaque trimestre.
 *
 * `Authorization: Bearer <CRON_SECRET>`.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return routeDuRobot("pays", req, async () => {
    const b = await rafraichirIndicateurs();
    /* Aucune valeur lue : un 502, pour que le tour se lise comme un échec dans le registre et non comme un succès vide. */
    if (!b.lues) return NextResponse.json({ lues: 0, erreurs: b.erreurs }, { status: 502 });
    return { lues: b.lues, erreurs: b.erreurs };
  });
}
