/**
 * Domain model of the Guichet.
 * Mirrors the SQL schema in supabase/migrations — keep both in sync.
 */

export type OfferKind = "OTA" | "BTA" | "ACTIONS" | "APE" | "RACHAT";

export type OfferOperation =
  | "nouvelle_ligne"
  | "abondement"
  | "rachat"
  | "ipo"
  | "emprunt_ape";

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
  | "upcoming"
  | "open"
  | "closing"
  | "closed"
  | "results"
  | "live"
  | "matured";

export interface OfferDocument {
  name: string;
  meta: string; // "PDF · 2 p."
  url?: string;
}

export interface Offer {
  id: string;
  kind: OfferKind;
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

  // publication
  version: number;
  pricedAt?: string; // ISO — when the desk published the current price
  resultLine?: string; // "Servie à 96,500 % · …"
}

export type IntentType = "appetit" | "ferme" | "info" | "rappel" | "cession";
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
  message?: string;
  state: IntentState;
  /** Results: share of the order served (0..100) and the units actually allocated. */
  allocationPct?: number;
  servedUnits?: number;
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
  channel: Channel;
  message?: string;
  clientName: string;
  clientSegment: string;
  clientId?: string;
}

/* ---------------- Intake (À valider) ---------------- */

export type IntakeSource = "mail" | "pdf" | "photo" | "texte";
export type IntakeState = "a_valider" | "publie" | "bloque" | "rejete";
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

export type NotifyChannel = "whatsapp" | "email";
export type NotifyStatus = "queued" | "sent" | "failed" | "skipped";
export type NotifyKind = "offer_published" | "intent_received" | "intent_update" | "document" | "results";

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
