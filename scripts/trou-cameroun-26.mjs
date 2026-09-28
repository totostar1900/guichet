/**
 * Le silence camerounais à vingt-six semaines, daté.
 *
 * Le trait passe au pointillé entre deux séances distantes de plus d'un an. La
 * question du desk est légitime : pourquoi là, et pas ailleurs. La réponse est
 * une date de part et d'autre, et un nombre de jours.
 *
 *   npx tsx scripts/trou-cameroun-26.mjs
 */
import fs from "node:fs";
import { auctionYield } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (
  await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: K, Authorization: `Bearer ${K}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const serie = rows
  .filter((r) => r.country === "Cameroun" && r.confirmedBy && /26/.test(r.tenor ?? "") && auctionYield(r))
  .map((r) => ({ on: r.sessionOn, pct: auctionYield(r).pct }))
  .sort((a, b) => a.on.localeCompare(b.on));

console.log(`Cameroun · ${serie[0]?.on} → ${serie.at(-1)?.on} · ${serie.length} séances relues à 26 semaines\n`);
let pire = null;
for (let i = 1; i < serie.length; i++) {
  const j = Math.round((Date.parse(serie[i].on) - Date.parse(serie[i - 1].on)) / 86_400_000);
  if (!pire || j > pire.j) pire = { j, avant: serie[i - 1], apres: serie[i] };
  if (j > 365) console.log(`trou de ${j} jours : ${serie[i - 1].on} (${serie[i - 1].pct.toFixed(2)} %) → ${serie[i].on} (${serie[i].pct.toFixed(2)} %)`);
}
console.log(`\nle plus long : ${pire.j} jours, de ${pire.avant.on} à ${pire.apres.on}`);
console.log(`les séances rapprochées, elles, s'enchaînent : ${serie.filter((_, i) => i && Math.round((Date.parse(serie[i].on) - Date.parse(serie[i - 1].on)) / 86_400_000) <= 365).length} intervalles sous un an`);

/* Toutes les séances camerounaises, relues ou non, dans la trouée : la question
   est de savoir si c'est notre relecture ou l'index de la BEAC qui manque. */
const dans = rows.filter((r) => r.country === "Cameroun" && r.sessionOn > pire.avant.on && r.sessionOn < pire.apres.on);
console.log(`\ndans la trouée, toutes durées : ${dans.length} séance(s) au dépôt, dont ${dans.filter((r) => r.confirmedBy).length} relue(s)`);
const a26 = dans.filter((r) => /26/.test(r.tenor ?? ""));
console.log(`dont à 26 semaines : ${a26.length}`);
