/**
 * Ce que le crible d'anomalies voit aujourd'hui, en passant par le même code
 * que le panneau du desk.
 *
 *   node scripts/anomalies-du-jour.mjs
 */
import fs from "node:fs";
import { cribler } from "../src/lib/market/anomalies.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json());

const { restent, vues } = cribler(rows.map(toAuctionResult));
console.log(`${restent.length} anomalies en attente · ${vues} déjà vérifiées sur la pièce\n`);

/** Les trous de la clef remplis par ses paramètres, pour lire la phrase entière. */
const dire = (q) => Object.entries(q.params ?? {}).reduce((s, [k, x]) => s.split(`{${k}}`).join(String(x)), q.key);

for (const a of restent) {
  console.log(`${a.quand} ${a.pays.padEnd(11)} ${a.instrument} ${String(a.tenor).padEnd(9)} ${a.gravite === "confirmee" ? "RELUE  " : "attente"}`);
  console.log(`   ${dire(a.quoi)}`);
  console.log(`   à vérifier : ${a.verifier}`);
}
