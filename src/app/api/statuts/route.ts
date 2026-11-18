import { NextResponse } from "next/server";
import { chargerStatuts } from "@/components/statuts/chargerStatuts";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";

/**
 * LES STATUTS D'UN CLIENT, POUR LA BULLE (18 novembre 2026) : le message à tirer et une page par ligne retenue. Rendu à la demande par la bulle, une fois par ouverture de l'application,
 * pour que ni le serveur de chaque page ni la mise en page n'aient à les lire. Rien pour un visiteur ni pour le desk (il a sa page).
 */
export async function GET() {
  const s = await getSession();
  if (!s || isDesk(s)) return new NextResponse(null, { status: 204 });
  const offres = await repo().listOffers().catch(() => []);
  const statuts = await chargerStatuts(offres, new Date());
  return NextResponse.json(statuts, { headers: { "cache-control": "private, max-age=60" } });
}
