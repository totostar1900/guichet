/**
 * Ce que le crible trouve aujourd'hui, motif par motif, et l'échelle dérivée.
 *
 *   npx tsx scripts/crible-reel.mjs
 */
import fs from "node:fs";
import { cribler, echelleDesPrefixes } from "../src/lib/market/anomalies.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const c = cribler(rows);
console.log(`${c.restent.length} anomalies restantes · ${c.vues} déjà rangées\n`);
const par = {};
for (const a of c.restent) par[a.quoi.key] = (par[a.quoi.key] ?? 0) + 1;
for (const [k, n] of Object.entries(par).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(3)}  ${k}`);

console.log(`\nL'ÉCHELLE DES PRÉFIXES, DÉRIVÉE DU DÉPÔT\n`);
for (const [k, e] of [...echelleDesPrefixes(rows).entries()].sort()) console.log(`   ${k}   ${e.duree.padEnd(14)} ${e.sur}/${e.total}`);
