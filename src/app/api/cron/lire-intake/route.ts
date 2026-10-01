import { NextResponse, type NextRequest } from "next/server";
import { extractionAvailable } from "@/lib/intake/extract";
import { lireUnePiece, piecesALire, type Lue } from "@/lib/intake/lecture";

/**
 * Lire les pièces d'intake qui attendent, par petits paquets.
 *
 * POURQUOI CETTE PASSE EXISTE. La lecture se faisait dans la requête du webhook
 * de Resend, et le 2026-10-01 une pièce est restée « lecture automatique en
 * cours » : la fonction a soixante secondes pour vivre, un modèle qui lit un PDF
 * n'y tient pas, et une fonction tuée n'exécute aucun `catch`, donc rien ne
 * s'écrit et rien ne se dit. Un webhook n'a d'ailleurs aucune raison d'attendre
 * une lecture : Resend veut une réponse en quelques secondes, et il la reçoit
 * maintenant tout de suite.
 *
 * La forme est celle de `lire-adjudications`, pour les mêmes raisons :
 *
 *  - **par paquets.** « n » borne le paquet, et le compte rendu dit ce qui
 *    reste, pour que l'appelant sache quand s'arrêter.
 *  - **elle ne confirme rien.** Une pièce lue reste à valider par une personne,
 *    la pièce ouverte à côté.
 *  - **elle ne touche pas à ce qui est déjà lu.** Une seconde lecture
 *    automatique n'écrase pas une correction faite à la main. « piece=<id> »
 *    reprend une pièce précise, et c'est le geste explicite d'une personne.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  if (!extractionAvailable()) return NextResponse.json({ ok: false, error: "lecture automatique indisponible : ANTHROPIC_API_KEY absente" }, { status: 503 });

  const p = req.nextUrl.searchParams;

  // Une pièce nommée : la reprise, demandée par une personne au desk.
  const une = p.get("piece");
  if (une) {
    const lue = await lireUnePiece(une, true);
    if (!lue) return NextResponse.json({ ok: false, error: "pièce introuvable" }, { status: 404 });
    return NextResponse.json({ ok: !lue.erreur, piece: lue.item.id, titre: lue.item.title, secondes: lue.secondes, erreur: lue.erreur });
  }

  const n = Math.max(1, Math.min(Number(p.get("n") ?? 3) || 3, 10));
  const file = await piecesALire(n);
  const faites: { id: string; titre: string; secondes?: number; erreur?: string }[] = [];
  for (const piece of file) {
    // Une pièce qui échoue n'arrête pas le paquet : elle porte son marqueur et
    // son motif, et la suivante passe.
    const lue: Lue | undefined = await lireUnePiece(piece.id).catch((e) => ({ item: piece, erreur: e instanceof Error ? e.message : "erreur inconnue" }));
    if (lue) faites.push({ id: lue.item.id, titre: lue.item.title, secondes: lue.secondes, erreur: lue.erreur });
  }

  // Ce qui reste, pour que l'appelant sache s'il doit rappeler.
  const reste = (await piecesALire(20)).length;
  return NextResponse.json({ ok: true, lues: faites.length, reste, faites });
}
