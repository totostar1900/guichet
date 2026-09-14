import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EventLog, Intent, IntentState, Offer } from "@/lib/domain/types";
import { INTENT_LABEL } from "@/lib/domain/intent";
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
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

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
      html: `<b>${INTENT_LABEL[intent.type]}</b> reçue de ${intent.clientName} sur ${offer.title}${intent.amount ? ` · ${fmt(intent.amount)} ${unit}` : ""} · réf. ${intent.ref}`,
    });
    return intent;
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
};
