/**
 * Y a-t-il des séances dont les bornes sont rangées à l'envers ?
 *
 * Le Trésor congolais imprime « maximum 90,00 » puis « minimum 93,00 ». La
 * question est de savoir si nous avons recopié ses étiquettes ou trié les
 * valeurs à l'ingestion : dans le premier cas la règle du coupon couru se
 * trompait sur des séances réelles, dans le second le tri ajouté au calcul est
 * une protection et non une correction. Ce n'est pas la même phrase à écrire.
 *
 *   node scripts/bornes-a-lenvers.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json());

const n = (x) => (x == null ? null : Number(x));
const envers = [];
const horsHaut = [];
for (const r of rows) {
  const [lo, hi] = r.instrument === "BTA" ? [n(r.rate_min), n(r.rate_max)] : [n(r.price_min), n(r.price_max)];
  if (lo != null && hi != null && lo > hi + 1e-9) envers.push({ r, lo, hi });
  const avg = n(r.price_avg);
  if (r.instrument === "OTA" && avg != null && lo != null && hi != null && avg > Math.max(lo, hi) + 0.01) horsHaut.push({ r, avg, haut: Math.max(lo, hi), etiquette: hi });
}

console.log(`${rows.length} séances\n`);
console.log(`bornes rangées à l'envers (min > max) : ${envers.length}`);
for (const e of envers.slice(0, 15)) console.log(`   ${e.r.session_on} ${e.r.country} ${e.r.tenor} · min ${e.lo} max ${e.hi}`);

console.log(`\nprix moyen au-dessus du haut réel de la fourchette : ${horsHaut.length}`);
for (const e of horsHaut) {
  const change = e.haut !== e.etiquette ? "  ← le tri change le verdict" : "";
  console.log(`   ${e.r.session_on} ${e.r.country} ${String(e.r.tenor).padEnd(8)} moyen ${e.avg} > haut ${e.haut} (étiquette max ${e.etiquette})${change}`);
}
