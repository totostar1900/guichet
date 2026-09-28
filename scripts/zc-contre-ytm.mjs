/**
 * L'ajustement tient-il mieux sur des taux dépouillés que sur des rendements ?
 *
 * C'est la question qui justifie la phase : Nelson-Siegel modélise une structure
 * par terme, c'est-à-dire des taux zéro-coupon. Lui donner des rendements à
 * l'échéance, qui dépendent du coupon de chaque titre, lui demande d'expliquer
 * par la durée une dispersion qui vient d'ailleurs. Si le dépouillement sert à
 * quelque chose, l'écart aux points doit baisser.
 *
 *   npx tsx scripts/zc-contre-ytm.mjs [AAAA-MM-JJ] [jours]
 */
import fs from "node:fs";
import { buildCurve, horizon } from "../src/lib/market/curve.ts";
import { derniereParDuree } from "../src/lib/market/lecture-b.ts";
import { depouiller } from "../src/lib/market/zero-coupon.ts";
import { abouti, ajuster } from "../src/lib/market/nelson-siegel.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const on = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const jours = Number(process.argv[3] ?? 730);
const mot = (y) => {
  const h = horizon(y);
  return `${h.n} ${h.unit}`;
};

const c = buildCurve(rows, { on, windowDays: jours });
const prep = (p) => derniereParDuree(p.points.map((q) => ({ mot: mot(q.years), age: q.ageDays, annees: q.years, ytmPct: q.yield.pct, couponPct: q.from.couponRate ?? 0 })));

const dit = (nom, r) => (abouti(r) ? `${String(Math.round(r.rmsePb)).padStart(4)} pb · λ ${r.lambda.toFixed(2)} · β₀ ${r.b0.toFixed(2)}` : `refusé : ${r.refus}`);

console.log(`observée le ${on} · profondeur ${jours} j · lecture B\n`);
console.log(`${"Trésor".padEnd(12)}${"sur rendements".padEnd(34)}${"sur zéro-coupon".padEnd(34)}`);

const zcTous = [];
const ytmTous = [];
for (const p of c.countries) {
  const pts = prep(p);
  if (!pts.length) continue;
  const spots = depouiller(pts);
  const ytm = pts.map((q) => ({ annees: q.annees, pct: q.ytmPct }));
  const zc = spots.map((s) => ({ annees: s.annees, pct: s.spotPct }));
  ytmTous.push(...ytm);
  zcTous.push(...zc);
  console.log(`${p.country.padEnd(12)}${dit(p.country, ajuster(ytm)).padEnd(34)}${dit(p.country, ajuster(zc)).padEnd(34)}`);
}
console.log(`${"ZONE".padEnd(12)}${dit("zone", ajuster(ytmTous)).padEnd(34)}${dit("zone", ajuster(zcTous)).padEnd(34)}`);
