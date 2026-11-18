import { repo } from "@/lib/data";
import { REF_STATUT, REF_STATUT_MESSAGE, type MessageDeStatut, type StatutLigne, type StatutRow } from "@/lib/domain/statuts";

/** Toutes les lignes de la table « statut » qui sont bien des lignes de statut (une ligne d'un autre genre est ignorée). */
export async function listerStatuts(): Promise<StatutRow[]> {
  const rows = await repo().listReference(REF_STATUT).catch(() => []);
  return rows
    .map((r) => r.data as StatutRow | null)
    .filter((s): s is StatutLigne => Boolean(s && s.kind === "ligne" && typeof s.id === "string" && typeof s.offerId === "string"));
}

/** Les messages de la table « statut-message », retirés compris ; vide tant que le desk n'a rien importé. */
export async function listerMessages(): Promise<MessageDeStatut[]> {
  const rows = await repo().listReference(REF_STATUT_MESSAGE).catch(() => []);
  return rows
    .map((r) => r.data as MessageDeStatut | null)
    .filter((m): m is MessageDeStatut => Boolean(m && typeof m.id === "string" && typeof m.texte === "string" && (m.langue === "fr" || m.langue === "en")));
}
