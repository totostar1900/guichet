/**
 * Loads the example offers of src/data/seed.ts into the Supabase project of
 * .env.local (service role, server side only). Lines that the BOC pipeline
 * already produces (real listed shares/bonds) are skipped; existing rows are
 * left untouched. Run: node scripts/seed-supabase.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SEED_OFFERS } from "../src/data/seed.ts";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

// Real secondary-market lines come from the BOC (boc-<isin>): the seed's hand-made ones would duplicate them.
const SKIP = new Set(["mkt-bhc", "mkt-ecmr-2031"]);

const rows = SEED_OFFERS.filter((o) => !SKIP.has(o.id)).map((o) => ({
  id: o.id, kind: o.kind, operation: o.operation, country: o.country, country_name: o.countryName, issuer: o.issuer, title: o.title, isin: o.isin,
  status: o.status, is_example: true, blurb: o.blurb, documents: o.documents, opens_at: o.opensAt, deadline_at: o.deadlineAt,
  results_at: o.resultsAt ?? null, settle_on: o.settleOn, maturity_on: o.maturityOn ?? null, last_coupon_on: o.lastCouponOn ?? null,
  nominal: o.nominal, coupon_rate: o.couponRate ?? null, precount_rate: o.precountRate ?? null, price_pct: o.pricePct ?? null,
  price_note: o.priceNote ?? null, rate_note: o.rateNote ?? null, served_price_pct: o.servedPricePct ?? null, commission_pct: o.commissionPct,
  min_titles: o.minTitles ?? null, size_label: o.sizeLabel ?? null, price_per_share: o.pricePerShare ?? null, min_shares: o.minShares ?? null,
  shares_offered: o.sharesOffered ?? null, dividend_per_share: o.dividendPerShare ?? null, last_price: o.lastPrice ?? null,
  last_price_on: o.lastPriceOn ?? null, market: o.market ?? null, instrument: o.instrument ?? null, bid: o.bid ?? null, ask: o.ask ?? null,
  lot_size: o.lotSize ?? null, settlement_days: o.settlementDays ?? null, price_source: o.priceSource ?? null, hidden: false, fund: o.fund ?? null,
  version: o.version, priced_at: o.pricedAt ?? null, result_line: o.resultLine ?? null,
}));

const { data: existing, error: e1 } = await db.from("offers").select("id").in("id", rows.map((r) => r.id));
if (e1) throw e1;
const have = new Set((existing ?? []).map((r: { id: string }) => r.id));
const fresh = rows.filter((r) => !have.has(r.id));
if (fresh.length) {
  const { error } = await db.from("offers").insert(fresh);
  if (error) throw error;
}
console.log(`offres exemple : ${fresh.length} insérées, ${have.size} déjà présentes, ${SKIP.size} ignorées (lignes BOC).`);
