/**
 * Le pourcentage d'une OTA : un prix, ou une décote ?
 *
 * La question décide du sens de toute la courbe. Si 90 % est un prix, un prix
 * plus haut donne un rendement plus bas. Si 90 % est la décote demandée, c'est
 * l'inverse, et tout ce que nous traçons est retourné.
 *
 * Elle se tranche sans opinion, parce qu'un Trésor de la zone imprime les deux
 * nombres côte à côte : le Cameroun publie son prix ET son « taux de rendement ».
 * Il suffit de calculer le rendement dans les deux lectures et de regarder
 * laquelle retombe sur le chiffre qu'il a imprimé lui-même.
 *
 *   node scripts/convention-prix.mjs
 */
import fs from "node:fs";
import { ytm, vieRestante, priceOf } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (await fetch(`${U}/rest/v1/auction_results?select=*&yield_avg=not.is.null&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toAuctionResult);

const fr = (x, d = 2) => (x == null ? "  —  " : x.toFixed(d).padStart(7));
console.log(`${rows.length} séances où le Trésor imprime à la fois un prix et son propre taux de rendement\n`);
console.log("date       durée    prix   coupon  imprimé | lu comme prix | lu comme décote");

let bonPrix = 0;
let bonDecote = 0;
let n = 0;
for (const r of rows.sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))) {
  const p = priceOf(r);
  const vie = vieRestante(r);
  if (!p || !vie || r.couponRate == null || r.yieldAvg == null) continue;

  /** Lecture 1 : le pourcentage est le prix, en % du nominal. */
  const commePrix = ytm(p.pct, r.couponRate, vie.years);
  /**
   * Lecture 2 : le pourcentage est la décote demandée, donc le prix payé vaut
   * cent moins ce pourcentage… ce qui donnerait un titre payé 10 % du nominal.
   * On essaie aussi la lecture « symétrique », prix = 200 − pourcentage, qui
   * est la seule façon de faire qu'un pourcentage plus élevé donne un prix plus
   * bas en restant dans une échelle plausible.
   */
  const commeDecote = ytm(100 - p.pct, r.couponRate, vie.years);
  const commeSymetrique = ytm(200 - p.pct, r.couponRate, vie.years);

  const ecart = (x) => (x == null ? Infinity : Math.abs(x - r.yieldAvg) * 100);
  if (ecart(commePrix) <= 15) bonPrix++;
  if (Math.min(ecart(commeDecote), ecart(commeSymetrique)) <= 15) bonDecote++;
  n++;

  console.log(
    `${r.sessionOn} ${String(r.tenor).padEnd(7)} ${fr(p.pct)} ${fr(r.couponRate)} ${fr(r.yieldAvg)} |` +
      ` ${fr(commePrix)} (${ecart(commePrix) === Infinity ? "—" : Math.round(ecart(commePrix))} pb) |` +
      ` ${fr(commeSymetrique)} (${ecart(commeSymetrique) === Infinity ? "—" : Math.round(ecart(commeSymetrique))} pb)`,
  );
}

console.log(`\nsur ${n} séances, à moins de quinze points de base du chiffre imprimé par le Trésor :`);
console.log(`   lu comme un PRIX    : ${bonPrix}`);
console.log(`   lu comme une DÉCOTE : ${bonDecote}`);
console.log(
  bonPrix > bonDecote
    ? "\nLe pourcentage est un prix : un prix plus haut donne un rendement plus bas."
    : "\nLe pourcentage n'est pas un prix : toute la courbe est à retourner.",
);
