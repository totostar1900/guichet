/**
 * Ce que les deux bornes commandent, au-delà de l'affichage.
 *
 * Elles ne sont pas décoratives. priceOf() s'en sert pour trancher une question
 * qui change un rendement publié : quand le prix moyen dépasse la borne haute,
 * il est réputé inclure le coupon couru, et c'est le prix limite qui est retenu
 * à sa place.
 *
 * Une borne mal lue ou mal rangée fait donc basculer ce test dans un sens ou
 * dans l'autre. Ce script chiffre l'écart : que vaudrait le rendement si l'on
 * prenait le prix moyen tel quel, sur les séances où la règle l'a écarté.
 *
 *   npx tsx scripts/bornes-sensibilite.mjs
 */
import fs from "node:fs";
import { auctionYield, priceOf, vieRestante, ytm } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const ota = rows.filter((r) => r.instrument === "OTA");
console.log(`${ota.length} séances OTA\n`);

console.log(`LES SÉANCES OÙ LA BORNE HAUTE DÉCIDE DU RENDEMENT\n`);
console.log(`${"Trésor".padEnd(11)}${"séance".padEnd(12)}${"durée".padEnd(9)}${"borne haute".padStart(12)}${"moyen".padStart(9)}${"limite".padStart(9)}${"retenu".padStart(9)}${"rdt publié".padStart(12)}${"rdt si moyen".padStart(14)}${"écart".padStart(9)}`);

let n = 0;
let cumul = 0;
for (const r of ota) {
  const haut = r.priceMin != null && r.priceMax != null ? Math.max(r.priceMin, r.priceMax) : (r.priceMax ?? r.priceMin);
  if (haut == null || r.priceAvg == null || !(r.priceAvg > haut + 0.01)) continue;
  const p = priceOf(r);
  const y = auctionYield(r);
  const vie = vieRestante(r);
  const yMoyen = vie && r.couponRate != null ? ytm(r.priceAvg, r.couponRate, vie.years) : undefined;
  if (!y) continue;
  n += 1;
  const ecart = yMoyen != null ? Math.round((yMoyen - y.pct) * 100) : undefined;
  if (ecart != null) cumul += Math.abs(ecart);
  console.log(
    `${r.country.padEnd(11)}${r.sessionOn.padEnd(12)}${String(r.tenor).padEnd(9)}${String(haut).padStart(12)}${String(r.priceAvg).padStart(9)}${String(r.priceLimit ?? "—").padStart(9)}${String(p?.pct ?? "—").padStart(9)}${`${y.pct.toFixed(2)} %`.padStart(12)}${(yMoyen != null ? `${yMoyen.toFixed(2)} %` : "—").padStart(14)}${(ecart != null ? `${ecart > 0 ? "+" : ""}${ecart} pb` : "—").padStart(9)}`,
  );
}
console.log(`\n${n} rendement(s) publiés dépendent de la borne haute.`);
if (n) console.log(`écart moyen si la règle basculait : ${Math.round(cumul / n)} points de base.`);

/* Et la réciproque : combien passent tout juste sous la borne. Un centième de
   plus et la règle basculerait dans l'autre sens. */
console.log(`\nLES SÉANCES QUI PASSENT DE JUSTESSE SOUS LA BORNE\n`);
let limite = 0;
for (const r of ota) {
  const haut = r.priceMin != null && r.priceMax != null ? Math.max(r.priceMin, r.priceMax) : (r.priceMax ?? r.priceMin);
  if (haut == null || r.priceAvg == null) continue;
  const marge = haut - r.priceAvg;
  if (marge < 0 || marge > 0.5) continue;
  limite += 1;
  console.log(`   ${r.country.padEnd(11)}${r.sessionOn}  ${String(r.tenor).padEnd(9)} moyen ${r.priceAvg} sous ${haut}, à ${marge.toFixed(2)} point près`);
}
console.log(`\n${limite} séance(s) à moins d'un demi-point de la bascule.`);
