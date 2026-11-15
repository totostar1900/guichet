import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { repo } from "@/lib/data";
import { readSource } from "@/lib/intake/storage";

/**
 * LA COPIE SIGNÉE À LA MAIN D'UN MANDAT, LUE PAR LE DESK (15 novembre 2026).
 *
 * Le desk la garde au dossier du client : c'est lui seul qui la lit ici, avec les contrôles de la page « Mandats à vérifier ». Le client, lui, envoie sa copie et n'a pas
 * à la relire par cette adresse. « /api » est servi par les deux hôtes : le lien fonctionne depuis le desk sans redirection, et la garde reste ici.
 *
 * Servie sans aucun script (bac à sable) et jamais mise en cache : c'est un papier personnel, avec un RIB.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new NextResponse("Connexion requise", { status: 401 });
  if (!isDesk(s)) return new NextResponse("Accès refusé", { status: 403 });
  const { id } = await params;
  const m = (await repo().listMandats()).find((x) => x.id === id);
  if (!m?.copieKey || !m.copieType) return new NextResponse("Copie introuvable", { status: 404 });
  let octets: Uint8Array;
  try {
    octets = await readSource(m.copieKey);
  } catch {
    return new NextResponse("La copie n'a pas pu être relue", { status: 404 });
  }
  return new NextResponse(new Uint8Array(octets), {
    headers: {
      "content-type": m.copieType,
      "content-disposition": `inline; filename="copie-mandat-${m.ref}.${m.copieType === "application/pdf" ? "pdf" : m.copieType === "image/png" ? "png" : "jpg"}"`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      "cache-control": "no-store",
    },
  });
}
