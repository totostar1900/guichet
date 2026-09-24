import type { FinancialProfile } from "@/data/profile";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { ConflictError, type Approval, type AuditEntry, type ChannelCode, type ClientPrefs, type Contact, type DocumentType, type TemplateText, type TemplateTextStatus, type DeviceKind, type EventLog, type GeneratedDocument, type IntakeItem, type Intent, type IntentState, type Notification, type Offer, type ProofChannel, type ReferenceDraft, type ReferenceRow, type StaffMember, type TrustedDevice, type Watch, type InboundMessage } from "@/lib/domain/types";
import type { CashEntry } from "@/lib/domain/cash";
import type { ClientFile } from "@/lib/domain/kyc";
import type { FundNav, IssuerDocument, MarketBulletin, Quote, QuoteActivity } from "@/lib/domain/market";
import type { NewsItem } from "@/lib/news/model";
import { receivedLabel } from "@/lib/domain/intent";
import { fmt } from "@/lib/format";
import { makeOrderNo, makeRef, type Repository } from "./repository";

/**
 * Supabase-backed repository. Server-side only (uses the service role key when
 * present so desk actions work before auth is wired; never import in client code).
 * Column names mirror supabase/migrations/0001_init.sql.
 */

type OfferRow = {
  id: string;
  kind: Offer["kind"];
  operation: Offer["operation"];
  country: Offer["country"];
  country_name: string;
  issuer: string;
  title: string;
  isin: string;
  status: Offer["status"];
  is_example: boolean;
  blurb: string;
  documents: Offer["documents"];
  opens_at: string;
  deadline_at: string;
  results_at: string | null;
  settle_on: string;
  maturity_on: string | null;
  last_coupon_on: string | null;
  nominal: number;
  coupon_rate: number | null;
  precount_rate: number | null;
  price_pct: number | null;
  price_note: string | null;
  rate_note: string | null;
  served_price_pct: number | null;
  commission_pct: number;
  min_titles: number | null;
  size_label: string | null;
  price_per_share: number | null;
  min_shares: number | null;
  shares_offered: number | null;
  dividend_per_share: number | null;
  last_price: number | null;
  last_price_on: string | null;
  last_traded_on: string | null;
  market: Offer["market"] | null;
  instrument: Offer["instrument"] | null;
  bid: number | null;
  ask: number | null;
  lot_size: number | null;
  settlement_days: number | null;
  price_source: Offer["priceSource"] | null;
  hidden: boolean;
  fund: Offer["fund"] | null;
  type_key: string | null;
  extra: Record<string, string> | null;
  featured: Offer["featured"] | null;
  version: number;
  priced_at: string | null;
  result_line: string | null;
};

type IntentRow = {
  id: string;
  ref: string;
  register_no: string | null;
  closed_reason: string | null;
  counter: unknown;
  offer_id: string;
  offer_version: number;
  client_id: string | null;
  client_name: string;
  client_segment: string;
  type: Intent["type"];
  amount: number | null;
  channel: Intent["channel"];
  contact_phone: string | null;
  contact_email: string | null;
  message: string | null;
  state: IntentState;
  allocation_pct: number | null;
  served_units: number | null;
  limit_price: number | null;
  executed_price: number | null;
  phone_verified?: boolean | null;
  profile_flag?: string | null;
  email_verified?: boolean | null;
  created_at: string;
  updated_at: string;
};

type EventRow = { id: string; at: string; kind: EventLog["kind"]; html: string; intent_id: string | null; offer_id: string | null };

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

function toOffer(r: OfferRow): Offer {
  return {
    id: r.id,
    kind: r.kind,
    operation: r.operation,
    country: r.country,
    countryName: r.country_name,
    issuer: r.issuer,
    title: r.title,
    isin: r.isin,
    status: r.status,
    isExample: r.is_example || undefined,
    blurb: r.blurb,
    documents: r.documents ?? [],
    opensAt: r.opens_at,
    deadlineAt: r.deadline_at,
    resultsAt: u(r.results_at),
    settleOn: r.settle_on,
    maturityOn: u(r.maturity_on),
    lastCouponOn: r.last_coupon_on,
    nominal: Number(r.nominal),
    couponRate: u(r.coupon_rate) && Number(r.coupon_rate),
    precountRate: u(r.precount_rate) && Number(r.precount_rate),
    pricePct: u(r.price_pct) && Number(r.price_pct),
    priceNote: u(r.price_note),
    rateNote: u(r.rate_note),
    servedPricePct: u(r.served_price_pct) && Number(r.served_price_pct),
    commissionPct: Number(r.commission_pct),
    minTitles: u(r.min_titles),
    sizeLabel: u(r.size_label),
    pricePerShare: u(r.price_per_share) && Number(r.price_per_share),
    minShares: u(r.min_shares),
    sharesOffered: u(r.shares_offered),
    dividendPerShare: u(r.dividend_per_share) && Number(r.dividend_per_share),
    lastPrice: u(r.last_price) && Number(r.last_price),
    lastPriceOn: u(r.last_price_on),
    lastTradedOn: u(r.last_traded_on),
    market: u(r.market),
    instrument: u(r.instrument),
    bid: u(r.bid) && Number(r.bid),
    ask: u(r.ask) && Number(r.ask),
    lotSize: u(r.lot_size),
    settlementDays: u(r.settlement_days),
    priceSource: u(r.price_source),
    hidden: r.hidden || undefined,
    fund: u(r.fund),
    typeKey: u(r.type_key),
    extra: u(r.extra),
    featured: u(r.featured),
    version: r.version,
    pricedAt: u(r.priced_at),
    resultLine: u(r.result_line),
  };
}

function toIntent(r: IntentRow): Intent {
  return {
    id: r.id,
    ref: r.ref,
    registerNo: u(r.register_no),
    offerId: r.offer_id,
    offerVersion: r.offer_version,
    clientId: u(r.client_id),
    clientName: r.client_name,
    clientSegment: r.client_segment,
    type: r.type,
    amount: r.amount === null ? null : Number(r.amount),
    channel: r.channel,
    contactPhone: u(r.contact_phone),
    contactEmail: u(r.contact_email),
    message: u(r.message),
    state: r.state,
    phoneVerified: r.phone_verified ?? undefined,
    profileFlag: u(r.profile_flag),
    emailVerified: r.email_verified ?? undefined,
    allocationPct: r.allocation_pct === null ? undefined : Number(r.allocation_pct),
    servedUnits: r.served_units === null ? undefined : Number(r.served_units),
    limitPrice: r.limit_price === null ? null : Number(r.limit_price),
    executedPrice: r.executed_price === null ? null : Number(r.executed_price),
    closedReason: u(r.closed_reason),
    counter: (r.counter as Intent["counter"]) ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

type IntakeRow = {
  id: string; source: IntakeItem["source"]; title: string; from_label: string; received_at: string; state: IntakeItem["state"];
  file_name: string | null; mime_type: string | null; raw_text: string | null; draft: IntakeItem["draft"]; offer_id: string | null;
  published_at: string | null; extracted_in: number | null; notes: string | null;
};
const toIntake = (r: IntakeRow): IntakeItem => ({
  id: r.id, source: r.source, title: r.title, fromLabel: r.from_label, receivedAt: r.received_at, state: r.state,
  fileName: u(r.file_name), mimeType: u(r.mime_type), rawText: u(r.raw_text), draft: r.draft, offerId: u(r.offer_id),
  publishedAt: u(r.published_at), extractedIn: u(r.extracted_in), notes: u(r.notes),
});
const fromIntake = (p: Partial<IntakeItem>): Partial<IntakeRow> => {
  const row: Partial<IntakeRow> = {};
  if (p.source !== undefined) row.source = p.source;
  if (p.title !== undefined) row.title = p.title;
  if (p.fromLabel !== undefined) row.from_label = p.fromLabel;
  if (p.receivedAt !== undefined) row.received_at = p.receivedAt;
  if (p.state !== undefined) row.state = p.state;
  if (p.fileName !== undefined) row.file_name = p.fileName;
  if (p.mimeType !== undefined) row.mime_type = p.mimeType;
  if (p.rawText !== undefined) row.raw_text = p.rawText;
  if (p.draft !== undefined) row.draft = p.draft;
  if (p.offerId !== undefined) row.offer_id = p.offerId;
  if (p.publishedAt !== undefined) row.published_at = p.publishedAt;
  if (p.extractedIn !== undefined) row.extracted_in = p.extractedIn;
  if (p.notes !== undefined) row.notes = p.notes;
  return row;
};
function fromOffer(o: Offer): OfferRow {
  return {
    id: o.id, kind: o.kind, operation: o.operation, country: o.country, country_name: o.countryName, issuer: o.issuer, title: o.title, isin: o.isin,
    status: o.status, is_example: Boolean(o.isExample), blurb: o.blurb, documents: o.documents, opens_at: o.opensAt, deadline_at: o.deadlineAt,
    results_at: o.resultsAt ?? null, settle_on: o.settleOn, maturity_on: o.maturityOn ?? null, last_coupon_on: o.lastCouponOn ?? null,
    nominal: o.nominal, coupon_rate: o.couponRate ?? null, precount_rate: o.precountRate ?? null, price_pct: o.pricePct ?? null,
    price_note: o.priceNote ?? null, rate_note: o.rateNote ?? null, served_price_pct: o.servedPricePct ?? null, commission_pct: o.commissionPct,
    min_titles: o.minTitles ?? null, size_label: o.sizeLabel ?? null, price_per_share: o.pricePerShare ?? null, min_shares: o.minShares ?? null,
    shares_offered: o.sharesOffered ?? null, dividend_per_share: o.dividendPerShare ?? null, last_price: o.lastPrice ?? null,
    last_price_on: o.lastPriceOn ?? null, last_traded_on: o.lastTradedOn ?? null, market: o.market ?? null, instrument: o.instrument ?? null, bid: o.bid ?? null, ask: o.ask ?? null, lot_size: o.lotSize ?? null, settlement_days: o.settlementDays ?? null, price_source: o.priceSource ?? null, hidden: Boolean(o.hidden), fund: o.fund ?? null, type_key: o.typeKey ?? null, extra: o.extra ?? null, featured: o.featured ?? null, version: o.version, priced_at: o.pricedAt ?? null, result_line: o.resultLine ?? null,
  };
}

type DocRow = {
  register_no: string | null;
  id: string; type: GeneratedDocument["type"]; number: string; title: string; intent_id: string | null; offer_id: string | null; client_name: string | null;
  auction_key: string | null; client_file_id: string | null; client_id: string | null; file_key: string; status: GeneratedDocument["status"]; sent_via: string[] | null; sent_at: string | null; signed_at: string | null;
  created_at: string; created_by: string | null; template_versions?: Record<string, number> | null; flow_key?: string | null;
};
const toDoc = (r: DocRow): GeneratedDocument => ({
  id: r.id, type: r.type, number: r.number, registerNo: u(r.register_no), title: r.title, intentId: u(r.intent_id), offerId: u(r.offer_id), clientName: u(r.client_name),
  auctionKey: u(r.auction_key), clientFileId: u(r.client_file_id), clientId: u(r.client_id), fileKey: r.file_key, status: r.status, sentVia: u(r.sent_via), sentAt: u(r.sent_at), signedAt: u(r.signed_at),
  createdAt: r.created_at, createdBy: u(r.created_by), templateVersions: u(r.template_versions), flowKey: u(r.flow_key),
});
const fromDoc = (p: Partial<GeneratedDocument>): Partial<DocRow> => {
  const row: Partial<DocRow> = {};
  if (p.templateVersions !== undefined) row.template_versions = p.templateVersions;
  if (p.flowKey !== undefined) row.flow_key = p.flowKey;
  if (p.type !== undefined) row.type = p.type;
  if (p.number !== undefined) row.number = p.number;
  if (p.registerNo !== undefined) row.register_no = p.registerNo;
  if (p.title !== undefined) row.title = p.title;
  if (p.intentId !== undefined) row.intent_id = p.intentId;
  if (p.offerId !== undefined) row.offer_id = p.offerId;
  if (p.clientName !== undefined) row.client_name = p.clientName;
  if (p.auctionKey !== undefined) row.auction_key = p.auctionKey;
  if (p.clientFileId !== undefined) row.client_file_id = p.clientFileId;
  if (p.clientId !== undefined) row.client_id = p.clientId;
  if (p.fileKey !== undefined) row.file_key = p.fileKey;
  if (p.status !== undefined) row.status = p.status;
  if (p.sentVia !== undefined) row.sent_via = p.sentVia;
  if (p.sentAt !== undefined) row.sent_at = p.sentAt;
  if (p.signedAt !== undefined) row.signed_at = p.signedAt;
  if (p.createdAt !== undefined) row.created_at = p.createdAt;
  if (p.createdBy !== undefined) row.created_by = p.createdBy;
  return row;
};

type ProfileRow = { id: string; display_name: string | null; segment: string | null; phone: string | null; email: string | null; whatsapp_opt_in: boolean; email_opt_in?: boolean | null; tier?: number | null; created_at?: string | null };
type CodeRow = { id: string; user_id: string | null; channel: ProofChannel; target: string; code_hash: string; expires_at: string; attempts: number; verified_at: string | null; created_at: string };
const toCode = (r: CodeRow): ChannelCode => ({ id: r.id, userId: u(r.user_id), channel: r.channel, target: r.target, codeHash: r.code_hash, expiresAt: r.expires_at, attempts: r.attempts, verifiedAt: u(r.verified_at), createdAt: r.created_at });
type DeviceRow = { id: string; user_id: string; kind: DeviceKind; name: string; credential_id: string | null; public_key: string | null; counter: number | null; secret_hash: string | null; failures: number; created_at: string; last_used_at: string | null };
const toDevice = (r: DeviceRow): TrustedDevice => ({ id: r.id, userId: r.user_id, kind: r.kind, name: r.name, credentialId: u(r.credential_id), publicKey: u(r.public_key), counter: r.counter ?? undefined, secretHash: u(r.secret_hash), failures: r.failures, createdAt: r.created_at, lastUsedAt: u(r.last_used_at) });
const PROFILE_COLS = "id, display_name, segment, phone, email, whatsapp_opt_in, email_opt_in, tier, created_at";
const toContact = (r: ProfileRow): Contact => ({ id: r.id, name: r.display_name ?? r.email ?? r.id, segment: r.segment ?? "", phone: u(r.phone), email: u(r.email), whatsappOptIn: r.whatsapp_opt_in, emailOptIn: Boolean(r.email_opt_in), tier: (r.tier ?? 1) as 0 | 1 | 2, since: u(r.created_at) });
type StaffRow = { id: string; display_name: string | null; email: string | null; phone: string | null; role: string; mfa_enrolled_at: string | null; role_set_by: string | null; role_set_at: string | null };
const STAFF_COLS = "id, display_name, email, phone, role, mfa_enrolled_at, role_set_by, role_set_at";
const toStaff = (r: StaffRow): StaffMember => ({ id: r.id, name: r.display_name ?? r.email ?? r.id, email: u(r.email), phone: u(r.phone), role: r.role === "responsable" ? "responsable" : "desk", mfaEnrolledAt: u(r.mfa_enrolled_at), roleSetBy: u(r.role_set_by), roleSetAt: u(r.role_set_at) });
type PushRow = { id: string; user_id: string; endpoint: string; keys: { p256dh: string; auth: string }; user_agent: string | null; created_at: string; failures: number };
type AuditRow = { id: number; at: string; actor: string; actor_id: string | null; action: string; entity: string; entity_id: string; before: unknown; after: unknown; reason: string | null; ip: string | null; user_agent: string | null; prev_hash: string | null; hash: string };
const toAudit = (r: AuditRow): AuditEntry => ({ id: String(r.id), at: r.at, actor: r.actor, actorId: u(r.actor_id), action: r.action, entity: r.entity, entityId: r.entity_id, before: r.before ?? undefined, after: r.after ?? undefined, reason: u(r.reason), ip: u(r.ip), userAgent: u(r.user_agent), prevHash: u(r.prev_hash), hash: r.hash });
type ApprovalRow = { id: string; kind: Approval["kind"]; entity_id: string; title: string; payload: Offer; reason: string; requested_by: string; requested_at: string; decided_by: string | null; decided_at: string | null; decision: Approval["decision"] | null; note: string | null };
const toApproval = (r: ApprovalRow): Approval => ({ id: r.id, kind: r.kind, entityId: r.entity_id, title: r.title, payload: r.payload, reason: r.reason, requestedBy: r.requested_by, requestedAt: r.requested_at, decidedBy: u(r.decided_by), decidedAt: u(r.decided_at), decision: u(r.decision), note: u(r.note) });
/**
 * Un mouvement d'espèces. Le montant revient en chaîne depuis Postgres, parce
 * qu'un numérique de précision ne tient pas toujours dans un nombre : on le
 * convertit ici, une fois, plutôt qu'à chaque lecture.
 */
type CashRow = { id: string; user_id: string; at: string; amount: string | number; kind: CashEntry["kind"]; label: string; intent_id: string | null; due_by: string | null; created_by: string | null };
const toCash = (r: CashRow): CashEntry => ({ id: r.id, userId: r.user_id, at: r.at, amount: Number(r.amount), kind: r.kind, label: r.label, intentId: u(r.intent_id), dueBy: u(r.due_by) });

type WatchRow = { id: string; user_id: string; offer_id: string; last_hero: string | null; last_status: string | null; alerted_at: string | null; created_at: string };
const toWatch = (r: WatchRow): Watch => ({ id: r.id, userId: r.user_id, offerId: r.offer_id, lastHero: u(r.last_hero), lastStatus: u(r.last_status), alertedAt: u(r.alerted_at), createdAt: r.created_at });
type NotifRow = {
  id: string; kind: Notification["kind"]; channel: Notification["channel"]; to_address: string; contact_name: string | null; subject: string | null; body: string;
  document_id: string | null; intent_id: string | null; offer_id: string | null; status: Notification["status"]; provider_id: string | null; error: string | null; created_at: string; sent_at: string | null;
};
const toNotif = (r: NotifRow): Notification => ({
  id: r.id, kind: r.kind, channel: r.channel, to: r.to_address, contactName: u(r.contact_name), subject: u(r.subject), body: r.body, documentId: u(r.document_id), intentId: u(r.intent_id),
  offerId: u(r.offer_id), status: r.status, providerId: u(r.provider_id), error: u(r.error), createdAt: r.created_at, sentAt: u(r.sent_at),
});
type InboundRow = { id: string; channel: InboundMessage["channel"]; from_address: string; contact_name: string | null; subject: string | null; body: string | null; received_at: string; handled_at: string | null; handled_by: string | null };
const toInbound = (r: InboundRow): InboundMessage => ({ id: r.id, channel: r.channel, from: r.from_address, name: u(r.contact_name), subject: u(r.subject), body: r.body ?? "", receivedAt: r.received_at, handledAt: u(r.handled_at), handledBy: u(r.handled_by) });
const fromNotif = (p: Partial<Notification>): Partial<NotifRow> => {
  const row: Partial<NotifRow> = {};
  if (p.kind !== undefined) row.kind = p.kind;
  if (p.channel !== undefined) row.channel = p.channel;
  if (p.to !== undefined) row.to_address = p.to;
  if (p.contactName !== undefined) row.contact_name = p.contactName;
  if (p.subject !== undefined) row.subject = p.subject;
  if (p.body !== undefined) row.body = p.body;
  if (p.documentId !== undefined) row.document_id = p.documentId;
  if (p.intentId !== undefined) row.intent_id = p.intentId;
  if (p.offerId !== undefined) row.offer_id = p.offerId;
  if (p.status !== undefined) row.status = p.status;
  if (p.providerId !== undefined) row.provider_id = p.providerId;
  if (p.error !== undefined) row.error = p.error;
  if (p.sentAt !== undefined) row.sent_at = p.sentAt;
  return row;
};

type KycRow = {
  id: string; user_id: string; kind: ClientFile["kind"]; status: ClientFile["status"]; identity: ClientFile["identity"]; persons: ClientFile["persons"];
  documents: ClientFile["documents"]; funds: ClientFile["funds"]; profile: ClientFile["profile"]; consents: ClientFile["consents"]; review: ClientFile["review"];
  screening: ClientFile["screening"] | null; acts?: ClientFile["acts"] | null;
  created_at: string; updated_at: string; submitted_at: string | null;
};
const toKyc = (r: KycRow): ClientFile => ({
  id: r.id, userId: r.user_id, kind: r.kind, status: r.status, identity: r.identity, persons: r.persons ?? [], documents: r.documents ?? [], funds: r.funds,
  profile: r.profile, consents: r.consents ?? {}, review: r.review ?? {}, screening: r.screening ?? undefined, acts: r.acts ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at, submittedAt: u(r.submitted_at),
});
const fromKyc = (p: Partial<ClientFile>): Partial<KycRow> => {
  const row: Partial<KycRow> = {};
  if (p.userId !== undefined) row.user_id = p.userId;
  if (p.kind !== undefined) row.kind = p.kind;
  if (p.status !== undefined) row.status = p.status;
  if (p.identity !== undefined) row.identity = p.identity;
  if (p.persons !== undefined) row.persons = p.persons;
  if (p.documents !== undefined) row.documents = p.documents;
  if (p.funds !== undefined) row.funds = p.funds;
  if (p.profile !== undefined) row.profile = p.profile;
  if (p.consents !== undefined) row.consents = p.consents;
  if (p.review !== undefined) row.review = p.review;
  if (p.screening !== undefined) row.screening = p.screening;
  if (p.acts !== undefined) row.acts = p.acts;
  if (p.submittedAt !== undefined) row.submitted_at = p.submittedAt;
  return row;
};

const toEvent = (r: EventRow): EventLog => ({ id: r.id, at: r.at, kind: r.kind, html: r.html, intentId: u(r.intent_id), offerId: u(r.offer_id) });

let client: SupabaseClient | undefined;
type TemplateTextRow = { id: string; doc_type: DocumentType; passage: string; version: number; fr: string; en: string; status: TemplateTextStatus; by_name: string; at: string; note: string | null; approved_by: string | null; approved_at: string | null };
const toTemplateText = (r: TemplateTextRow): TemplateText => ({ id: r.id, docType: r.doc_type, passage: r.passage, version: r.version, fr: r.fr, en: r.en ?? "", status: r.status, by: r.by_name, at: r.at, note: r.note ?? undefined, approvedBy: r.approved_by ?? undefined, approvedAt: r.approved_at ?? undefined });

type BulletinRow = {
  session_date: string; number: number; source_url: string | null; file_key: string | null; ingested_at: string; ingested_by: MarketBulletin["ingestedBy"]; status: MarketBulletin["status"];
  index_value: string | null; index_variation_pct: string | null; counts: MarketBulletin["counts"]; warnings: string[]; anomalies: string[]; notices: string[];
};
const toBulletin = (r: BulletinRow): MarketBulletin => ({
  id: r.session_date, number: r.number, sessionDate: r.session_date, sourceUrl: u(r.source_url), fileKey: u(r.file_key), ingestedAt: r.ingested_at, ingestedBy: r.ingested_by, status: r.status,
  indexValue: nn(r.index_value), indexVariationPct: nn(r.index_variation_pct), counts: r.counts, warnings: r.warnings ?? [], anomalies: r.anomalies ?? [], notices: r.notices ?? [],
});
const fromBulletin = (b: MarketBulletin): BulletinRow => ({
  session_date: b.sessionDate, number: b.number, source_url: b.sourceUrl ?? null, file_key: b.fileKey ?? null, ingested_at: b.ingestedAt, ingested_by: b.ingestedBy, status: b.status,
  index_value: b.indexValue != null ? String(b.indexValue) : null, index_variation_pct: b.indexVariationPct != null ? String(b.indexVariationPct) : null, counts: b.counts, warnings: b.warnings, anomalies: b.anomalies, notices: b.notices,
});
type QuoteRow = {
  isin: string; session_date: string; bulletin_no: number; instrument: Quote["instrument"]; mnemo: string; issuer: string; designation: string; segment: Quote["segment"] | null;
  previous_close: string; previous_date: string; open: string; close: string; threshold_high: string; threshold_low: string; variation_pct: string; reference_next: string;
  volume_traded: number; value_traded: string; trades: number; status: string; nominal_remaining: string | null; accrued_coupon: string | null; ytd_variation_pct: string | null;
  shares_float: number | null; shares_total: number | null; last_dividend: string | null; dividend_year: number | null; dividend_date: string | null; liquidity_3m_pct: string | null; eps: string | null; market_cap_float: string | null; market_cap_total: string | null;
};
const N = (v: string | number) => Number(v);
const nn = (v: string | number | null): number | undefined => (v === null ? undefined : Number(v));
const toQuote = (r: QuoteRow): Quote => ({
  isin: r.isin, sessionDate: r.session_date, bulletinNo: r.bulletin_no, instrument: r.instrument, mnemo: r.mnemo, issuer: r.issuer, designation: r.designation, segment: u(r.segment),
  previousClose: N(r.previous_close), previousDate: r.previous_date, open: N(r.open), close: N(r.close), thresholdHigh: N(r.threshold_high), thresholdLow: N(r.threshold_low), variationPct: N(r.variation_pct),
  referenceNext: N(r.reference_next), volumeTraded: r.volume_traded, valueTraded: N(r.value_traded), trades: r.trades, status: r.status,
  nominalRemaining: nn(r.nominal_remaining), accruedCoupon: nn(r.accrued_coupon), ytdVariationPct: r.ytd_variation_pct === null ? null : N(r.ytd_variation_pct),
  sharesFloat: u(r.shares_float), sharesTotal: u(r.shares_total), lastDividend: nn(r.last_dividend), dividendYear: u(r.dividend_year), dividendDate: u(r.dividend_date), liquidity3mPct: nn(r.liquidity_3m_pct), eps: nn(r.eps), marketCapFloat: nn(r.market_cap_float), marketCapTotal: nn(r.market_cap_total),
});
const fromQuote = (q: Quote): QuoteRow => ({
  isin: q.isin, session_date: q.sessionDate, bulletin_no: q.bulletinNo, instrument: q.instrument, mnemo: q.mnemo, issuer: q.issuer, designation: q.designation, segment: q.segment ?? null,
  previous_close: String(q.previousClose), previous_date: q.previousDate, open: String(q.open), close: String(q.close), threshold_high: String(q.thresholdHigh), threshold_low: String(q.thresholdLow),
  variation_pct: String(q.variationPct), reference_next: String(q.referenceNext), volume_traded: q.volumeTraded, value_traded: String(q.valueTraded), trades: q.trades, status: q.status,
  nominal_remaining: q.nominalRemaining != null ? String(q.nominalRemaining) : null, accrued_coupon: q.accruedCoupon != null ? String(q.accruedCoupon) : null, ytd_variation_pct: q.ytdVariationPct != null ? String(q.ytdVariationPct) : null,
  shares_float: q.sharesFloat ?? null, shares_total: q.sharesTotal ?? null, last_dividend: numOrNull(q.lastDividend), dividend_year: q.dividendYear ?? null, dividend_date: q.dividendDate ?? null, liquidity_3m_pct: numOrNull(q.liquidity3mPct), eps: numOrNull(q.eps), market_cap_float: numOrNull(q.marketCapFloat), market_cap_total: numOrNull(q.marketCapTotal),
});
type NavRow = {
  fund_key: string; nav_date: string; name: string; manager: string; depositary: string; category: FundNav["category"]; frequency: FundNav["frequency"]; nav: string; previous_nav: string | null; previous_date: string | null;
  nav_origin: string; inception_date: string; perf_since_inception_pct: string; variation_pct: string | null; variation_monthly_pct: string | null; variation_quarterly_pct: string | null; bulletin_no: number; session_date: string;
};
const toNav = (r: NavRow): FundNav => ({
  fundKey: r.fund_key, navDate: r.nav_date, name: r.name, manager: r.manager, depositary: r.depositary, category: r.category, frequency: r.frequency, nav: N(r.nav), previousNav: nn(r.previous_nav),
  previousDate: u(r.previous_date), navOrigin: N(r.nav_origin), inceptionDate: r.inception_date, perfSinceInceptionPct: N(r.perf_since_inception_pct), variationPct: nn(r.variation_pct),
  variationMonthlyPct: nn(r.variation_monthly_pct), variationQuarterlyPct: nn(r.variation_quarterly_pct), bulletinNo: r.bulletin_no, sessionDate: r.session_date,
});
const numOrNull = (v?: number) => (v != null && Number.isFinite(v) ? String(v) : null);
const fromNav = (n: FundNav): NavRow => ({
  fund_key: n.fundKey, nav_date: n.navDate, name: n.name, manager: n.manager, depositary: n.depositary, category: n.category, frequency: n.frequency, nav: String(n.nav), previous_nav: numOrNull(n.previousNav),
  previous_date: n.previousDate ?? null, nav_origin: String(n.navOrigin), inception_date: n.inceptionDate, perf_since_inception_pct: String(n.perfSinceInceptionPct), variation_pct: numOrNull(n.variationPct),
  variation_monthly_pct: numOrNull(n.variationMonthlyPct), variation_quarterly_pct: numOrNull(n.variationQuarterlyPct), bulletin_no: n.bulletinNo, session_date: n.sessionDate,
});

type IssuerDocRow = { id: string; mnemo: string; kind: string; year: number | null; title: string; source_url: string; file_key: string | null; bytes: number | null; has_text: boolean | null; collected_at: string };
const toIssuerDoc = (r: IssuerDocRow): IssuerDocument => ({ id: r.id, mnemo: r.mnemo, kind: r.kind, year: u(r.year), title: r.title, sourceUrl: r.source_url, fileKey: u(r.file_key), bytes: u(r.bytes), hasText: u(r.has_text), collectedAt: r.collected_at });

function db(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env vars missing");
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

function fail(ctx: string, error: { message: string } | null): never {
  throw new Error(`${ctx}: ${error?.message ?? "unknown error"}`);
}

type RefRow = { kind: string; key: string; data: unknown; updated_at: string; updated_by: string | null; draft?: unknown; draft_by?: string | null; draft_at?: string | null };
const toReferenceRow = (r: RefRow): ReferenceRow => ({ kind: r.kind, key: r.key, data: r.data ?? null, updatedAt: r.updated_at, updatedBy: u(r.updated_by), ...(r.draft ? { draft: r.draft as ReferenceDraft, draftBy: u(r.draft_by ?? null), draftAt: r.draft_at ?? undefined } : {}) });

export const supabaseRepository: Repository = {
  async listOffers() {
    const { data, error } = await db().from("offers").select("*").neq("status", "draft").order("deadline_at");
    if (error) fail("listOffers", error);
    return (data as OfferRow[]).map(toOffer);
  },
  async getOffer(id) {
    const { data, error } = await db().from("offers").select("*").eq("id", id).maybeSingle();
    if (error) fail("getOffer", error);
    return data ? toOffer(data as OfferRow) : undefined;
  },
  async publishOffer(id, patch) {
    const current = await this.getOffer(id);
    if (!current) throw new Error(`Offer ${id} not found`);
    const row: Partial<OfferRow> = {
      status: "published",
      version: current.version + 1,
      priced_at: new Date().toISOString(),
      price_note: null,
      rate_note: null,
    };
    if (patch.pricePct !== undefined) row.price_pct = patch.pricePct;
    if (patch.precountRate !== undefined) row.precount_rate = patch.precountRate;
    if (patch.commissionPct !== undefined) row.commission_pct = patch.commissionPct;
    if (patch.minTitles !== undefined) row.min_titles = patch.minTitles;
    const { data, error } = await db().from("offers").update(row).eq("id", id).select("*").single();
    if (error) fail("publishOffer", error);
    // keep the price history
    await db().from("offer_versions").insert({ offer_id: id, version: row.version, price_pct: row.price_pct ?? current.pricePct ?? null, precount_rate: row.precount_rate ?? current.precountRate ?? null, commission_pct: row.commission_pct ?? current.commissionPct, min_titles: row.min_titles ?? current.minTitles ?? null });
    return toOffer(data as OfferRow);
  },

  async listIntents() {
    const { data, error } = await db().from("intents").select("*").order("created_at", { ascending: false });
    if (error) fail("listIntents", error);
    return (data as IntentRow[]).map(toIntent);
  },
  async createIntent(input) {
    const offer = await this.getOffer(input.offerId);
    if (!offer) throw new Error(`Offer ${input.offerId} not found`);
    const { data: seqData, error: seqErr } = await db().rpc("next_intent_seq");
    if (seqErr) fail("next_intent_seq", seqErr);
    // two references : the one the client quotes carries no rank, the journal entry does
    const ref = makeRef(input.type);
    const row: Record<string, unknown> = {
      ref,
      register_no: makeOrderNo(Number(seqData)),
      offer_id: offer.id,
      offer_version: offer.version,
      client_id: input.clientId ?? null,
      client_name: input.clientName,
      client_segment: input.clientSegment,
      type: input.type,
      amount: input.amount ?? null,
      limit_price: input.limitPrice ?? null,
      channel: input.channel,
      contact_phone: input.contactPhone ?? null,
      contact_email: input.contactEmail ?? null,
      message: input.message?.trim() || null,
      state: "recue",
      phone_verified: input.phoneVerified ?? null,
      email_verified: input.emailVerified ?? null,
      profile_flag: input.profileFlag ?? null,
    };
    let { data, error } = await db().from("intents").insert(row).select("*").single();
    if (error && /register_no/.test(error.message)) {
      // Migration 0035 not applied yet: the order still leaves, its journal entry waits for the migration.
      console.warn("[intents] migration 0035_intent_register.sql manquante : le numéro de journal attend");
      delete row.register_no;
      ({ data, error } = await db().from("intents").insert(row).select("*").single());
    }
    // an opaque reference can, very rarely, land on one already taken: draw another
    for (let i = 0; error && /intents_ref_key|duplicate key/.test(error.message) && i < 5; i++) {
      row.ref = makeRef(input.type);
      ({ data, error } = await db().from("intents").insert(row).select("*").single());
    }
    if (error && /profile_flag/.test(error.message)) {
      // Migration 0028 not applied yet: the intent still leaves, the flag stays in the message.
      delete row.profile_flag;
      ({ data, error } = await db().from("intents").insert(row).select("*").single());
    }
    if (error && /(phone|email)_verified/.test(error.message)) {
      // Migration 0026 not applied yet: the intent still leaves, the proof marks wait for the migration.
      delete row.phone_verified;
      delete row.email_verified;
      ({ data, error } = await db().from("intents").insert(row).select("*").single());
    }
    if (error && /contact_(phone|email)/.test(error.message)) {
      // Migration 0013 not applied yet: keep taking orders, the contact stays in the message.
      console.warn("[intents] migration 0013_intent_contact.sql manquante : contact gardé dans le message");
      delete row.contact_phone;
      delete row.contact_email;
      const contact = [input.contactPhone, input.contactEmail].filter(Boolean).join(" · ");
      if (contact) row.message = `[${contact}] ${row.message ?? ""}`.trim();
      ({ data, error } = await db().from("intents").insert(row).select("*").single());
    }
    if (error) fail("createIntent", error);
    const intent = toIntent(data as IntentRow);
    const unit = offer.kind === "RACHAT" ? "titres" : "FCFA";
    await this.logEvent({
      kind: "intent",
      intentId: intent.id,
      offerId: offer.id,
      html: `<b>${receivedLabel(intent.type)}</b> de ${intent.clientName} sur ${offer.title}${intent.amount ? ` · ${fmt(intent.amount)} ${unit}` : ""} · réf. ${intent.ref}`,
    });
    return intent;
  },
  async updateIntent(id, patch) {
    const row: Partial<IntentRow> = { updated_at: new Date().toISOString() };
    if (patch.state !== undefined) row.state = patch.state;
    if (patch.allocationPct !== undefined) row.allocation_pct = patch.allocationPct;
    if (patch.servedUnits !== undefined) row.served_units = patch.servedUnits;
    if (patch.executedPrice !== undefined) row.executed_price = patch.executedPrice;
    if (patch.message !== undefined) row.message = patch.message ?? null;
    if (patch.amount !== undefined) row.amount = patch.amount;
    if (patch.limitPrice !== undefined) row.limit_price = patch.limitPrice;
    if (patch.counter !== undefined) row.counter = patch.counter ?? null;
    const { data, error } = await db().from("intents").update(row).eq("id", id).select("*").single();
    if (error) fail("updateIntent", error);
    return toIntent(data as IntentRow);
  },
  async setIntentState(id, state, closedReason) {
    const { data, error } = await db()
      .from("intents")
      .update({ state, updated_at: new Date().toISOString(), ...(closedReason ? { closed_reason: closedReason } : {}) })
      .eq("id", id)
      .select("*")
      .single();
    if (error) fail("setIntentState", error);
    return toIntent(data as IntentRow);
  },

  async listEvents(limit = 50) {
    const { data, error } = await db().from("events").select("*").order("at", { ascending: false }).limit(limit);
    if (error) fail("listEvents", error);
    return (data as EventRow[]).map(toEvent);
  },
  async logEvent(e) {
    const { data, error } = await db()
      .from("events")
      .insert({ kind: e.kind, html: e.html, intent_id: e.intentId ?? null, offer_id: e.offerId ?? null })
      .select("*")
      .single();
    if (error) fail("logEvent", error);
    return toEvent(data as EventRow);
  },

  async listIntake() {
    const { data, error } = await db().from("intake_items").select("*").order("received_at", { ascending: false });
    if (error) fail("listIntake", error);
    return (data as IntakeRow[]).map(toIntake);
  },
  async getIntake(id) {
    const { data, error } = await db().from("intake_items").select("*").eq("id", id).maybeSingle();
    if (error) fail("getIntake", error);
    return data ? toIntake(data as IntakeRow) : undefined;
  },
  async createIntake(item) {
    const { data, error } = await db().from("intake_items").insert(fromIntake(item)).select("*").single();
    if (error) fail("createIntake", error);
    return toIntake(data as IntakeRow);
  },
  async updateIntake(id, patch) {
    const { data, error } = await db().from("intake_items").update(fromIntake(patch)).eq("id", id).select("*").single();
    if (error) fail("updateIntake", error);
    return toIntake(data as IntakeRow);
  },
  async upsertOffer(offer, opts = {}) {
    let row: OfferRow;
    if (opts.expectedVersion != null) {
      // Optimistic locking: the update only lands if nobody moved the version meanwhile.
      const { data, error } = await db().from("offers").update(fromOffer(offer)).eq("id", offer.id).eq("version", opts.expectedVersion).select("*").maybeSingle();
      if (error) fail("upsertOffer", error);
      if (!data) {
        const { data: cur } = await db().from("offers").select("version").eq("id", offer.id).maybeSingle();
        if (cur) throw new ConflictError("offer", offer.id, opts.expectedVersion, (cur as { version: number }).version);
        const ins = await db().from("offers").insert(fromOffer(offer)).select("*").single();
        if (ins.error) fail("upsertOffer", ins.error);
        row = ins.data as OfferRow;
      } else row = data as OfferRow;
    } else {
      const { data, error } = await db().from("offers").upsert(fromOffer(offer)).select("*").single();
      if (error) fail("upsertOffer", error);
      row = data as OfferRow;
    }
    const base = { offer_id: offer.id, version: offer.version, price_pct: offer.pricePct ?? null, precount_rate: offer.precountRate ?? null, commission_pct: offer.commissionPct, min_titles: offer.minTitles ?? null };
    const { error: vErr } = await db().from("offer_versions").upsert({ ...base, snapshot: offer, published_by_name: opts.by ?? null, note: opts.note ?? null }, { onConflict: "offer_id,version" });
    // Before migration 0019 the snapshot columns do not exist: keep the old shape.
    if (vErr) await db().from("offer_versions").upsert(base, { onConflict: "offer_id,version" });
    return toOffer(row);
  },
  async listOfferVersions(offerId) {
    const { data, error } = await db().from("offer_versions").select("offer_id, version, published_at, published_by_name, note, snapshot").eq("offer_id", offerId).order("version", { ascending: false });
    if (error) return [];
    return (data as { offer_id: string; version: number; published_at: string; published_by_name: string | null; note: string | null; snapshot: Offer | null }[]).map((r) => ({ offerId: r.offer_id, version: r.version, publishedAt: r.published_at, publishedBy: u(r.published_by_name), note: u(r.note), snapshot: u(r.snapshot) }));
  },
  /**
   * Une ligne d'audit, chaînée à la précédente.
   *
   * Lire l'empreinte puis insérer laisse une fenêtre : deux actions
   * simultanées lisent la même dernière ligne, écrivent le même `prev_hash`,
   * et la chaîne se rompt sans que personne ait touché à la base. L'index
   * unique de la migration 0040 refuse la seconde ; il ne reste qu'à relire
   * et recommencer, ce que fait cette boucle.
   *
   * L'empreinte reste calculée ici et non dans une fonction SQL : elle porte
   * sur `JSON.stringify`, dont l'ordre des clefs et l'échappement sont ceux
   * de JavaScript. Les refaire en plpgsql donnerait deux calculs à tenir
   * d'accord, et le jour où ils divergeraient la chaîne casserait vraiment.
   */
  async logAudit(e) {
    for (let essai = 0; ; essai++) {
      const { data: last } = await db().from("audit").select("hash").order("id", { ascending: false }).limit(1).maybeSingle();
      const prevHash = (last as { hash: string } | null)?.hash;
      const at = new Date().toISOString();
      const hash = createHash("sha256").update((prevHash ?? "") + JSON.stringify({ at, ...e })).digest("hex");
      const { data, error } = await db()
        .from("audit")
        .insert({ at, actor: e.actor, actor_id: e.actorId ?? null, action: e.action, entity: e.entity, entity_id: e.entityId, before: e.before ?? null, after: e.after ?? null, reason: e.reason ?? null, ip: e.ip ?? null, user_agent: e.userAgent ?? null, prev_hash: prevHash ?? null, hash })
        .select("id")
        .single();
      if (!error) return { id: String((data as { id: number }).id), at, ...e, prevHash, hash };
      // 23505 : quelqu'un a pris ce prédécesseur entre notre lecture et notre
      // écriture. On relit et on se remet à la suite.
      if (error.code !== "23505" || essai >= 4) fail("logAudit", error);
      await new Promise((r) => setTimeout(r, 20 * (essai + 1)));
    }
  },
  async listAudit(filter = {}) {
    let q = db().from("audit").select("*").order("id", { ascending: false }).limit(filter.limit ?? 100);
    if (filter.entity) q = q.eq("entity", filter.entity);
    if (filter.entityId) q = q.eq("entity_id", filter.entityId);
    const { data, error } = await q;
    if (error) return [];
    return (data as AuditRow[]).map(toAudit);
  },
  async listPushSubscriptions(userIds) {
    let q = db().from("push_subscriptions").select("*");
    if (userIds) q = q.in("user_id", userIds);
    const { data, error } = await q;
    if (error) return [];
    return (data as PushRow[]).map((r) => ({ id: r.id, userId: r.user_id, endpoint: r.endpoint, keys: r.keys, userAgent: u(r.user_agent), createdAt: r.created_at, failures: r.failures }));
  },
  async savePushSubscription(s) {
    const { error } = await db().from("push_subscriptions").upsert({ user_id: s.userId, endpoint: s.endpoint, keys: s.keys, user_agent: s.userAgent ?? null, failures: 0 }, { onConflict: "endpoint" });
    if (error) fail("savePushSubscription", error);
  },
  async removePushSubscription(endpoint) {
    await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  },
  async markPushFailure(endpoint, gone) {
    if (gone) {
      await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
      return;
    }
    const { data } = await db().from("push_subscriptions").select("failures").eq("endpoint", endpoint).maybeSingle();
    const n = ((data as { failures: number } | null)?.failures ?? 0) + 1;
    if (n >= 5) await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
    else await db().from("push_subscriptions").update({ failures: n }).eq("endpoint", endpoint);
  },
  async listApprovals(open = true) {
    const q = db().from("approvals").select("*").order("requested_at", { ascending: false });
    const { data, error } = open ? await q.is("decided_at", null) : await q.not("decided_at", "is", null).limit(100);
    if (error) return [];
    return (data as ApprovalRow[]).map(toApproval);
  },
  async createApproval(a) {
    const { data, error } = await db().from("approvals").insert({ kind: a.kind, entity_id: a.entityId, title: a.title, payload: a.payload, reason: a.reason, requested_by: a.requestedBy }).select("*").single();
    if (error) fail("createApproval", error);
    return toApproval(data as ApprovalRow);
  },
  async decideApproval(id, decision, by, note) {
    const { data, error } = await db().from("approvals").update({ decision, decided_by: by, decided_at: new Date().toISOString(), note: note ?? null }).eq("id", id).select("*").single();
    if (error) fail("decideApproval", error);
    return toApproval(data as ApprovalRow);
  },

  async listDocuments() {
    const { data, error } = await db().from("documents").select("*").order("created_at", { ascending: false });
    if (error) fail("listDocuments", error);
    return (data as DocRow[]).map(toDoc);
  },
  async getDocument(id) {
    const { data, error } = await db().from("documents").select("*").eq("id", id).maybeSingle();
    if (error) fail("getDocument", error);
    return data ? toDoc(data as DocRow) : undefined;
  },
  async createDocument(doc) {
    const { data, error } = await db().from("documents").insert(fromDoc(doc)).select("*").single();
    if (error) fail("createDocument", error);
    return toDoc(data as DocRow);
  },
  async updateDocument(id, patch) {
    const { data, error } = await db().from("documents").update(fromDoc(patch)).eq("id", id).select("*").single();
    if (error) fail("updateDocument", error);
    return toDoc(data as DocRow);
  },

  async listContacts() {
    const { data, error } = await db().from("profiles").select(PROFILE_COLS).eq("role", "client");
    if (error) fail("listContacts", error);
    return (data as ProfileRow[]).map(toContact);
  },
  async getContact(id) {
    const { data, error } = await db().from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle();
    if (error) fail("getContact", error);
    return data ? toContact(data as ProfileRow) : undefined;
  },
  async setContactOptIn(id, optIn) {
    const { error } = await db().from("profiles").update({ whatsapp_opt_in: optIn, whatsapp_opt_in_at: optIn ? new Date().toISOString() : null }).eq("id", id);
    if (error) fail("setContactOptIn", error);
  },
  async setEmailOptIn(id, optIn) {
    const { error } = await db().from("profiles").update({ email_opt_in: optIn, email_opt_in_at: optIn ? new Date().toISOString() : null }).eq("id", id);
    if (error) fail("setContactOptIn", error);
  },
  async listStaff() {
    const { data, error } = await db().from("profiles").select(STAFF_COLS).in("role", ["desk", "responsable"]).order("display_name");
    if (error) fail("listStaff", error);
    return (data as StaffRow[]).map(toStaff);
  },
  async findProfileByEmail(email) {
    const { data, error } = await db().from("profiles").select(STAFF_COLS).ilike("email", email).maybeSingle();
    if (error) fail("findProfileByEmail", error);
    if (data) return toStaff(data as StaffRow);
    // The profile row is filled from auth.users on first login; look there for someone who never signed in.
    const { data: users } = await db().auth.admin.listUsers({ perPage: 1000 });
    const hit = users?.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    return hit ? { id: hit.id, name: hit.email ?? hit.id, email: hit.email ?? undefined, role: "desk" } : undefined;
  },
  async setRole(userId, role, by) {
    const { error } = await db().from("profiles").upsert({ id: userId, role, role_set_by: by, role_set_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) fail("setRole", error);
  },
  async markMfaEnrolled(userId) {
    const { error } = await db().from("profiles").update({ mfa_enrolled_at: new Date().toISOString() }).eq("id", userId);
    if (error) fail("markMfaEnrolled", error);
  },
  async listReference(kind) {
    const { data, error } = await db().from("reference").select("*").eq("kind", kind).order("key");
    if (error) {
      if (/reference/.test(error.message)) return []; // migration 0016 not applied yet
      fail("listReference", error);
    }
    return (data as RefRow[]).map(toReferenceRow);
  },
  async saveReferenceDraft(kind, key, draft, by) {
    const { data: existing } = await db().from("reference").select("key").eq("kind", kind).eq("key", key).maybeSingle();
    const patch = { draft, draft_by: by, draft_at: new Date().toISOString() };
    const { error } = existing ? await db().from("reference").update(patch).eq("kind", kind).eq("key", key) : await db().from("reference").insert({ kind, key, data: null, updated_by: by, ...patch });
    if (error) fail("saveReferenceDraft", error);
  },
  async publishReference(kind, keys) {
    let q = db().from("reference").select("*").eq("kind", kind).not("draft", "is", null);
    if (keys) q = q.in("key", keys);
    const { data, error } = await q;
    if (error) fail("publishReference", error);
    const done: string[] = [];
    for (const r of (data ?? []) as RefRow[]) {
      const d = r.draft as ReferenceDraft;
      const res = d.op === "reset" ? await db().from("reference").delete().eq("kind", kind).eq("key", r.key) : await db().from("reference").update({ data: d.data, updated_at: new Date().toISOString(), updated_by: r.draft_by, draft: null, draft_by: null, draft_at: null }).eq("kind", kind).eq("key", r.key);
      if (res.error) fail("publishReference", res.error);
      done.push(r.key);
    }
    return done;
  },
  async discardReference(kind, keys) {
    let q = db().from("reference").select("*").eq("kind", kind).not("draft", "is", null);
    if (keys) q = q.in("key", keys);
    const { data, error } = await q;
    if (error) fail("discardReference", error);
    const done: string[] = [];
    for (const r of (data ?? []) as RefRow[]) {
      const res = r.data == null ? await db().from("reference").delete().eq("kind", kind).eq("key", r.key) : await db().from("reference").update({ draft: null, draft_by: null, draft_at: null }).eq("kind", kind).eq("key", r.key);
      if (res.error) fail("discardReference", res.error);
      done.push(r.key);
    }
    return done;
  },
  async upsertReference(kind, key, data, by) {
    const { error } = await db().from("reference").upsert({ kind, key, data, updated_at: new Date().toISOString(), updated_by: by ?? null }, { onConflict: "kind,key" });
    if (error) fail("upsertReference", error);
  },
  async deleteReference(kind, key) {
    const { error } = await db().from("reference").delete().eq("kind", kind).eq("key", key);
    if (error) fail("deleteReference", error);
  },
  // Le journal des espèces : la table est immuable, il n'y a donc ni mise à jour ni suppression.
  async listCash(userId) {
    const { data, error } = await db().from("client_cash").select("*").eq("user_id", userId).order("at", { ascending: true });
    if (error) {
      // Migration 0041 pas encore appliquée : un journal vide vaut mieux qu'une page en erreur.
      if (/client_cash/.test(error.message)) return [];
      fail("listCash", error);
    }
    return (data ?? []).map(toCash);
  },
  async addCash(entry) {
    const row = { user_id: entry.userId, amount: entry.amount, kind: entry.kind, label: entry.label, intent_id: entry.intentId ?? null, due_by: entry.dueBy ?? null, created_by: entry.createdBy ?? null, ...(entry.at ? { at: entry.at } : {}) };
    const { data, error } = await db().from("client_cash").insert(row).select("*").single();
    if (error) fail("addCash", error);
    return toCash(data);
  },

  async listWatches(userId) {
    let q = db().from("watchlist").select("*").order("created_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q;
    if (error) {
      if (/watchlist/.test(error.message)) return []; // migration 0014 not applied yet
      fail("listWatches", error);
    }
    return (data as WatchRow[]).map(toWatch);
  },
  async addWatch(userId, offerId, snapshot) {
    const { data, error } = await db().from("watchlist").upsert({ user_id: userId, offer_id: offerId, last_hero: snapshot.hero, last_status: snapshot.status }, { onConflict: "user_id,offer_id" }).select("*").single();
    if (error) fail("addWatch", error);
    return toWatch(data as WatchRow);
  },
  async removeWatch(userId, offerId) {
    const { error } = await db().from("watchlist").delete().eq("user_id", userId).eq("offer_id", offerId);
    if (error) fail("removeWatch", error);
  },
  async updateWatch(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.lastHero !== undefined) row.last_hero = patch.lastHero;
    if (patch.lastStatus !== undefined) row.last_status = patch.lastStatus;
    if (patch.alertedAt !== undefined) row.alerted_at = patch.alertedAt;
    const { error } = await db().from("watchlist").update(row).eq("id", id);
    if (error) fail("updateWatch", error);
  },
  async getFinancialProfile(userId) {
    const { data, error } = await db().from("profiles").select("financial_profile").eq("id", userId).maybeSingle();
    if (error) fail("getFinancialProfile", error);
    const r = (data ?? {}) as { financial_profile?: FinancialProfile | null };
    return r.financial_profile ?? undefined;
  },
  async setFinancialProfile(userId, p) {
    const { error } = await db().from("profiles").upsert({ id: userId, financial_profile: p }, { onConflict: "id" });
    if (error) fail("setFinancialProfile", error);
  },
  async getPrefs(userId) {
    const { data, error } = await db().from("profiles").select("prefs").eq("id", userId).maybeSingle();
    if (error) fail("getPrefs", error);
    const r = (data ?? {}) as { prefs?: ClientPrefs | null };
    return r.prefs ?? {};
  },
  async setPrefs(userId, p) {
    const cur = await this.getPrefs(userId);
    const { error } = await db().from("profiles").update({ prefs: { ...cur, ...p } }).eq("id", userId);
    if (error) fail("setPrefs", error);
  },
  async listTemplateTexts(docType) {
    let q = db().from("template_texts").select("*").order("doc_type").order("passage").order("version", { ascending: false });
    if (docType) q = q.eq("doc_type", docType);
    const { data, error } = await q;
    if (error) fail("listTemplateTexts", error);
    return (data as TemplateTextRow[]).map(toTemplateText);
  },
  async addTemplateText(t) {
    const { data: prev, error: e0 } = await db().from("template_texts").select("id, version, status").eq("doc_type", t.docType).eq("passage", t.passage);
    if (e0) fail("addTemplateText", e0);
    const rows = (prev ?? []) as { id: string; version: number; status: string }[];
    const version = Math.max(0, ...rows.map((x) => x.version)) + 1;
    if (t.status === "current") {
      const ids = rows.filter((x) => x.status === "current").map((x) => x.id);
      if (ids.length) {
        const { error } = await db().from("template_texts").update({ status: "superseded" }).in("id", ids);
        if (error) fail("addTemplateText", error);
      }
    }
    const { data, error } = await db()
      .from("template_texts")
      .insert({ doc_type: t.docType, passage: t.passage, version, fr: t.fr, en: t.en, status: t.status, by_name: t.by, note: t.note ?? null, approved_by: t.approvedBy ?? null, approved_at: t.approvedAt ?? null })
      .select("*")
      .single();
    if (error) fail("addTemplateText", error);
    return toTemplateText(data as TemplateTextRow);
  },
  async setTemplateTextStatus(id, status, approvedBy) {
    const { data: row, error: e0 } = await db().from("template_texts").select("*").eq("id", id).maybeSingle();
    if (e0) fail("setTemplateTextStatus", e0);
    if (!row) return;
    const r = row as TemplateTextRow;
    if (status === "current") {
      const { error } = await db().from("template_texts").update({ status: "superseded" }).eq("doc_type", r.doc_type).eq("passage", r.passage).eq("status", "current");
      if (error) fail("setTemplateTextStatus", error);
    }
    const patch: Record<string, unknown> = { status };
    if (status === "current") Object.assign(patch, { approved_by: approvedBy ?? null, approved_at: new Date().toISOString() });
    const { error } = await db().from("template_texts").update(patch).eq("id", id);
    if (error) fail("setTemplateTextStatus", error);
  },
  async getConsent(userId) {
    const { data, error } = await db().from("profiles").select("terms_version, terms_accepted_at").eq("id", userId).maybeSingle();
    if (error) fail("getConsent", error);
    const r = (data ?? {}) as { terms_version?: string | null; terms_accepted_at?: string | null };
    return { version: u(r.terms_version), at: u(r.terms_accepted_at) };
  },
  async setConsent(userId, version) {
    const { error } = await db().from("profiles").upsert({ id: userId, terms_version: version, terms_accepted_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) fail("setConsent", error);
  },
  async getChannelStatus(userId) {
    const { data, error } = await db().from("profiles").select("phone, email, phone_verified_at, email_verified_at").eq("id", userId).maybeSingle();
    if (error) fail("getChannelStatus", error);
    const r = (data ?? {}) as { phone?: string | null; email?: string | null; phone_verified_at?: string | null; email_verified_at?: string | null };
    return { phone: u(r.phone), email: u(r.email), phoneVerifiedAt: u(r.phone_verified_at), emailVerifiedAt: u(r.email_verified_at) };
  },
  async markChannelVerified(userId, channel, target) {
    const row = channel === "phone" ? { phone: target, phone_verified_at: new Date().toISOString(), whatsapp_opt_in: true, whatsapp_opt_in_at: new Date().toISOString() } : { email: target, email_verified_at: new Date().toISOString() };
    const { error } = await db().from("profiles").upsert({ id: userId, ...row }, { onConflict: "id" });
    if (error) fail("markChannelVerified", error);
  },
  async createChannelCode(c) {
    await db().from("channel_codes").delete().eq("channel", c.channel).eq("target", c.target).is("verified_at", null);
    const { data, error } = await db().from("channel_codes").insert({ user_id: c.userId ?? null, channel: c.channel, target: c.target, code_hash: c.codeHash, expires_at: c.expiresAt }).select("*").single();
    if (error) fail("createChannelCode", error);
    return toCode(data as CodeRow);
  },
  async findChannelCode(channel, target) {
    const { data, error } = await db().from("channel_codes").select("*").eq("channel", channel).eq("target", target).is("verified_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) fail("findChannelCode", error);
    return data ? toCode(data as CodeRow) : undefined;
  },
  async updateChannelCode(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.attempts !== undefined) row.attempts = patch.attempts;
    if (patch.verifiedAt !== undefined) row.verified_at = patch.verifiedAt;
    const { error } = await db().from("channel_codes").update(row).eq("id", id);
    if (error) fail("updateChannelCode", error);
  },
  async listDevices(userId) {
    const { data, error } = await db().from("trusted_devices").select("*").eq("user_id", userId).order("created_at");
    if (error) fail("listDevices", error);
    return (data as DeviceRow[]).map(toDevice);
  },
  async findDevice(by) {
    let q = db().from("trusted_devices").select("*");
    q = by.id ? q.eq("id", by.id) : q.eq("credential_id", by.credentialId ?? "");
    const { data, error } = await q.maybeSingle();
    if (error) fail("findDevice", error);
    return data ? toDevice(data as DeviceRow) : undefined;
  },
  async addDevice(d) {
    const { data, error } = await db().from("trusted_devices").insert({ user_id: d.userId, kind: d.kind, name: d.name, credential_id: d.credentialId ?? null, public_key: d.publicKey ?? null, counter: d.counter ?? null, secret_hash: d.secretHash ?? null, last_used_at: d.lastUsedAt ?? null }).select("*").single();
    if (error) fail("addDevice", error);
    return toDevice(data as DeviceRow);
  },
  async updateDevice(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.counter !== undefined) row.counter = patch.counter;
    if (patch.failures !== undefined) row.failures = patch.failures;
    if (patch.lastUsedAt !== undefined) row.last_used_at = patch.lastUsedAt;
    if (patch.name !== undefined) row.name = patch.name;
    const { error } = await db().from("trusted_devices").update(row).eq("id", id);
    if (error) fail("updateDevice", error);
  },
  async removeDevice(id, userId) {
    let q = db().from("trusted_devices").delete().eq("id", id);
    if (userId) q = q.eq("user_id", userId);
    const { error } = await q;
    if (error) fail("removeDevice", error);
  },
  async removeDevices(userId, kind) {
    let q = db().from("trusted_devices").delete().eq("user_id", userId);
    if (kind) q = q.eq("kind", kind);
    const { error } = await q;
    if (error) fail("removeDevices", error);
  },
  async updateContact(id, patch) {
    const row: Record<string, string | null> = {};
    if (patch.name) row.display_name = patch.name;
    if (patch.segment) row.segment = patch.segment;
    if (patch.phone) row.phone = patch.phone;
    if (patch.email) row.email = patch.email;
    if (!Object.keys(row).length) return;
    if (patch.phone || patch.email) {
      // A new number or address is a new channel: its proof falls with the old one.
      const { data: cur } = await db().from("profiles").select("phone, email").eq("id", id).maybeSingle();
      const c = (cur ?? {}) as { phone?: string | null; email?: string | null };
      if (patch.phone && c.phone && c.phone !== patch.phone) row.phone_verified_at = null;
      if (patch.email && c.email && c.email !== patch.email) row.email_verified_at = null;
    }
    const { error } = await db().from("profiles").update(row).eq("id", id);
    if (error) fail("updateContact", error);
  },
  async listNotifications(limit = 50) {
    const { data, error } = await db().from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) fail("listNotifications", error);
    return (data as NotifRow[]).map(toNotif);
  },
  async createNotification(n) {
    const { data, error } = await db().from("notifications").insert(fromNotif(n)).select("*").single();
    if (error) fail("createNotification", error);
    return toNotif(data as NotifRow);
  },
  async listInbound(limit = 200) {
    const { data, error } = await db().from("inbound_messages").select("*").order("received_at", { ascending: false }).limit(limit);
    if (error) fail("listInbound", error);
    return (data as InboundRow[]).map(toInbound);
  },
  async createInbound(m) {
    const row = { channel: m.channel, from_address: m.from, contact_name: m.name ?? null, subject: m.subject ?? null, body: m.body, received_at: m.receivedAt ?? new Date().toISOString() };
    const { data, error } = await db().from("inbound_messages").insert(row).select("*").single();
    if (error) fail("createInbound", error);
    return toInbound(data as InboundRow);
  },
  async markInboundHandled(id, by) {
    const { error } = await db().from("inbound_messages").update({ handled_at: new Date().toISOString(), handled_by: by }).eq("id", id);
    if (error) fail("markInboundHandled", error);
  },
  async updateNotification(id, patch) {
    const { data, error } = await db().from("notifications").update(fromNotif(patch)).eq("id", id).select("*").single();
    if (error) fail("updateNotification", error);
    return toNotif(data as NotifRow);
  },

  async listClientFiles() {
    const { data, error } = await db().from("client_files").select("*").order("updated_at", { ascending: false });
    if (error) fail("listClientFiles", error);
    return (data as KycRow[]).map(toKyc);
  },
  async getClientFile(id) {
    const { data, error } = await db().from("client_files").select("*").eq("id", id).maybeSingle();
    if (error) fail("getClientFile", error);
    return data ? toKyc(data as KycRow) : undefined;
  },
  async getClientFileByUser(userId) {
    const { data, error } = await db().from("client_files").select("*").eq("user_id", userId).maybeSingle();
    if (error) fail("getClientFileByUser", error);
    return data ? toKyc(data as KycRow) : undefined;
  },
  async createClientFile(f) {
    const { data, error } = await db().from("client_files").insert(fromKyc(f)).select("*").single();
    if (error) fail("createClientFile", error);
    return toKyc(data as KycRow);
  },
  async updateClientFile(id, patch) {
    const { data, error } = await db().from("client_files").update(fromKyc(patch)).eq("id", id).select("*").single();
    if (error) fail("updateClientFile", error);
    const f = toKyc(data as KycRow);
    // Mirror the essentials onto the profile (name, phone, opt-in, tier).
    await db().from("profiles").update({ display_name: f.identity.name, phone: f.identity.phone ?? null, segment: f.kind, whatsapp_opt_in: Boolean(f.consents.whatsappAt), whatsapp_opt_in_at: f.consents.whatsappAt ?? null, tier: f.status === "approuve" && f.review.custodianAccount ? 2 : 1 }).eq("id", f.userId);
    return f;
  },

  async listBulletins(limit = 30) {
    const { data, error } = await db().from("market_bulletins").select("*").order("session_date", { ascending: false }).limit(limit);
    if (error) fail("listBulletins", error);
    return (data as BulletinRow[]).map(toBulletin);
  },
  async getBulletin(sessionDate) {
    const { data, error } = await db().from("market_bulletins").select("*").eq("session_date", sessionDate).maybeSingle();
    if (error) fail("getBulletin", error);
    return data ? toBulletin(data as BulletinRow) : undefined;
  },
  async upsertBulletin(b) {
    const { data, error } = await db().from("market_bulletins").upsert(fromBulletin(b), { onConflict: "session_date" }).select("*").single();
    if (error) fail("upsertBulletin", error);
    return toBulletin(data as BulletinRow);
  },
  async upsertQuotes(quotes) {
    if (!quotes.length) return;
    const { error } = await db().from("quotes").upsert(quotes.map(fromQuote), { onConflict: "isin,session_date" });
    if (error) fail("upsertQuotes", error);
  },
  async listQuotes(isin, limit = 60) {
    const { data, error } = await db().from("quotes").select("*").eq("isin", isin).order("session_date", { ascending: false }).limit(limit);
    if (error) fail("listQuotes", error);
    return (data as QuoteRow[]).map(toQuote);
  },
  async quotesOn(sessionDate) {
    const { data, error } = await db().from("quotes").select("*").eq("session_date", sessionDate);
    if (error) fail("quotesOn", error);
    return (data as QuoteRow[]).map(toQuote);
  },
  async quoteActivity(since) {
    // Supabase rend mille lignes par appel : une année de séances en compte dix
    // fois plus, et s'arrêter à la première page donnerait un taux calculé sur
    // un dixième du marché, sans que rien ne le signale.
    const out: QuoteActivity[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db().from("quotes").select("isin, session_date, volume_traded, value_traded, trades").gte("session_date", since).range(from, from + 999);
      if (error) fail("quoteActivity", error);
      const page = (data ?? []) as { isin: string; session_date: string; volume_traded: number; value_traded: string | number; trades: number }[];
      out.push(...page.map((r) => ({ isin: r.isin, sessionDate: r.session_date, volumeTraded: Number(r.volume_traded ?? 0), valueTraded: Number(r.value_traded ?? 0), trades: Number(r.trades ?? 0) })));
      if (page.length < 1000) return out;
    }
  },
  async latestQuotes() {
    const { data, error } = await db().from("latest_quotes").select("*");
    if (error) fail("latestQuotes", error);
    return (data as QuoteRow[]).map(toQuote);
  },
  async upsertFundNavs(navs) {
    if (!navs.length) return;
    const { error } = await db().from("fund_navs").upsert(navs.map(fromNav), { onConflict: "fund_key,nav_date" });
    if (error) fail("upsertFundNavs", error);
  },
  async listFundNavs(fundKey, limit = 60) {
    const { data, error } = await db().from("fund_navs").select("*").eq("fund_key", fundKey).order("nav_date", { ascending: false }).limit(limit);
    if (error) fail("listFundNavs", error);
    return (data as NavRow[]).map(toNav);
  },
  async latestFundNavs() {
    const { data, error } = await db().from("latest_fund_navs").select("*").order("name");
    if (error) fail("latestFundNavs", error);
    return (data as NavRow[]).map(toNav);
  },

  async listIssuerDocuments(mnemo) {
    let q = db().from("issuer_documents").select("*").order("year", { ascending: false });
    if (mnemo) q = q.eq("mnemo", mnemo);
    const { data, error } = await q;
    if (error) fail("listIssuerDocuments", error);
    return (data as IssuerDocRow[]).map(toIssuerDoc);
  },
  async upsertIssuerDocument(d) {
    const { data, error } = await db().from("issuer_documents").upsert({ mnemo: d.mnemo, kind: d.kind, year: d.year ?? null, title: d.title, source_url: d.sourceUrl, file_key: d.fileKey ?? null, bytes: d.bytes ?? null, has_text: d.hasText ?? null, collected_at: d.collectedAt }, { onConflict: "source_url" }).select("*").single();
    if (error) fail("upsertIssuerDocument", error);
    return toIssuerDoc(data as IssuerDocRow);
  },
  async listNews() {
    const { data, error } = await db().from("news").select("*").order("published_at", { ascending: false });
    if (error) {
      if (/news/.test(error.message)) return []; // migration 0025 not applied yet
      fail("listNews", error);
    }
    return (data as NewsRow[]).map(toNews);
  },
  async upsertNews(n) {
    const { error } = await db().from("news").upsert(fromNews(n), { onConflict: "id" });
    if (error) fail("upsertNews", error);
  },
  async deleteNews(id) {
    const { error } = await db().from("news").delete().eq("id", id);
    if (error) fail("deleteNews", error);
  },
};

type NewsRow = {
  id: string;
  url: string;
  domain: string;
  title: string;
  title_en: string | null;
  why: string;
  why_en: string | null;
  source: string;
  format: string | null;
  published_at: string;
  rubric: string;
  links: NewsItem["links"];
  featured: boolean;
  status: string;
  visible_until: string | null;
  received_from: string | null;
  note: string | null;
  page_title: string | null;
  link_ok: boolean | null;
  link_checked_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  published_by: string | null;
  version: number;
};
const toNews = (r: NewsRow): NewsItem => ({
  id: r.id,
  url: r.url,
  domain: r.domain,
  title: r.title,
  titleEn: u(r.title_en),
  why: r.why,
  whyEn: u(r.why_en),
  source: r.source,
  format: u(r.format),
  publishedAt: r.published_at,
  rubric: r.rubric as NewsItem["rubric"],
  links: r.links ?? [],
  featured: r.featured,
  status: r.status as NewsItem["status"],
  visibleUntil: u(r.visible_until),
  receivedFrom: u(r.received_from),
  note: u(r.note),
  pageTitle: u(r.page_title),
  linkOk: r.link_ok ?? undefined,
  linkCheckedAt: u(r.link_checked_at),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  updatedBy: u(r.updated_by),
  publishedBy: u(r.published_by),
  version: r.version,
});
const fromNews = (n: NewsItem): NewsRow => ({
  id: n.id,
  url: n.url,
  domain: n.domain,
  title: n.title,
  title_en: n.titleEn ?? null,
  why: n.why,
  why_en: n.whyEn ?? null,
  source: n.source,
  format: n.format ?? null,
  published_at: n.publishedAt,
  rubric: n.rubric,
  links: n.links,
  featured: n.featured,
  status: n.status,
  visible_until: n.visibleUntil ?? null,
  received_from: n.receivedFrom ?? null,
  note: n.note ?? null,
  page_title: n.pageTitle ?? null,
  link_ok: n.linkOk ?? null,
  link_checked_at: n.linkCheckedAt ?? null,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
  updated_by: n.updatedBy ?? null,
  published_by: n.publishedBy ?? null,
  version: n.version,
});
