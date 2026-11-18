import { repo } from "@/lib/data";
import { REF_STATUT, type StatutLigne, type StatutMessage, type StatutRow } from "@/lib/domain/statuts";

/** Toutes les lignes de la table « statut » qui sont bien des statuts (une ligne d'un autre genre est ignorée). */
export async function listerStatuts(): Promise<StatutRow[]> {
  const rows = await repo().listReference(REF_STATUT).catch(() => []);
  return rows
    .map((r) => r.data as StatutRow | null)
    .filter((s): s is StatutLigne | StatutMessage => Boolean(s && typeof s.id === "string" && (s.kind === "ligne" ? typeof (s as StatutLigne).offerId === "string" : s.kind === "message" && typeof (s as StatutMessage).texte === "string")));
}
