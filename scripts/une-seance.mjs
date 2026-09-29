/**
 * Une séance, tous ses champs, et le chemin qui mène à son rendement.
 *
 *   npx tsx scripts/une-seance.mjs <code ou id>
 */
import fs from "node:fs";
import { auctionYield, priceOf, vieRestante, ytm } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);
const q = process.argv[2];
for (const r of rows.filter((x) => x.id === q || x.codeEmission?.trim() === q)) {
  const vie = vieRestante(r);
  const p = priceOf(r);
  const y = auctionYield(r);
  console.log(`${r.country} · ${r.sessionOn} · ${r.instrument} ${r.tenor} · ${r.codeEmission}`);
  console.log(`   échéance imprimée ${r.maturityOn ?? "—"} · coupon ${r.couponRate ?? "—"} %`);
  console.log(`   vie restante ${vie ? `${vie.years.toFixed(3)} an (${vie.from})` : "—"}`);
  console.log(`   prix : min ${r.priceMin ?? "—"} · max ${r.priceMax ?? "—"} · limite ${r.priceLimit ?? "—"} · moyen ${r.priceAvg ?? "—"} · en francs ${r.priceAvgFcfa ?? "—"}`);
  console.log(`   taux : min ${r.rateMin ?? "—"} · max ${r.rateMax ?? "—"} · limite ${r.rateLimit ?? "—"} · moyen ${r.rateAvg ?? "—"} · rendement imprimé ${r.yieldAvg ?? "—"}`);
  console.log(`   montants : annoncé ${r.announced ?? "—"} · soumis ${r.bid ?? "—"} · servi ${r.served ?? "—"} · soumissionnaires ${r.bidders ?? "—"}`);
  console.log(`   prix retenu : ${JSON.stringify(p)}`);
  console.log(`   rendement : ${y ? `${y.pct.toFixed(3)} % (${y.origin})` : "aucun"}`);
  if (y?.assumptions?.length) for (const a of y.assumptions) console.log(`      hypothèse : ${a.key}`);
  /* Ce que donnerait la durée annoncée plutôt que l'échéance imprimée. */
  if (r.priceAvg != null && r.couponRate != null) {
    console.log(`   à 2 ans pleins : ${ytm(r.priceAvg, r.couponRate, 2)?.toFixed(3)} %`);
    if (vie) console.log(`   à ${vie.years.toFixed(3)} an : ${ytm(r.priceAvg, r.couponRate, vie.years)?.toFixed(3)} %`);
  }
  console.log(`   relue par ${r.confirmedBy ?? "personne"} · ${r.sourceUrl}`);
}
