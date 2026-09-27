/**
 * Notre modèle d'échéancier, confronté au rendement que le Trésor imprime.
 *
 * Le Cameroun publie un « Taux de rendement » à côté de ses prix. Nous ne
 * l'utilisons jamais pour calculer, puisqu'il passe devant le calcul ; mais il
 * fait un étalon : si notre hypothèse (coupon annuel, capital remboursé en une
 * fois à l'échéance) reproduit son chiffre, c'est que le Trésor actualise le
 * même échéancier que nous. Si elle s'en écarte, l'écart mesure ce que nous
 * supposons de travers, et sur quelles durées.
 *
 * C'est la seule vérification d'échéancier disponible sans document
 * d'émission : elle ne prouve rien sur le Congo, qui n'imprime pas de
 * rendement, mais elle dit si le modèle tient dans la zone.
 *
 *   node scripts/verif-modele-in-fine.mjs
 */
import fs from "node:fs";
import { ytm, vieRestante, priceOf } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = await fetch(`${U}/rest/v1/auction_results?select=*&yield_avg=not.is.null&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json());

console.log(`${rows.length} séances portent un rendement imprimé par leur Trésor\n`);
console.log("date       pays      durée    reste  prix   coupon  imprimé  in fine   écart");

const ecarts = [];
for (const r of rows.map(toAuctionResult).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))) {
  const p = priceOf(r);
  const vie = vieRestante(r);
  if (!p || !vie || r.couponRate == null || r.yieldAvg == null) continue;
  const calcule = ytm(p.pct, r.couponRate, vie.years);
  if (calcule == null) continue;
  const bp = (calcule - r.yieldAvg) * 100;
  ecarts.push(bp);
  console.log(
    `${r.sessionOn} ${r.country.padEnd(9)} ${String(r.tenor).padEnd(7)} ${vie.years.toFixed(2).padStart(5)} ` +
      `${p.pct.toFixed(2).padStart(6)} ${r.couponRate.toFixed(2).padStart(6)} ` +
      `${r.yieldAvg.toFixed(2).padStart(8)} ${calcule.toFixed(2).padStart(8)} ${bp.toFixed(1).padStart(7)} pb`,
  );
}

if (!ecarts.length) process.exit(0);
const abs = ecarts.map(Math.abs).sort((a, b) => a - b);
console.log(`\n${ecarts.length} comparaisons · écart médian ${abs[Math.floor(abs.length / 2)].toFixed(1)} pb · pire ${abs.at(-1).toFixed(1)} pb`);
console.log(
  abs.at(-1) < 15
    ? "Le Trésor actualise le même échéancier que nous : coupon annuel, capital in fine."
    : "L'écart est trop grand pour un arrondi : le Trésor n'actualise pas le même échéancier.",
);
