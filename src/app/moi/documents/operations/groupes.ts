import type { DocLigne, OpGroupe } from "../Operations";

/** Slug de la page des papiers dont l'opération n'est plus au catalogue. */
export const HORS_OPERATION = "hors-operation";

/**
 * LES PAPIERS RANGÉS PAR OPÉRATION, une seule fois pour le sommaire et pour la page d'une opération.
 * Les opérations se lisent du dernier papier au plus ancien ; les papiers d'une opération, du plus ancien au plus récent (l'ordre où ils sont tombés).
 */
export function groupesDesOperations(docs: DocLigne[], ops: OpGroupe[]) {
  const groupes = ops
    .map((op) => ({ op, rows: docs.filter((d) => d.intentId === op.id).sort((a, b) => a.at.localeCompare(b.at)) }))
    .filter((g) => g.rows.length > 0)
    .sort((a, b) => b.rows[b.rows.length - 1].at.localeCompare(a.rows[a.rows.length - 1].at));
  const orphelins = docs.filter((d) => !d.intentId || !ops.some((o) => o.id === d.intentId)).sort((a, b) => b.at.localeCompare(a.at));
  return { groupes, orphelins };
}
