/**
 * La ligne rangée à l'envers, nommée.
 *
 * Une seule sur deux cent quarante-neuf, et c'est justement ce qui la rend
 * intéressante : la normalisation vit dans le lecteur automatique, pas à
 * l'entrée de la table. Tout ce qui arrive autrement, une saisie à la main ou
 * une reprise, passe à côté.
 *
 *   npx tsx scripts/borne-tchad.mjs
 */
import fs from "node:fs";
import { auctionYield, priceOf } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const envers = rows.filter(
  (r) => (r.instrument === "OTA" && r.priceMin != null && r.priceMax != null && r.priceMin > r.priceMax) || (r.instrument === "BTA" && r.rateMin != null && r.rateMax != null && r.rateMin > r.rateMax),
);

for (const r of envers) {
  const y = auctionYield(r);
  console.log(`${r.country} · ${r.sessionOn} · ${r.instrument} ${r.tenor} · ${r.codeEmission ?? "sans code"}`);
  console.log(`   priceMin ${r.priceMin} · priceMax ${r.priceMax} · limite ${r.priceLimit ?? "—"} · moyen ${r.priceAvg ?? "—"}`);
  console.log(`   relue par ${r.confirmedBy ?? "personne"} le ${r.confirmedAt?.slice(0, 10) ?? "—"}`);
  console.log(`   prix retenu : ${JSON.stringify(priceOf(r))}`);
  console.log(`   rendement : ${y ? `${y.pct.toFixed(2)} % (${y.origin})` : "aucun"}`);
  console.log(`   source : ${r.sourceUrl ?? "—"}`);
}
if (!envers.length) console.log("aucune ligne à l'envers");

/* Ce que la bascule changerait : le contrôle « le servi tombe dedans ». */
console.log(`\nsi on remettait les bornes dans l'ordre :`);
for (const r of envers) {
  const bas = Math.min(r.priceMin, r.priceMax);
  const haut = Math.max(r.priceMin, r.priceMax);
  for (const [quoi, x] of [["limite", r.priceLimit], ["moyen", r.priceAvg]]) {
    if (x == null) continue;
    const avant = x >= r.priceMin - 0.01 && x <= r.priceMax + 0.01;
    const apres = x >= bas - 0.01 && x <= haut + 0.01;
    console.log(`   ${quoi} ${x} : dans la fourchette telle que stockée ? ${avant ? "oui" : "NON"} · une fois rangée ? ${apres ? "oui" : "NON"}`);
  }
}
