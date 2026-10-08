import "server-only";
import { repo } from "@/lib/data";
import { isDesk, type Session } from "@/lib/auth/types";
import type { GeneratedDocument } from "@/lib/domain/types";

/**
 * QUI PEUT LIRE CE DOCUMENT : le desk, ou le client à qui il appartient.
 *
 * La règle vivait dans la route qui sert le fichier, et elle y était juste.
 * Elle est désormais lue à deux endroits, la route et la page qui montre le
 * document dans l'app, donc elle vit ici : deux copies d'une règle d'accès,
 * c'est une copie qui finira par se tromper.
 *
 * Le dossier SVT et le bordereau ne sortent jamais côté client : ce sont des
 * pièces internes, adressées au teneur de compte et au Trésor.
 */
export async function peutLireLeDocument(s: Session, doc: GeneratedDocument): Promise<boolean> {
  if (isDesk(s)) return true;
  if (doc.type === "dossier_svt" || doc.type === "bordereau") return false;
  const r = repo();
  if (doc.intentId && (await r.listIntents()).some((i) => i.id === doc.intentId && i.clientId === s.userId)) return true;
  if (doc.clientFileId && (await r.getClientFile(doc.clientFileId))?.userId === s.userId) return true;
  return Boolean(doc.clientId && doc.clientId === s.userId);
}
