/**
 * Que fait l'application des séances servies à zéro ?
 *
 * Une adjudication qui n'a rien servi n'a pas de prix d'exécution : le Trésor a
 * refusé ce qu'on lui demandait. Un taux qui subsiste sur une telle séance est
 * le taux DEMANDÉ, pas un taux PAYÉ, et le porter sur la courbe reviendrait à
 * publier un prix que personne n'a jamais accepté.
 *
 *   npx tsx scripts/zeros.mjs
 */
import fs from "node:fs";
import { auctionYield, vieRestante } from "../src/lib/market/yield.ts";
import { thin } from "../src/lib/market/auction-results.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const zeros = rows.filter((r) => r.served === 0 || r.bid === 0 || r.bidders === 0);
console.log(`${zeros.length} séances à zéro sur ${rows.length}\n`);
console.log("code               pays      relue  soumis      servi  offres  rendement  mince  sur la courbe");
for (const r of zeros.sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))) {
  const y = auctionYield(r);
  const vie = vieRestante(r);
  console.log(
    (r.codeEmission ?? "—").slice(0, 18).padEnd(18),
    (r.country ?? "").padEnd(9),
    (r.confirmedBy ? "oui" : "non").padEnd(6),
    String(r.bid ?? "—").padStart(10),
    String(r.served ?? "—").padStart(6),
    String(r.bidders ?? "—").padStart(7),
    (y ? `${y.pct.toFixed(3)} % (${y.origin})` : "—").padStart(24),
    (thin(r) ? "oui" : "non").padStart(6),
    /* Un point ne paraît sur la courbe que s'il a un rendement ET une vie restante. */
    (y && vie ? "OUI" : "non").padStart(14),
  );
}

const surLaCourbe = zeros.filter((r) => auctionYield(r) && vieRestante(r));
console.log(`\n${surLaCourbe.length} de ces séances produisent un point de courbe.`);
for (const r of surLaCourbe) {
  console.log(`  ${r.codeEmission} · ${r.country} · ${r.sessionOn} · ${auctionYield(r).pct.toFixed(3)} % · servi ${r.served}, soumis ${r.bid}`);
}
