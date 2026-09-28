/**
 * Ce que la relecture rendrait, Trésor par Trésor.
 *
 * J'ai dit à tort que ce levier était vide. Il l'est sur la fenêtre de trois
 * mois, où six séances attendent et n'apporteraient rien. Il ne l'est pas du
 * tout sur l'historique : le Tchad a quarante-sept séances non relues, la
 * Guinée équatoriale dix-huit, le Congo vingt-trois. Ces trois Trésors sont
 * maigres ou absents de la courbe pour cette seule raison.
 *
 * Le script compte les points que chaque Trésor gagnerait si ses séances en
 * attente étaient signées — en appliquant les mêmes règles, y compris « une
 * ligne, un point ».
 *
 *   node scripts/gain-relecture.mjs
 */
import fs from "node:fs";
import { auctionYield, yieldMissing } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toAuctionResult);

const ligne = (r) => `${r.country}|${r.maturityOn ?? r.tenor}`;
const pays = [...new Set(rows.map((r) => r.country))].sort();

console.log(`${"Trésor".padEnd(13)}${"en attente".padStart(11)}${"calculables".padStart(13)}${"lignes aujourd'hui".padStart(20)}${"après relecture".padStart(17)}`);
let totalAttente = 0;
let totalGain = 0;
for (const p of pays) {
  const siennes = rows.filter((r) => r.country === p);
  const attente = siennes.filter((r) => !r.confirmedBy);
  const calculables = attente.filter((r) => auctionYield(r));
  const avant = new Set(siennes.filter((r) => r.confirmedBy && auctionYield(r)).map(ligne));
  const apres = new Set([...avant, ...calculables.map(ligne)]);
  totalAttente += attente.length;
  totalGain += apres.size - avant.size;
  console.log(
    `${p.padEnd(13)}${String(attente.length).padStart(11)}${String(calculables.length).padStart(13)}${String(avant.size).padStart(20)}${`${apres.size} (+${apres.size - avant.size})`.padStart(17)}`,
  );
}
console.log(`\n${totalAttente} séances en attente · ${totalGain} points de courbe à gagner`);

/* Ce qui resterait muet même signé, et pourquoi : c'est l'autre moitié du sujet. */
console.log(`\nce qui resterait sans rendement même après signature :\n`);
const muettes = {};
for (const r of rows.filter((x) => !x.confirmedBy && !auctionYield(x))) {
  const k = `${r.country} · ${yieldMissing(r) ?? "—"}`;
  muettes[k] = (muettes[k] ?? 0) + 1;
}
for (const [k, n] of Object.entries(muettes).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} ${k}`);
