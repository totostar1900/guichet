/**
 * Les séances relues, brutes, pour une maquette qui calcule vraiment.
 *
 * Une maquette dont les chiffres sont précalculés ne se juge qu'à sa mise en
 * page : dès qu'on touche un interrupteur elle ment ou se fige. Celle-ci
 * emporte les observations et refait le calcul dans le navigateur, comme
 * l'écran. On peut donc juger les réglages en les tournant.
 *
 * Deux cent quelques lignes : c'est petit, et c'est tout ce qu'il faut.
 *
 *   npx tsx scripts/seances-brutes.mjs > seances.json
 */
import fs from "node:fs";
import { auctionYield, vieRestante } from "../src/lib/market/yield.ts";
import { horizon } from "../src/lib/market/curve.ts";
import { thin } from "../src/lib/market/auction-results.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";
import { BEAC_COURBE } from "../src/data/beac-courbe.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const mot = (y) => {
  const h = horizon(y);
  return `${h.n} ${h.unit}`;
};

const seances = [];
for (const r of rows) {
  if (!r.confirmedBy) continue;
  const vie = vieRestante(r);
  const y = auctionYield(r);
  if (!vie || !y) continue;
  seances.push({
    p: r.country,
    on: r.sessionOn,
    a: Number(vie.years.toFixed(4)),
    m: mot(vie.years),
    y: Number(y.pct.toFixed(3)),
    c: Number((r.couponRate ?? 0).toFixed(3)),
    t: thin(r) ? 1 : 0,
    i: r.instrument,
  });
}
seances.sort((x, z) => x.on.localeCompare(z.on));

console.log(
  JSON.stringify({
    arreteLe: new Date().toISOString().slice(0, 10),
    beac: { numero: BEAC_COURBE.numero, mois: BEAC_COURBE.arreteLe.slice(0, 7), source: BEAC_COURBE.source, pays: BEAC_COURBE.pays },
    seances,
  }),
);
