import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { renderConventionModel } from "@/lib/documents/generate";

/**
 * The blank convention any signed-in user can read before accepting.
 *
 * Elle vivait sous « /desk », donc le client qu'on invite à l'accepter ne
 * pouvait pas la lire : le proxy l'envoyait sur l'hôte du desk, qui le
 * refoulait. On demandait une signature sur un texte inaccessible. Le segment
 * fixe passe avant « [id] » dans le routage de Next, les deux cohabitent.
 */
export async function GET() {
  if (!(await getSession())) return new NextResponse("Connexion requise", { status: 401 });
  const pdf = await renderConventionModel();
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": 'inline; filename="convention-compte-titres.pdf"' } });
}
