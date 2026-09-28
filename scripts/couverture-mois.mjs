/**
 * Combien de séances par mois, et où la collecte a des trous.
 *
 * La BEAC annonce un coût moyen des ressources pour juin 2026 ; nous n'avons
 * aucune séance ce mois-là. Avant d'expliquer un écart de méthode, il faut
 * savoir si l'écart vient d'un trou de collecte.
 *
 *   npx tsx scripts/couverture-mois.mjs [depuis AAAA-MM]
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

const depuis = process.argv[2] ?? "2025-07";
const par = new Map();
for (const r of rows) {
  const m = r.sessionOn.slice(0, 7);
  if (m < depuis) continue;
  const e = par.get(m) ?? { n: 0, relues: 0, pays: new Set() };
  e.n += 1;
  if (r.confirmedBy) e.relues += 1;
  e.pays.add(r.country);
  par.set(m, e);
}

/* Les mois vides comptent autant que les autres : c'est eux qu'on cherche. */
const tous = [];
const [a0, m0] = depuis.split("-").map(Number);
const fin = new Date().toISOString().slice(0, 7);
for (let a = a0, m = m0; `${a}-${String(m).padStart(2, "0")}` <= fin; m === 12 ? ((a += 1), (m = 1)) : (m += 1)) tous.push(`${a}-${String(m).padStart(2, "0")}`);

console.log(`${"mois".padEnd(9)}${"séances".padStart(8)}${"relues".padStart(8)}  Trésors`);
for (const m of tous) {
  const e = par.get(m);
  if (!e) {
    console.log(`${m.padEnd(9)}${"0".padStart(8)}${"0".padStart(8)}  AUCUNE SÉANCE`);
    continue;
  }
  console.log(`${m.padEnd(9)}${String(e.n).padStart(8)}${String(e.relues).padStart(8)}  ${[...e.pays].sort().join(", ")}`);
}
const vides = tous.filter((m) => !par.has(m));
console.log(`\n${vides.length} mois sans aucune séance sur ${tous.length}${vides.length ? ` : ${vides.join(", ")}` : ""}`);
