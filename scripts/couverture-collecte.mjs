/**
 * Ce que la BEAC publie, et ce que nous avons.
 *
 * Le Cameroun n'a chez nous qu'une séance en 2022 et aucune en 2023 ni 2024,
 * puis reprend en 2025. Un Trésor de cette taille ne cesse pas d'emprunter
 * pendant trois ans : ou l'index de la BEAC ne les porte pas, ou nous ne les
 * avons pas ramassées. La différence décide de ce qu'on peut promettre d'une
 * série historique.
 *
 *   node scripts/couverture-collecte.mjs
 */
import fs from "node:fs";
import { parseBeacRows, readBeacDoc, BEAC_ANNONCES } from "../src/lib/market/beac.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const res = await fetch(BEAC_ANNONCES, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } });
const index = parseBeacRows(await res.text()).map(readBeacDoc).filter((d) => d.kind === "resultats" && d.on && d.country);

const nous = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toAuctionResult);
const chezNous = new Set(nous.map((r) => r.sourceUrl));

const annees = [...new Set([...index.map((d) => d.on.slice(0, 4)), ...nous.map((r) => r.sessionOn.slice(0, 4))])].sort();
const pays = [...new Set(index.map((d) => d.country))].sort();

console.log(`${index.length} communiqués de résultats à l'index de la BEAC · ${nous.length} séances chez nous\n`);
console.log("séances de résultats à l'index, par Trésor et par année (manquantes chez nous entre parenthèses)\n");
console.log(`${"".padEnd(13)}${annees.map((a) => a.padStart(8)).join("")}`);
for (const p of pays) {
  const cells = annees.map((a) => {
    const lot = index.filter((d) => d.country === p && d.on.startsWith(a));
    if (!lot.length) return "—".padStart(8);
    const manquantes = lot.filter((d) => !chezNous.has(d.doc.url)).length;
    return `${lot.length}${manquantes ? `(${manquantes})` : ""}`.padStart(8);
  });
  console.log(`${p.padEnd(13)}${cells.join("")}`);
}

const manquantes = index.filter((d) => !chezNous.has(d.doc.url));
console.log(`\n${manquantes.length} communiqués de l'index ne sont pas chez nous`);
if (manquantes.length) {
  const parPays = {};
  for (const d of manquantes) parPays[d.country] = (parPays[d.country] ?? 0) + 1;
  for (const [p, n] of Object.entries(parPays).sort((a, b) => b[1] - a[1])) console.log(`   ${p.padEnd(13)} ${n}`);
  console.log(`\nles dix plus récentes :`);
  for (const d of manquantes.sort((a, b) => b.on.localeCompare(a.on)).slice(0, 10)) console.log(`   ${d.on} ${d.country.padEnd(12)} ${d.instrument ?? "—"} ${d.tenor ?? "—"}`);
}
