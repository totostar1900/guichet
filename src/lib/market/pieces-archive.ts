import "server-only";
import { createHash } from "node:crypto";
import { repo } from "@/lib/data";
import { localIso } from "@/lib/format";
import { saveSource } from "@/lib/intake/storage";
import { TAILLE_MAX_PIECE, cleDePiece, typeAdmis, type NouvellePiece, type PieceArchivee } from "./pieces";

/**
 * PRENDRE LA COPIE D'UNE PIÈCE ET LA RANGER (7 novembre 2026).
 *
 * Deux entrées : une adresse https que le SERVEUR va lire (le navigateur du Desk n'a pas à télécharger trente-cinq mégaoctets), ou un fichier déposé à la main quand le
 * site refuse les robots. Les octets sont gardés tels quels, jamais retouchés : leur empreinte SHA-256 dit que la copie est celle qui a été lue.
 * Une pièce déjà conservée, mêmes octets pour la même entité, n'est pas doublée.
 */
export type ResultatArchive = { ok: true; piece: PieceArchivee; deja: boolean } | { ok: false; error: string };

export async function lireAdresse(url: string): Promise<{ octets: Uint8Array; type: string } | { error: string }> {
  if (!/^https:\/\//i.test(url)) return { error: "L'adresse doit commencer par https://" };
  let rep: Response;
  try {
    rep = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; GuichetArchive/1.0)", Accept: "application/pdf,text/html;q=0.8,*/*;q=0.5" }, signal: AbortSignal.timeout(55_000) });
  } catch (e) {
    return { error: `Adresse injoignable depuis le serveur (${e instanceof Error ? e.message : "erreur"}). Déposez le fichier à la main.` };
  }
  if (!rep.ok) return { error: `Le site répond ${rep.status}. Déposez le fichier à la main.` };
  const annonce = Number(rep.headers.get("content-length") ?? 0);
  if (annonce > TAILLE_MAX_PIECE) return { error: "Pièce trop lourde (60 Mo au plus)." };
  const octets = new Uint8Array(await rep.arrayBuffer());
  if (octets.length > TAILLE_MAX_PIECE) return { error: "Pièce trop lourde (60 Mo au plus)." };
  const type = typeAdmis(rep.headers.get("content-type"), octets);
  if (!type) return { error: "Ni un PDF ni une page web : rien n'est gardé." };
  return { octets, type };
}

export async function ranger(args: { entite: string; objet: PieceArchivee["objet"]; titre: string; editeur: string; urlOrigine?: string; octets: Uint8Array; type: string; par: string }): Promise<ResultatArchive> {
  const sha256 = createHash("sha256").update(args.octets).digest("hex");
  const existantes = await repo().listPiecesArchivees(args.entite);
  const deja = existantes.find((p) => p.sha256 === sha256);
  if (deja) return { ok: true, piece: deja, deja: true };
  const jour = localIso(new Date());
  const cle = cleDePiece(args.entite, args.titre, sha256, args.type, jour);
  await saveSource(cle, args.octets, args.type);
  const nouvelle: NouvellePiece = { entite: args.entite, objet: args.objet, titre: args.titre, editeur: args.editeur, urlOrigine: args.urlOrigine, cle, sha256, taille: args.octets.length, typeMime: args.type, archiveLe: new Date().toISOString(), archivePar: args.par };
  const piece = await repo().addPieceArchivee(nouvelle);
  return { ok: true, piece, deja: false };
}
