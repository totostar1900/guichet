import { isDesk } from "@/lib/auth/types";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/**
 * Serves a generated PDF: desk, or the client the document belongs to.
 *
 * POURQUOI CETTE ADRESSE, ET PLUS « /desk/documents/pdf/… ».
 *
 * Le contrôle d'accès ci-dessous a toujours prévu le client : « le desk, ou le
 * client à qui le document appartient ». Mais la route vivait sous « /desk », et
 * depuis que le desk a son propre hôte, le proxy renvoie toute adresse en
 * « /desk/ » vers desk.purposecapital.africa, où le layout du desk refoule un
 * client vers le site client. Un client ne pouvait donc ouvrir AUCUN de ses
 * documents : ni ses relevés, ni ses avis d'opéré, ni sa propre convention. Le
 * code disait oui, l'adresse disait non, et c'est l'adresse qui gagnait.
 *
 * « /api » est servi par les deux hôtes (DESK_HOST_ALLOW), donc le même lien
 * fonctionne des deux côtés sans aucune redirection. La garde reste ici, où
 * elle doit être : c'est elle qui décide, pas le chemin.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Connexion requise", { status: 401 });
  const doc = await repo().getDocument((await ctx.params).id);
  if (!doc) return new NextResponse("Document introuvable", { status: 404 });
  if (!isDesk(s)) {
    if (doc.type === "dossier_svt" || doc.type === "bordereau") return new NextResponse("Accès refusé", { status: 403 });
    let mine = false;
    if (doc.intentId) mine = (await repo().listIntents()).some((i) => i.id === doc.intentId && i.clientId === s.userId);
    if (!mine && doc.clientFileId) mine = (await repo().getClientFile(doc.clientFileId))?.userId === s.userId;
    if (!mine && doc.clientId) mine = doc.clientId === s.userId;
    if (!mine) return new NextResponse("Accès refusé", { status: 403 });
  }
  const bytes = await readSource(doc.fileKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${doc.number}.pdf"`, "cache-control": "private, max-age=300" },
  });
}
