/**
 * Ce qui manque aux obligations : le prix limite, le prix moyen, ou les deux.
 *
 * Une séance sans prix servi ne donne pas de rendement, et le compte de ces
 * trous décide de ce qu'on peut faire : une poignée se rouvre à la main, la
 * moitié de la série demande une règle.
 *
 *   node scripts/prix-manquants.mjs
 */
import fs from "node:fs";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toAuctionResult);
const ota = rows.filter((r) => r.instrument === "OTA");

const a = (r) => r.priceAvg != null || r.priceAvgFcfa != null;
const l = (r) => r.priceLimit != null;
const borne = (r) => r.priceMin != null || r.priceMax != null;

const cas = {
  "les deux": ota.filter((r) => a(r) && l(r)),
  "moyen seul": ota.filter((r) => a(r) && !l(r)),
  "limite seul": ota.filter((r) => !a(r) && l(r)),
  "ni l'un ni l'autre": ota.filter((r) => !a(r) && !l(r)),
};

console.log(`${ota.length} séances d'obligation\n`);
for (const [k, v2] of Object.entries(cas)) {
  const parPays = {};
  for (const r of v2) parPays[r.country] = (parPays[r.country] ?? 0) + 1;
  console.log(`${String(v2.length).padStart(4)} ${k.padEnd(20)} ${Object.entries(parPays).map(([p, n]) => `${p} ${n}`).join(" · ")}`);
}

const orphelines = cas["ni l'un ni l'autre"];
console.log(`\nparmi les ${orphelines.length} sans aucun prix servi :`);
console.log(`   ${orphelines.filter(borne).length} publient tout de même une fourchette`);
console.log(`   ${orphelines.filter((r) => r.confirmedBy).length} sont relues`);
console.log(`   ${orphelines.filter((r) => r.couponRate != null).length} portent un coupon`);

console.log(`\nles séances qui ne donnent qu'un limite, et ce que la fourchette dit :`);
for (const r of cas["limite seul"].slice(0, 10)) {
  console.log(
    `   ${r.sessionOn} ${r.country.padEnd(11)} ${String(r.tenor).padEnd(8)} limite ${String(r.priceLimit).padStart(7)} · fourchette ${r.priceMin ?? "—"} – ${r.priceMax ?? "—"} · couverture ${r.coverage ?? "—"}`,
  );
}
if (cas["limite seul"].length > 10) console.log(`   … et ${cas["limite seul"].length - 10} autres`);

/**
 * Le moyen pondéré se déduit-il ? Quand tout a été servi au prix limite, les
 * deux se confondent, et la couverture le dit : à cent pour cent servi, il n'y
 * a qu'un prix.
 */
const auLimite = cas["limite seul"].filter((r) => r.served != null && r.announced != null && Math.abs(r.served - r.announced) < r.announced * 0.005);
console.log(`\n${auLimite.length} de ces séances ont servi exactement le montant annoncé`);
