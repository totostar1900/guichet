/**
 * Le trou camerounais : quatre ans sans point sur la série.
 *
 * Trois causes possibles, et elles n'appellent pas la même réponse. Soit le
 * Trésor n'a pas émis cette durée, et le trou est le marché. Soit il a émis et
 * nous n'avons pas la séance, et le trou est notre collecte. Soit nous l'avons
 * mais elle n'est pas relue, ou ne donne pas de rendement, et le trou est notre
 * travail.
 *
 *   node scripts/trou-cameroun.mjs [pays] [durée]
 */
import fs from "node:fs";
import { serie } from "../src/lib/market/curve.ts";
import { auctionYield } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toAuctionResult);
const relues = rows.filter((r) => r.confirmedBy);

/** Les durées suivies, exactement comme la page les choisit. */
const suivies = [...new Map(relues.map((r) => [`${r.country}|${r.tenor}`, r])).values()]
  .map((r) => ({ pays: r.country, tenor: r.tenor, pts: serie(rows, r.country, r.tenor) }))
  .filter((x) => x.pts.length >= 4)
  .sort((a, b) => b.pts.length - a.pts.length)
  .slice(0, 3);

console.log("les trois durées tracées par la page :\n");
for (const s of suivies) {
  console.log(`${s.pays} ${s.tenor} · ${s.pts.length} points · de ${s.pts[0].on} à ${s.pts[s.pts.length - 1].on}`);
  // Les écarts entre deux points consécutifs : c'est là que se voient les trous.
  const trous = [];
  for (let i = 1; i < s.pts.length; i++) {
    const j = Math.round((Date.parse(s.pts[i].on) - Date.parse(s.pts[i - 1].on)) / 86_400_000);
    if (j > 180) trous.push({ de: s.pts[i - 1].on, a: s.pts[i].on, j });
  }
  for (const t of trous) console.log(`   trou de ${t.j} jours : ${t.de} → ${t.a}`);
}

const pays = process.argv[2] ?? suivies[0]?.pays;
const duree = process.argv[3] ?? suivies[0]?.tenor;
console.log(`\nce que la base porte pour ${pays} ${duree}, relu ou non :\n`);
const toutes = rows.filter((r) => r.country === pays && r.tenor === duree).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
for (const r of toutes) {
  const y = auctionYield(r);
  console.log(
    `   ${r.sessionOn} ${r.confirmedBy ? "relue  " : "attente"} ${y ? `${y.pct.toFixed(2)} % (${y.origine})` : "pas de rendement"}` +
      `${r.priceAvg == null && r.priceLimit == null && r.rateAvg == null && r.rateLimit == null ? " · aucun chiffre servi" : ""}`,
  );
}
console.log(`\n${toutes.length} séances au total · ${toutes.filter((r) => r.confirmedBy).length} relues · ${toutes.filter((r) => auctionYield(r)).length} donnant un rendement`);

/** Et ce que le Trésor a fait sur les autres durées pendant le trou. */
console.log(`\nce que ${pays} a émis entre 2021 et 2025, toutes durées :\n`);
const parAn = {};
for (const r of rows.filter((x) => x.country === pays && x.sessionOn >= "2021-01-01" && x.sessionOn <= "2025-12-31")) {
  const a = r.sessionOn.slice(0, 4);
  parAn[a] = parAn[a] ?? {};
  parAn[a][r.tenor] = (parAn[a][r.tenor] ?? 0) + 1;
}
for (const [a, d] of Object.entries(parAn).sort())
  console.log(`   ${a} · ${Object.entries(d).sort((x, y) => y[1] - x[1]).map(([t, n]) => `${t} ×${n}`).join(" · ")}`);
