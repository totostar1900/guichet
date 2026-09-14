import type { DocumentType, Intent, IntentState, IntentType } from "@/lib/domain/types";

/** Documents that belong to one intent (everything but the grouped bordereau). */
export type IntentDocumentType = Exclude<DocumentType, "bordereau" | "convention" | "dossier_svt">;

export const DOC_LABEL: Record<DocumentType, string> = {
  bulletin: "Bulletin d'ordre de souscription",
  fonds: "Appel de fonds",
  cession: "Ordre de cession",
  bordereau: "Bordereau de soumission SVT",
  allocation: "Avis de résultat et d'allocation",
  non_allocation: "Avis de non-allocation",
  opere: "Avis d'opéré",
  convention: "Convention d'ouverture de compte-titres",
  dossier_svt: "Dossier d'ouverture de compte (SVT / dépositaire)",
};

export const DOC_PREFIX: Record<DocumentType, string> = {
  bulletin: "BUL",
  fonds: "AF",
  cession: "CES",
  bordereau: "SVT",
  allocation: "RES",
  non_allocation: "RES",
  opere: "AO",
  convention: "CONV",
  dossier_svt: "DOS",
};

/** Documents the lifecycle produces when an intent reaches a state. */
export function docsForTransition(type: IntentType, state: IntentState): IntentDocumentType[] {
  if (state === "confirmee") return type === "ferme" ? ["bulletin", "fonds"] : type === "cession" ? ["cession"] : [];
  if (state === "servie") return ["allocation"];
  if (state === "non_servie") return ["non_allocation"];
  if (state === "reglee") return ["opere"];
  return [];
}

/** Documents the desk may (re)generate by hand for an intent in its current state. */
export function docsAvailable(i: Intent): IntentDocumentType[] {
  const firm = i.type === "ferme";
  const ces = i.type === "cession";
  const out: IntentDocumentType[] = [];
  if ((firm || ces) && i.state !== "recue" && i.state !== "annulee") out.push(firm ? "bulletin" : "cession");
  if (firm && i.state !== "recue" && i.state !== "annulee") out.push("fonds");
  if (["servie", "reglee"].includes(i.state)) out.push("allocation");
  if (i.state === "non_servie") out.push("non_allocation");
  if (i.state === "reglee") out.push("opere");
  return out;
}
