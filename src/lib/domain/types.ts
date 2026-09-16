/**
 * Domain model of the Guichet.
 * Mirrors the SQL schema in supabase/migrations — keep both in sync.
 */

export type OfferKind = "OTA" | "BTA" | "ACTIONS" | "APE" | "RACHAT" | "MARCHE" | "FONDS";

export type OfferOperation =
  | "nouvelle_ligne"
  | "abondement"
  | "rachat"
  | "ipo"
  | "emprunt_ape"
  | "secondaire"
  | "opcvm";

export type Country = "RCA" | "Congo" | "Cameroun" | "Gabon" | "Tchad" | "Guinée éq.";

/** Lifecycle as stored; `closing` and `results` are derived at read time. */
export type OfferStatus =
  | "draft" // extracted, not yet validated by the desk
  | "published" // visible; open/upcoming/closed derived from dates
  | "results" // auction results known
  | "live" // settled, coupons ahead
  | "matured"
  | "withdrawn";

/** Derived status shown to clients. */
export type DisplayStatus =
  | "quoted"
  | "on_request" // fund read from the bulletin, not (yet) distributed by us
  | "upcoming"
  | "open"
  | "closing"
  | "closed"
  | "results"
  | "live"
  | "matured";

/** An OPCVM as we distribute it: what the bulletin says, plus the terms of our agreement with the manager. */
export interface FundTerms {
  key: string; // fund_navs.fund_key
  manager: string;
  depositary: string;
  category: "M" | "O" | "D" | "A" | "?";
  frequency: "quotidienne" | "hebdomadaire" | "mensuelle" | "trimestrielle" | "?";
  nav: number; // FCFA per unit
  navDate: string; // YYYY-MM-DD
  navOrigin: number;
  inceptionDate: string;
  perfSinceInceptionPct: number;
  variationPct?: number;
  /** NAV change over the last 12 months, from the stored history (needs ≥ 11 months of NAVs). */
  perf1yPct?: number;
  perf1yFrom?: string;
  /** Distribution agreement with the manager: without it the fund is information only. */
  distributed: boolean;
  agreementRef?: string;
  entryFeePct: number; // droits d'entrée, kept by the fund / manager (our retrocession is inside)
  exitFeePct: number;
  minAmount: number; // FCFA, first subscription
  cutoff?: string; // "mardi 12 h pour la VL du jeudi"
  settlementDays?: number; // units delivered / cash paid J+n after the NAV
  registerNote?: string; // "compte-titres tenu par le dépositaire au nom du client"
}

export interface OfferDocument {
  name: string;
  meta: string; // "PDF · 2 p."
  url?: string;
}

export interface Offer {
  id: string;
  kind: OfferKind;
  /** Product type configured by the desk (registry key); the built-in family of kind when absent. */
  typeKey?: string;
  /** Free facts declared by the product type (e.g. "Garantie", "Notation"). */
  extra?: Record<string, string>;
  operation: OfferOperation;
  country: Country;
  countryName: string;
  issuer: string;
  title: string;
  isin: string;
  status: OfferStatus;
  isExample?: boolean;
  blurb: string;
  documents: OfferDocument[];

  // dates (ISO)
  opensAt: string;
  deadlineAt: string;
  resultsAt?: string;
  settleOn: string; // YYYY-MM-DD
  maturityOn?: string; // YYYY-MM-DD
  lastCouponOn?: string | null; // null = new line, no accrued interest

  // economics
  nominal: number; // FCFA per title
  couponRate?: number; // % p.a. — OTA / APE
  precountRate?: number; // % — BTA (taux précompté)
  pricePct?: number; // desk price, % of nominal
  priceNote?: string; // "indicatif" etc.
  rateNote?: string;
  servedPricePct?: number; // after results
  commissionPct: number;
  minTitles?: number;
  sizeLabel?: string; // "7,5 à 10 Mds FCFA"

  // equities
  pricePerShare?: number;
  minShares?: number;
  sharesOffered?: number;
  dividendPerShare?: number;
  lastPrice?: number;
  lastPriceOn?: string;

  // secondary market (kind MARCHE)
  market?: "BVMAC" | "Trésor secondaire";
  instrument?: "action" | "obligation";
  bid?: number; // FCFA per share, or % of nominal for bonds
  ask?: number;
  lotSize?: number; // minimum quantity
  settlementDays?: number; // T+n
  priceSource?: "boc" | "desk"; // where lastPrice comes from: the ingested bulletin, or a desk fallback entry
  hidden?: boolean; // ingested line the desk chose not to show in the Guichet

  // OPCVM (kind FONDS) — NAV from the bulletin, terms from the distribution agreement
  fund?: FundTerms;

  // publication
  version: number;
  pricedAt?: string; // ISO — when the desk published the current price
  resultLine?: string; // "Servie à 96,500 % · …"
}

export type IntentType = "appetit" | "ferme" | "info" | "rappel" | "cession" | "achat" | "vente" | "souscription" | "rachat";
export type IntentState = "recue" | "confirmee" | "transmise" | "servie" | "non_servie" | "reglee" | "annulee";
export type Channel = "WhatsApp" | "Appel" | "E-mail";

export interface Intent {
  id: string;
  ref: string; // PF-0914-011
  offerId: string;
  offerVersion: number;
  clientName: string;
  clientSegment: string;
  clientId?: string;
  type: IntentType;
  amount?: number | null; // FCFA, or titles for cession
  channel: Channel;
  /** Where the client asked to be reached for this intent (kept with the order: profiles change). */
  contactPhone?: string;
  contactEmail?: string;
  message?: string;
  state: IntentState;
  /** Results: share of the order served (0..100) and the units actually allocated. */
  allocationPct?: number;
  servedUnits?: number;
  /** Secondary market: client's limit (FCFA per share, or % of nominal) and the executed price. */
  limitPrice?: number | null;
  executedPrice?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventLog {
  id: string;
  at: string;
  kind: "intent" | "desk" | "system" | "document";
  html: string; // pre-rendered short description (trusted, generated server-side)
  intentId?: string;
  offerId?: string;
}

export interface NewIntentInput {
  offerId: string;
  type: IntentType;
  amount?: number | null;
  limitPrice?: number | null;
  channel: Channel;
  contactPhone?: string;
  contactEmail?: string;
  message?: string;
  clientName: string;
  clientSegment: string;
  clientId?: string;
}

/* ---------------- Intake (À valider) ---------------- */

export type IntakeSource = "mail" | "pdf" | "photo" | "texte";
export type IntakeState = "a_valider" | "en_revue" | "publie" | "bloque" | "rejete";
export type Confidence = "sure" | "check" | "missing";

/** Structured fields read from a communiqué, before the desk prices it. */
export interface OfferDraft {
  kind?: OfferKind;
  operation?: OfferOperation;
  country?: Country;
  countryName?: string;
  issuer?: string;
  title?: string;
  isin?: string;
  sourceRef?: string; // n° du communiqué
  nominal?: number;
  couponRate?: number;
  precountRate?: number;
  maturityOn?: string;
  lastCouponOn?: string | null;
  opensAt?: string;
  deadlineAt?: string;
  resultsAt?: string;
  settleOn?: string;
  sizeLabel?: string;
  pricePerShare?: number;
  minShares?: number;
  sharesOffered?: number;
  dividendPerShare?: number;
  blurb?: string;
  /** Product type from the registry (drives kind, checklist, cautions, free fields). */
  typeKey?: string;
  /** Free fields declared by the product type, as typed by the desk. */
  extra?: Record<string, string>;
  /** Per-field confidence from the extractor; missing = not found. */
  confidence: Partial<Record<keyof Omit<OfferDraft, "confidence" | "official" | "remarks">, Confidence>>;
  /** True when the source is an official communiqué (not a photo/forward). */
  official: boolean;
  remarks: string[];
}

export interface IntakeItem {
  id: string;
  source: IntakeSource;
  title: string;
  fromLabel: string; // "dobm@tresor-congo.cg · ven. 11 sept. 16:20"
  receivedAt: string;
  state: IntakeState;
  fileName?: string;
  mimeType?: string;
  rawText?: string; // pasted e-mail / extracted text, for the preview
  draft: OfferDraft;
  offerId?: string; // set once published (or when the source updates an existing offer)
  publishedAt?: string;
  extractedIn?: number; // seconds
  notes?: string;
}

/* ---------------- Documents ---------------- */

export type DocumentType = "bulletin" | "fonds" | "cession" | "bordereau" | "allocation" | "non_allocation" | "opere" | "convention" | "dossier_svt" | "releve" | "attestation";
export type DocumentStatus = "genere" | "envoye" | "signe";

export interface GeneratedDocument {
  id: string;
  type: DocumentType;
  number: string; // PC-BUL-2026-0018
  title: string; // shown in lists
  intentId?: string;
  offerId?: string;
  clientName?: string;
  /** For a bordereau: the deadline that groups the auction's lines. */
  auctionKey?: string;
  /** For KYC documents: the client file. */
  clientFileId?: string;
  /** For statements: the client (user id). */
  clientId?: string;
  fileKey: string; // storage key of the PDF
  status: DocumentStatus;
  sentVia?: string[];
  sentAt?: string;
  signedAt?: string;
  createdAt: string;
  createdBy?: string;
}

/* ---------------- Contacts & notifications ---------------- */

/** Who we can reach — until onboarding lands, a light contact record. */
export interface Contact {
  id: string; // = client userId when known
  name: string;
  segment: string;
  phone?: string; // E.164, e.g. +237687676767
  email?: string;
  whatsappOptIn: boolean;
}

/** One line of the audit trail: who did what to which record, before/after, why, from where. Hash-chained, never edited. */
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  actorId?: string;
  action: string; // "offer.publish", "offer.quote", "intent.transition", "reference.upsert", "staff.role", "approval.decide"…
  entity: string; // "offer" | "intent" | "reference" | "profile" | "approval"
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip?: string;
  userAgent?: string;
  prevHash?: string;
  hash: string;
}
export type NewAuditEntry = Omit<AuditEntry, "id" | "at" | "hash" | "prevHash">;

/** A published version of an offer, kept in full for diffs and rollback. */
export interface OfferVersion {
  offerId: string;
  version: number;
  publishedAt: string;
  publishedBy?: string;
  note?: string;
  snapshot?: Offer;
}

/** Thrown when a record changed between the screen and the save (optimistic locking). */
export class ConflictError extends Error {
  constructor(public entity: string, public id: string, public expected: number, public actual: number) {
    super(`Modifié entre-temps (version ${actual}, vous aviez la ${expected}) : rechargez la page avant d'enregistrer.`);
    this.name = "ConflictError";
  }
}

/** A change an opérateur proposed outside the delegated window, waiting for a responsable. */
export interface Approval {
  id: string;
  kind: "offer_publish" | "offer_quote";
  entityId: string;
  title: string;
  payload: Offer;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decision?: "approuve" | "refuse";
  note?: string;
}

/** Desk team member as the responsable manages them (desk › Équipe). */
export type StaffRole = "desk" | "responsable";
export interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: StaffRole;
  mfaEnrolledAt?: string;
  roleSetBy?: string;
  roleSetAt?: string;
}

export type NotifyChannel = "whatsapp" | "email";
export type NotifyStatus = "queued" | "sent" | "failed" | "skipped";
export type NotifyKind = "offer_published" | "intent_received" | "intent_update" | "document" | "results" | "watch" | "digest";

/** A line a client follows; the snapshot is what they were last told. */
export interface Watch {
  id: string;
  userId: string;
  offerId: string;
  lastHero?: string;
  lastStatus?: string;
  alertedAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  kind: NotifyKind;
  channel: NotifyChannel;
  to: string; // phone or email
  contactName?: string;
  subject?: string; // email subject / template name
  body: string; // text as sent (or would be sent)
  documentId?: string;
  intentId?: string;
  offerId?: string;
  status: NotifyStatus;
  providerId?: string;
  error?: string;
  createdAt: string;
  sentAt?: string;
}

/** A desk-editable reference record (product type, bond schedule, company, issuer, glossary term). */
export interface ReferenceRow<T = unknown> {
  kind: string;
  key: string;
  data: T;
  updatedAt: string;
  updatedBy?: string;
}
