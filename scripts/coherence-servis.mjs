/**
 * Le moyen servi ne peut pas être pire que le limite.
 *
 * Contrôle interne, sans rouvrir une pièce. Dans une adjudication à prix
 * multiples, le prix limite est celui du dernier soumissionnaire servi, donc le
 * PLUS BAS des prix retenus ; le prix moyen pondéré est la moyenne des retenus.
 * On a donc nécessairement moyen >= limite pour une obligation.
 *
 * Pour un bon, la borne est un taux et le sens s'inverse : le taux limite est
 * le plus HAUT des taux retenus, donc moyen <= limite.
 *
 * Une violation ne peut venir que de trois choses : deux colonnes échangées,
 * un chiffre mal lu, ou une convention que nous n'avons pas comprise. Les trois
 * méritent qu'on rouvre la pièce, et aucune ne se voit autrement.
 *
 *   npx tsx scripts/coherence-servis.mjs
 */
import fs from "node:fs";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const TOL = 0.01;
console.log(`${rows.length} séances\n`);

console.log(`1. MOYEN CONTRE LIMITE\n`);
const fautes = [];
for (const r of rows) {
  if (r.instrument === "OTA" && r.priceAvg != null && r.priceLimit != null && r.priceAvg < r.priceLimit - TOL)
    fautes.push({ r, dit: `prix moyen ${r.priceAvg} SOUS le prix limite ${r.priceLimit}` });
  if (r.instrument === "BTA" && r.rateAvg != null && r.rateLimit != null && r.rateAvg > r.rateLimit + TOL)
    fautes.push({ r, dit: `taux moyen ${r.rateAvg} AU-DESSUS du taux limite ${r.rateLimit}` });
}
if (!fautes.length) console.log(`   Aucune. Le servi est cohérent partout où les deux chiffres existent.`);
for (const f of fautes)
  console.log(`   ${f.r.country.padEnd(11)}${f.r.sessionOn}  ${f.r.instrument} ${String(f.r.tenor).padEnd(12)} ${f.dit}${f.r.confirmedBy ? ` · RELUE par ${f.r.confirmedBy}` : " · en attente"}`);
console.log(`\n   ${fautes.length} incohérence(s).`);

console.log(`\n2. LE LIMITE TOMBE-T-IL DANS LA FOURCHETTE ?\n`);
const horsBornes = [];
for (const r of rows) {
  const [a, b, x, quoi] = r.instrument === "BTA" ? [r.rateMin, r.rateMax, r.rateLimit, "taux limite"] : [r.priceMin, r.priceMax, r.priceLimit, "prix limite"];
  if (a == null || b == null || x == null) continue;
  const bas = Math.min(a, b);
  const haut = Math.max(a, b);
  if (x < bas - TOL || x > haut + TOL) horsBornes.push({ r, dit: `${quoi} ${x} hors de [${bas} ; ${haut}]` });
}
if (!horsBornes.length) console.log(`   Aucun.`);
for (const f of horsBornes)
  console.log(`   ${f.r.country.padEnd(11)}${f.r.sessionOn}  ${f.r.instrument} ${String(f.r.tenor).padEnd(12)} ${f.dit}${f.r.confirmedBy ? " · RELUE" : " · en attente"}`);
console.log(`\n   ${horsBornes.length} hors fourchette.`);

console.log(`\n3. LA FILE OTA EN ATTENTE\n`);
const attenteOta = rows.filter((r) => !r.confirmedBy && r.instrument === "OTA");
const enversAttente = attenteOta.filter((r) => r.priceMin != null && r.priceMax != null && r.priceMin > r.priceMax);
const uneBorne = attenteOta.filter((r) => (r.priceMin == null) !== (r.priceMax == null));
console.log(`   ${attenteOta.length} OTA en attente de relecture`);
console.log(`   ${enversAttente.length} stockée(s) à l'envers`);
console.log(`   ${uneBorne.length} avec une seule borne`);
console.log(`   ${attenteOta.filter((r) => r.readAt).length} déjà passée(s) sous le lecteur automatique`);
for (const r of attenteOta) {
  const f = r.priceMin != null && r.priceMax != null ? `[${r.priceMin} ; ${r.priceMax}]` : "pas de fourchette";
  console.log(`   ${r.country.padEnd(11)}${r.sessionOn}  ${String(r.tenor).padEnd(10)} ${f.padEnd(20)} limite ${String(r.priceLimit ?? "—").padStart(7)} · moyen ${String(r.priceAvg ?? "—").padStart(7)}${r.readAt ? "" : " · jamais lue"}`);
}

console.log(`\n4. LES OTA DÉJÀ RELUES, ET CE QU'UN CORRECTIF TOUCHERAIT\n`);
const relueOta = rows.filter((r) => r.confirmedBy && r.instrument === "OTA");
const envers = relueOta.filter((r) => r.priceMin != null && r.priceMax != null && r.priceMin > r.priceMax);
console.log(`   ${relueOta.length} OTA relues`);
console.log(`   ${envers.length} dont les colonnes sont échangées`);
for (const r of envers) console.log(`      ${r.country} ${r.sessionOn} ${r.tenor} : priceMin ${r.priceMin}, priceMax ${r.priceMax}`);
console.log(`\n   Un échange de colonnes ne change aucun nombre. Reste à savoir si un chiffre`);
console.log(`   publié en dépend : fourchette() et priceOf() prennent tous deux le min et le`);
console.log(`   max par leur valeur, donc non. Le correctif est cosmétique, pas comptable.`);
