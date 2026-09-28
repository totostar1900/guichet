/**
 * Ce que le dépouillement déplace, sur les vraies pièces.
 *
 * On attend un effet du bon signe et de l'ordre du sensible : sur une courbe
 * montante, le zéro-coupon d'une obligation longue est au-dessus de son
 * rendement, de quelques dizaines de points de base. Si l'on voyait des
 * centaines, ou le mauvais signe, il faudrait regarder les coupons avant de
 * regarder le code.
 *
 *   npx tsx scripts/depouiller-courbe.mjs [AAAA-MM-JJ] [jours]
 */
import fs from "node:fs";
import { buildCurve, horizon } from "../src/lib/market/curve.ts";
import { derniereParDuree } from "../src/lib/market/lecture-b.ts";
import { depouiller } from "../src/lib/market/zero-coupon.ts";
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
const mot = (y) => { const h = horizon(y); return `${h.n} ${h.unit}`; };

console.log(`observée le ${on} · profondeur ${jours} j · lecture B\n`);
let dep = 0;
let total = 0;
for (const p of buildCurve(rows, { on, windowDays: jours }).countries) {
  const pts = derniereParDuree(p.points.map((q) => ({ mot: mot(q.years), age: q.ageDays, annees: q.years, ytmPct: q.yield.pct, couponPct: q.from.couponRate ?? 0, inst: q.from.instrument })));
  const spots = depouiller(pts);
  if (!spots.length) continue;
  console.log(`${p.country}`);
  for (const s of spots.sort((a, b) => a.annees - b.annees)) {
    total += 1;
    if (s.depouille) dep += 1;
    console.log(
      `   ${mot(s.annees).padEnd(9)} coupon ${s.couponPct.toFixed(2).padStart(5)} % · rendement ${s.ytmPct.toFixed(2).padStart(6)} % · zéro-coupon ${s.spotPct.toFixed(2).padStart(6)} % · ${s.depouille ? `${s.ecartPb > 0 ? "+" : ""}${s.ecartPb} pb` : "tel quel"}`,
    );
  }
}
console.log(`\n${dep} titre(s) dépouillé(s) sur ${total} : les autres n'ont qu'un flux restant.`);
