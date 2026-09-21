import type { DocumentType, Intent, IntentState, IntentType } from "@/lib/domain/types";

/** Documents that belong to one intent (everything but the grouped bordereau). */
export type IntentDocumentType = Exclude<DocumentType, "bordereau" | "convention" | "dossier_svt" | "releve" | "attestation" | "mandat" | "coupon" | "reclamation" | "transfert">;

/** Three kinds of documents, each with its own rule for wording changes and its own audience. */
export type DocumentKind = "signe" | "envoye" | "interne";
export const DOC_KIND: Record<DocumentType, DocumentKind> = {
  convention: "signe",
  mandat: "signe",
  bulletin: "signe",
  cession: "signe",
  reclamation: "signe",
  transfert: "signe",
  fonds: "envoye",
  allocation: "envoye",
  non_allocation: "envoye",
  opere: "envoye",
  coupon: "envoye",
  releve: "envoye",
  attestation: "envoye",
  bordereau: "interne",
  dossier_svt: "interne",
};
export const DOC_KIND_LABEL: Record<DocumentKind, string> = { signe: "Signés par le client", envoye: "Envoyés au client", interne: "Transmis aux contreparties" };
export const DOC_KIND_RULE: Record<DocumentKind, string> = { signe: "réglementaire : un responsable approuve chaque changement de texte", envoye: "relu : un autre membre du desk relit chaque changement", interne: "libre : en vigueur dès l'enregistrement ; jamais envoyé au client" };
/** The order of the life of a relationship, for lists. */
export const DOC_ORDER: DocumentType[] = ["convention", "mandat", "bulletin", "cession", "reclamation", "transfert", "fonds", "allocation", "non_allocation", "opere", "coupon", "releve", "attestation", "dossier_svt", "bordereau"];
/** When the lifecycle produces each document. */
export const DOC_WHEN: Record<DocumentType, string> = {
  convention: "à l'ouverture du compte-titres ; le modèle vierge se lit avant l'acceptation",
  mandat: "quand un mandataire est déclaré au dossier ; signé par le client et le mandataire",
  bulletin: "à la confirmation d'une intention (souscription, achat, vente)",
  cession: "à la confirmation d'une cession ou d'un rachat",
  reclamation: "quand le client la dépose (Mon espace) ou que le desk enregistre celle reçue",
  transfert: "à la demande de transfert ou de clôture ; le dossier passe « en clôture » à la signature",
  fonds: "à la confirmation, avec le bulletin ; à exécuter par le client",
  allocation: "quand la ligne est servie",
  non_allocation: "quand la ligne n'est pas servie ; les fonds sont restitués",
  opere: "au règlement",
  coupon: "quand un flux de l'échéancier est payé (Aujourd'hui, ou depuis le dossier)",
  releve: "à la demande du client ou du desk",
  attestation: "à la demande du client",
  dossier_svt: "à l'approbation du dossier client",
  bordereau: "à la transmission d'une adjudication ou d'un lot OPCVM",
};

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
  releve: "Relevé de position",
  attestation: "Attestation de détention",
  mandat: "Mandat de gestion des ordres",
  coupon: "Avis de coupon · de remboursement",
  reclamation: "Réclamation",
  transfert: "Ordre de transfert · de clôture",
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
  releve: "REL",
  attestation: "ATT",
  mandat: "MAN",
  coupon: "AC",
  reclamation: "REC",
  transfert: "TRF",
};

/** Documents the lifecycle produces when an intent reaches a state. */
export function docsForTransition(type: IntentType, state: IntentState): IntentDocumentType[] {
  if (state === "confirmee") return type === "ferme" || type === "achat" || type === "souscription" ? ["bulletin", "fonds"] : type === "cession" || type === "rachat" ? ["cession"] : type === "vente" ? ["bulletin"] : [];
  if (state === "servie") return ["allocation"];
  if (state === "non_servie") return ["non_allocation"];
  if (state === "reglee") return ["opere"];
  return [];
}

/** Documents the desk may (re)generate by hand for an intent in its current state. */
export function docsAvailable(i: Intent): IntentDocumentType[] {
  const firm = i.type === "ferme" || i.type === "achat" || i.type === "vente" || i.type === "souscription";
  const ces = i.type === "cession" || i.type === "rachat";
  const out: IntentDocumentType[] = [];
  if ((firm || ces) && i.state !== "recue" && i.state !== "annulee") out.push(firm ? "bulletin" : "cession");
  if ((i.type === "ferme" || i.type === "achat" || i.type === "souscription") && i.state !== "recue" && i.state !== "annulee") out.push("fonds");
  if (["servie", "reglee"].includes(i.state)) out.push("allocation");
  if (i.state === "non_servie") out.push("non_allocation");
  if (i.state === "reglee") out.push("opere");
  return out;
}
