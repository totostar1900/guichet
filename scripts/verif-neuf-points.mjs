/**
 * Les neuf points marqués « à contrôler », et ce que la base en dit.
 *
 * Un point porte cette marque quand un champ est arrivé après la confirmation :
 * le plus souvent le coupon, relevé par la machine une fois la colonne créée,
 * et que la personne qui avait signé la séance n'a donc jamais vu. Le contrôle
 * consiste à rouvrir la pièce et à comparer, champ par champ.
 *
 * Ce script n'écrit rien. Il imprime les valeurs et la clef du document, pour
 * que chacune se lise en regard de son communiqué.
 *
 *   node scripts/verif-neuf-points.mjs
 */
import fs from "node:fs";
import { buildCurve } from "../src/lib/market/curve.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json());

const curve = buildCurve(rows.map(toAuctionResult), { windowDays: 365 });
const aVerifier = curve.countries.flatMap((c) => c.points).filter((p) => p.toVerify);

console.log(`${aVerifier.length} points portent « à contrôler » dans la fenêtre de la courbe\n`);
for (const p of aVerifier.sort((a, b) => a.country.localeCompare(b.country) || a.years - b.years)) {
  const r = rows.find((x) => x.id === p.from.id);
  console.log(`${r.session_on} ${r.country} ${String(r.tenor).padEnd(8)} ${r.code_emission ?? "—"}`);
  console.log(`   coupon ${r.coupon_rate ?? "—"} · échéance ${r.maturity_on ?? "—"} · reste ${p.years.toFixed(2)} an(s)`);
  console.log(`   prix min ${r.price_min ?? "—"} max ${r.price_max ?? "—"} limite ${r.price_limit ?? "—"} moyen ${r.price_avg ?? "—"} · rendement imprimé ${r.yield_avg ?? "—"}`);
  console.log(`   rendement retenu ${p.yield.pct.toFixed(2)} % (${p.yield.origin}) · confirmé ${r.confirmed_at} par ${r.confirmed_by} · écrit ${r.updated_at}`);
  console.log(`   ${r.id} · ${r.file_key ?? "aucune pièce"}\n`);
}
