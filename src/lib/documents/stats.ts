import "server-only";
import { repo } from "@/lib/data";
import type { DocumentType } from "@/lib/domain/types";
import type { DocStats } from "@/components/docs/DocMap";

/** Documents issued per model and template versions waiting: the figures the map carries on the Dépôt and the documentation. */
export async function docStats(): Promise<DocStats> {
  const r = repo();
  const [docs, texts] = await Promise.all([r.listDocuments().catch(() => []), r.listTemplateTexts().catch(() => [])]);
  const issued: Partial<Record<DocumentType, number>> = {};
  for (const d of docs) issued[d.type] = (issued[d.type] ?? 0) + 1;
  const pending: Partial<Record<DocumentType, number>> = {};
  for (const x of texts) if (x.status === "pending") pending[x.docType] = (pending[x.docType] ?? 0) + 1;
  return { issued, pending };
}
