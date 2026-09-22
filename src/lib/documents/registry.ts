import type { DocumentType, Intent, IntentState, IntentType } from "@/lib/domain/types";

/** Documents that belong to one intent (everything but the grouped bordereau). */
export type IntentDocumentType = Exclude<DocumentType, "bordereau" | "convention" | "dossier_svt" | "releve" | "attestation" | "mandat" | "coupon" | "reclamation" | "transfert" | "note_indice">;

/** Three kinds of documents, each with its own rule for wording changes and its own audience. */
export type DocumentKind = "signe" | "envoye" | "interne";
export const DOC_KIND: Record<DocumentType, DocumentKind> = {
  convention: "signe",
  mandat: "signe",
  bulletin: "signe",
  cession: "signe",
  reclamation: "signe",
  transfert: "signe",
  note_indice: "envoye",
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
export const DOC_ORDER: DocumentType[] = ["convention", "mandat", "bulletin", "cession", "reclamation", "transfert", "fonds", "allocation", "non_allocation", "opere", "coupon", "releve", "attestation", "note_indice", "dossier_svt", "bordereau"];
/** When the lifecycle produces each document. */
export const DOC_WHEN: Record<DocumentType, string> = {
  convention: "à l'ouverture du compte-titres ; le modèle vierge se lit avant l'acceptation",
  mandat: "quand un mandataire est déclaré au dossier ; signé par le client et le mandataire",
  bulletin: "à la confirmation d'une intention (souscription, achat, vente)",
  cession: "à la confirmation d'une cession ou d'un rachat",
  reclamation: "quand le client la dépose (Mon espace) ou que le desk enregistre celle reçue",
  transfert: "à la demande de transfert ou de clôture ; le dossier passe « en clôture » à la signature",
  note_indice: "au premier bulletin de chaque mois, sur le mois écoulé",
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
  note_indice: "Note mensuelle sur l'indice",
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
  note_indice: "IDX",
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

/* ---------- who does what with each document : one table, every page reads it ---------- */

export type DocMoment = "ouverture" | "ordre" | "execution" | "reglement" | "vie" | "fin";
export const MOMENT_LABEL: Record<DocMoment, string> = { ouverture: "Ouverture", ordre: "Ordre", execution: "Exécution", reglement: "Règlement", vie: "Vie du titre", fin: "Fin" };
export const MOMENTS: DocMoment[] = ["ouverture", "ordre", "execution", "reglement", "vie", "fin"];
/** One line under each moment on the map: what opens it. */
export const MOMENT_HINT: Record<DocMoment, string> = { ouverture: "dossier accepté", ordre: "intention confirmée", execution: "résultats, valeur liquidative", reglement: "livraison, virement", vie: "coupons, relevés", fin: "transfert, clôture" };

export interface DocRole {
  moment: DocMoment;
  prepares: string;
  signs: string;
  receives: string;
  /** Where a desk member finds the issued copies. */
  find: { href: string; label: string };
  /** The screen that produces it. */
  born: { href: string; label: string };
  /** The clock that runs on it, when there is one. */
  clock?: string;
  /** New since the acts of September 2026. */
}

const DOCS_PAGE = (type: DocumentType) => ({ href: `/desk/documents?type=${type}`, label: "Documents, filtrés sur ce modèle" });

export const DOC_ROLES: Record<DocumentType, DocRole> = {
  convention: { moment: "ouverture", prepares: "Purpose, depuis le dossier", signs: "le client (code à usage unique, ou papier) et Purpose", receives: "le client (copie dans Mes documents)", find: DOCS_PAGE("convention"), born: { href: "/desk/clients", label: "Dossiers › approbation du dossier" } },
  mandat: { moment: "ouverture", prepares: "le desk, depuis le dossier", signs: "le client (mandant) et le mandataire", receives: "le client, le mandataire, le dossier", find: DOCS_PAGE("mandat"), born: { href: "/desk/clients", label: "Dossiers › Actes et avis › Établir un mandat" } },
  bulletin: { moment: "ordre", prepares: "Purpose, depuis l'intention", signs: "le client : « lu et approuvé »", receives: "le desk (signé), le client (copie)", find: DOCS_PAGE("bulletin"), born: { href: "/desk", label: "Carnet › confirmer l'intention" } },
  cession: { moment: "ordre", prepares: "Purpose, depuis l'intention", signs: "le client (cédant), avec l'attestation du cédant", receives: "le desk (signé), le client (copie)", find: DOCS_PAGE("cession"), born: { href: "/desk", label: "Carnet › confirmer l'intention" } },
  reclamation: { moment: "vie", prepares: "le Guichet, sur les mots du client (ou le desk pour une réclamation reçue)", signs: "le client, par code sur son canal prouvé", receives: "le desk (Messages), le client (copie)", find: DOCS_PAGE("reclamation"), born: { href: "/moi/reclamation", label: "Mon espace › Déposer une réclamation ; Dossiers › Actes et avis" }, clock: "accusé de réception sous 2 jours ouvrés, réponse sous 30 jours" },
  transfert: { moment: "fin", prepares: "le desk, depuis le dossier et les positions", signs: "le client", receives: "le dépositaire, le client (copie)", find: DOCS_PAGE("transfert"), born: { href: "/desk/clients", label: "Dossiers › Actes et avis › Transférer ou clôturer" }, clock: "dossier « en clôture » à la signature, « clos » à la confirmation du dépositaire" },
  fonds: { moment: "ordre", prepares: "Purpose, avec le bulletin", signs: "personne : une instruction à exécuter", receives: "le client, qui vire avant la date limite", find: DOCS_PAGE("fonds"), born: { href: "/desk", label: "Carnet › confirmer l'intention" }, clock: "virement avant la clôture de la fenêtre" },
  allocation: { moment: "execution", prepares: "Purpose, depuis le résultat saisi", signs: "personne", receives: "le client", find: DOCS_PAGE("allocation"), born: { href: "/desk/resultats", label: "Résultats › saisir l'adjudication" } },
  non_allocation: { moment: "execution", prepares: "Purpose, depuis le résultat saisi", signs: "personne", receives: "le client (fonds restitués)", find: DOCS_PAGE("non_allocation"), born: { href: "/desk/resultats", label: "Résultats › saisir l'adjudication" }, clock: "fonds restitués sous deux jours ouvrés" },
  opere: { moment: "reglement", prepares: "Purpose, au règlement", signs: "personne", receives: "le client", find: DOCS_PAGE("opere"), born: { href: "/desk/marche", label: "Cotes & VL › régler l'ordre" } },
  coupon: { moment: "vie", prepares: "Purpose, depuis l'échéancier", signs: "personne", receives: "le client, par son canal prouvé (sinon gardé au dossier)", find: DOCS_PAGE("coupon"), born: { href: "/desk", label: "Aujourd'hui › Coupons à aviser ; Dossiers › Actes et avis" } },
  releve: { moment: "vie", prepares: "Purpose, depuis les positions", signs: "personne", receives: "le client", find: DOCS_PAGE("releve"), born: { href: "/moi", label: "Mon espace › Relevé de position ; le desk depuis le dossier" } },
  attestation: { moment: "vie", prepares: "Purpose, depuis les positions", signs: "Purpose (signature et cachet)", receives: "le client, pour un tiers", find: DOCS_PAGE("attestation"), born: { href: "/moi", label: "Mon espace › Attestation de détention" } },
  dossier_svt: { moment: "ouverture", prepares: "le desk, depuis le dossier KYC", signs: "Purpose", receives: "le SVT ou le dépositaire", find: DOCS_PAGE("dossier_svt"), born: { href: "/desk/clients", label: "Dossiers › approbation du dossier" } },
  note_indice: { moment: "vie", prepares: "le Guichet, depuis les bulletins lus", signs: "personne : c'est une note d'information", receives: "les clients et le desk", find: DOCS_PAGE("note_indice"), born: { href: "/desk/indice", label: "Desk › Note sur l'indice" }, clock: "publiée au premier bulletin du mois" },
  bordereau: { moment: "execution", prepares: "le desk", signs: "Purpose", receives: "le SVT (adjudication) ou la société de gestion (OPCVM)", find: DOCS_PAGE("bordereau"), born: { href: "/desk/resultats", label: "Résultats › bordereau de l'adjudication ; Cotes & VL › bordereau OPCVM" } },
};
