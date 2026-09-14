import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Contact, EventLog, GeneratedDocument, IntakeItem, Intent, IntentState, Notification, Offer } from "@/lib/domain/types";
import type { ClientFile } from "@/lib/domain/kyc";
import { receivedLabel } from "@/lib/domain/intent";
import { fmt } from "@/lib/format";
import { makeRef, type Repository } from "./repository";

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
  version: number;
  priced_at: string | null;
  result_line: string | null;
};

type IntentRow = {
  id: string;
  ref: string;
  offer_id: string;
  offer_version: number;
  client_id: string | null;
  client_name: string;
  client_segment: string;
  type: Intent["type"];
  amount: number | null;
  channel: Intent["channel"];
  message: string | null;
  state: IntentState;
  allocation_pct: number | null;
  served_units: number | null;
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
    version: r.version,
    pricedAt: u(r.priced_at),
    resultLine: u(r.result_line),
  };
}

function toIntent(r: IntentRow): Intent {
  return {
    id: r.id,
    ref: r.ref,
    offerId: r.offer_id,
    offerVersion: r.offer_version,
    clientId: u(r.client_id),
    clientName: r.client_name,
    clientSegment: r.client_segment,
    type: r.type,
    amount: r.amount === null ? null : Number(r.amount),
    channel: r.channel,
    message: u(r.message),
    state: r.state,
    allocationPct: r.allocation_pct === null ? undefined : Number(r.allocation_pct),
    servedUnits: r.served_units === null ? undefined : Number(r.served_units),
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
    last_price_on: o.lastPriceOn ?? null, version: o.version, priced_at: o.pricedAt ?? null, result_line: o.resultLine ?? null,
  };
}

type DocRow = {
  id: string; type: GeneratedDocument["type"]; number: string; title: string; intent_id: string | null; offer_id: string | null; client_name: string | null;
  auction_key: string | null; client_file_id: string | null; client_id: string | null; file_key: string; status: GeneratedDocument["status"]; sent_via: string[] | null; sent_at: string | null; signed_at: string | null;
  created_at: string; created_by: string | null;
};
const toDoc = (r: DocRow): GeneratedDocument => ({
  id: r.id, type: r.type, number: r.number, title: r.title, intentId: u(r.intent_id), offerId: u(r.offer_id), clientName: u(r.client_name),
  auctionKey: u(r.auction_key), clientFileId: u(r.client_file_id), clientId: u(r.client_id), fileKey: r.file_key, status: r.status, sentVia: u(r.sent_via), sentAt: u(r.sent_at), signedAt: u(r.signed_at),
  createdAt: r.created_at, createdBy: u(r.created_by),
});
const fromDoc = (p: Partial<GeneratedDocument>): Partial<DocRow> => {
  const row: Partial<DocRow> = {};
  if (p.type !== undefined) row.type = p.type;
  if (p.number !== undefined) row.number = p.number;
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

type ProfileRow = { id: string; display_name: string | null; segment: string | null; phone: string | null; email: string | null; whatsapp_opt_in: boolean };
const toContact = (r: ProfileRow): Contact => ({ id: r.id, name: r.display_name ?? r.email ?? r.id, segment: r.segment ?? "", phone: u(r.phone), email: u(r.email), whatsappOptIn: r.whatsapp_opt_in });
type NotifRow = {
  id: string; kind: Notification["kind"]; channel: Notification["channel"]; to_address: string; contact_name: string | null; subject: string | null; body: string;
  document_id: string | null; intent_id: string | null; offer_id: string | null; status: Notification["status"]; provider_id: string | null; error: string | null; created_at: string; sent_at: string | null;
};
const toNotif = (r: NotifRow): Notification => ({
  id: r.id, kind: r.kind, channel: r.channel, to: r.to_address, contactName: u(r.contact_name), subject: u(r.subject), body: r.body, documentId: u(r.document_id), intentId: u(r.intent_id),
  offerId: u(r.offer_id), status: r.status, providerId: u(r.provider_id), error: u(r.error), createdAt: r.created_at, sentAt: u(r.sent_at),
});
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
  created_at: string; updated_at: string; submitted_at: string | null;
};
const toKyc = (r: KycRow): ClientFile => ({
  id: r.id, userId: r.user_id, kind: r.kind, status: r.status, identity: r.identity, persons: r.persons ?? [], documents: r.documents ?? [], funds: r.funds,
  profile: r.profile, consents: r.consents ?? {}, review: r.review ?? {}, createdAt: r.created_at, updatedAt: r.updated_at, submittedAt: u(r.submitted_at),
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
  if (p.submittedAt !== undefined) row.submitted_at = p.submittedAt;
  return row;
};

const toEvent = (r: EventRow): EventLog => ({ id: r.id, at: r.at, kind: r.kind, html: r.html, intentId: u(r.intent_id), offerId: u(r.offer_id) });

let client: SupabaseClient | undefined;
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
    const ref = makeRef(input.type, Number(seqData));
    const { data, error } = await db()
      .from("intents")
      .insert({
        ref,
        offer_id: offer.id,
        offer_version: offer.version,
        client_id: input.clientId ?? null,
        client_name: input.clientName,
        client_segment: input.clientSegment,
        type: input.type,
        amount: input.amount ?? null,
        channel: input.channel,
        message: input.message?.trim() || null,
        state: "recue",
      })
      .select("*")
      .single();
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
    if (patch.message !== undefined) row.message = patch.message ?? null;
    const { data, error } = await db().from("intents").update(row).eq("id", id).select("*").single();
    if (error) fail("updateIntent", error);
    return toIntent(data as IntentRow);
  },
  async setIntentState(id, state) {
    const { data, error } = await db().from("intents").update({ state, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
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
  async upsertOffer(offer) {
    const { data, error } = await db().from("offers").upsert(fromOffer(offer)).select("*").single();
    if (error) fail("upsertOffer", error);
    await db().from("offer_versions").upsert({ offer_id: offer.id, version: offer.version, price_pct: offer.pricePct ?? null, precount_rate: offer.precountRate ?? null, commission_pct: offer.commissionPct, min_titles: offer.minTitles ?? null }, { onConflict: "offer_id,version" });
    return toOffer(data as OfferRow);
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
    const { data, error } = await db().from("profiles").select("id, display_name, segment, phone, email, whatsapp_opt_in").eq("role", "client");
    if (error) fail("listContacts", error);
    return (data as ProfileRow[]).map(toContact);
  },
  async getContact(id) {
    const { data, error } = await db().from("profiles").select("id, display_name, segment, phone, email, whatsapp_opt_in").eq("id", id).maybeSingle();
    if (error) fail("getContact", error);
    return data ? toContact(data as ProfileRow) : undefined;
  },
  async setContactOptIn(id, optIn) {
    const { error } = await db().from("profiles").update({ whatsapp_opt_in: optIn, whatsapp_opt_in_at: optIn ? new Date().toISOString() : null }).eq("id", id);
    if (error) fail("setContactOptIn", error);
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
};
