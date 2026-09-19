/**
 * Generates supabase/seed.sql from src/data/seed.ts so the seed exists once.
 * Run: node scripts/seed-sql.ts   (Node ≥ 22.18 strips types natively)
 */
import { writeFileSync } from "node:fs";
import { SEED_INTENTS, SEED_OFFERS } from "../src/data/seed.ts";

const q = (v: unknown): string => {
  if (v === undefined || v === null) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
};

const offerRows = SEED_OFFERS.map((o) =>
  `(${[
    q(o.id), q(o.kind), q(o.operation), q(o.country), q(o.countryName), q(o.issuer), q(o.title), q(o.isin), q(o.status), q(Boolean(o.isExample)), q(o.blurb),
    `${q(JSON.stringify(o.documents))}::jsonb`,
    q(o.opensAt), q(o.deadlineAt), q(o.resultsAt), q(o.settleOn), q(o.maturityOn), q(o.lastCouponOn ?? null),
    q(o.nominal), q(o.couponRate), q(o.precountRate), q(o.pricePct), q(o.priceNote), q(o.rateNote), q(o.servedPricePct), q(o.commissionPct), q(o.minTitles), q(o.sizeLabel),
    q(o.pricePerShare), q(o.minShares), q(o.sharesOffered), q(o.dividendPerShare), q(o.lastPrice), q(o.lastPriceOn),
    q(o.version), q(o.pricedAt), q(o.resultLine),
  ].join(", ")})`,
);

const intentRows = SEED_INTENTS.map((i) =>
  `(${[q(i.ref), q(i.offerId), q(i.offerVersion), q(i.clientName), q(i.clientSegment), q(i.type), q(i.amount), q(i.channel), q(i.message), q(i.state), q(i.createdAt), q(i.updatedAt)].join(", ")})`,
);

const sql = `-- Généré par scripts/seed-sql.ts : ne pas éditer à la main.
insert into offers (id, kind, operation, country, country_name, issuer, title, isin, status, is_example, blurb, documents,
  opens_at, deadline_at, results_at, settle_on, maturity_on, last_coupon_on,
  nominal, coupon_rate, precount_rate, price_pct, price_note, rate_note, served_price_pct, commission_pct, min_titles, size_label,
  price_per_share, min_shares, shares_offered, dividend_per_share, last_price, last_price_on,
  version, priced_at, result_line) values
${offerRows.join(",\n")}
on conflict (id) do nothing;

insert into intents (ref, offer_id, offer_version, client_name, client_segment, type, amount, channel, message, state, created_at, updated_at) values
${intentRows.join(",\n")}
on conflict (ref) do nothing;

select setval('intent_seq', 17);
`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(`seed.sql: ${SEED_OFFERS.length} offres, ${SEED_INTENTS.length} intentions`);
