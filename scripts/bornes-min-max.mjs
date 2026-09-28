/**
 * Les deux bornes, et ce qu'elles disent vraiment.
 *
 * Un bon et une obligation n'emploient pas le même canevas dans le même sens.
 *
 * Pour un bon, la borne est un taux. Le taux le plus haut est à la fois le plus
 * grand nombre et le plus coûteux pour l'émetteur : nommer par la valeur ou
 * nommer par le coût donne le même ordre, et il n'y a pas d'ambiguïté.
 *
 * Pour une obligation, la borne est un prix en pourcentage du nominal, et les
 * deux façons de nommer s'opposent. À 90 l'émetteur reçoit 90 et remboursera
 * 100 ; à 95 il reçoit 95. Le prix le plus bas est le plus coûteux pour lui,
 * donc son « maximum ». Un même canevas, deux lectures contraires.
 *
 * Nous rangeons en interne par la valeur : priceMin contient le plus petit
 * prix. Ce script vérifie que cette normalisation a bien pris sur tout le
 * dépôt, et surtout il fait le seul contrôle indépendant dont nous disposions :
 * le prix servi doit tomber DANS la fourchette. Une borne mal rangée ou mal lue
 * s'y voit sans qu'on ait à rouvrir le communiqué.
 *
 *   npx tsx scripts/bornes-min-max.mjs
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

const pays = [...new Set(rows.map((r) => r.country))].sort();

console.log(`${rows.length} séances\n`);
console.log(`1. LA NORMALISATION A-T-ELLE PRIS ?\n`);
console.log(`${"Trésor".padEnd(12)}${"OTA à 2 bornes".padStart(16)}${"min > max".padStart(11)}${"BTA à 2 bornes".padStart(16)}${"min > max".padStart(11)}`);
let malRangees = 0;
for (const p of pays) {
  const s = rows.filter((r) => r.country === p);
  const ota = s.filter((r) => r.instrument === "OTA" && r.priceMin != null && r.priceMax != null);
  const bta = s.filter((r) => r.instrument === "BTA" && r.rateMin != null && r.rateMax != null);
  const otaKo = ota.filter((r) => r.priceMin > r.priceMax);
  const btaKo = bta.filter((r) => r.rateMin > r.rateMax);
  malRangees += otaKo.length + btaKo.length;
  console.log(`${p.padEnd(12)}${String(ota.length).padStart(16)}${String(otaKo.length).padStart(11)}${String(bta.length).padStart(16)}${String(btaKo.length).padStart(11)}`);
}
console.log(`\n   ${malRangees} ligne(s) stockée(s) à l'envers.`);

/**
 * Le seul contrôle indépendant : le chiffre servi tombe-t-il dans la fourchette ?
 *
 * Le prix limite est celui du dernier soumissionnaire servi, le prix moyen la
 * moyenne des servis : tous deux sont nécessairement entre les deux bornes
 * proposées. Hors de la fourchette, c'est qu'une borne est fausse ou que le
 * servi l'est, et dans les deux cas il faut rouvrir la pièce.
 */
console.log(`\n2. LE SERVI TOMBE-T-IL DANS LA FOURCHETTE ?\n`);
const dehors = [];
for (const r of rows) {
  const [lo, hi, unit] = r.instrument === "BTA" ? [r.rateMin, r.rateMax, "taux"] : [r.priceMin, r.priceMax, "prix"];
  if (lo == null || hi == null) continue;
  const bas = Math.min(lo, hi);
  const haut = Math.max(lo, hi);
  const servis = r.instrument === "BTA" ? [["limite", r.rateLimit], ["moyen", r.rateAvg]] : [["limite", r.priceLimit], ["moyen", r.priceAvg]];
  for (const [quoi, x] of servis) {
    if (x == null) continue;
    /* Une tolérance d'un centième : les pièces arrondissent. */
    if (x < bas - 0.01 || x > haut + 0.01) dehors.push({ r, quoi, x, bas, haut, unit });
  }
}
if (!dehors.length) console.log(`   Aucun. Sur toutes les séances à deux bornes, le servi tombe dedans.`);
for (const d of dehors.slice(0, 20))
  console.log(
    `   ${d.r.country.padEnd(11)}${d.r.sessionOn}  ${d.r.instrument} ${String(d.r.tenor).padEnd(12)} ${d.unit} ${d.quoi} ${d.x} hors de [${d.bas} ; ${d.haut}]${d.r.confirmedBy ? " · RELUE" : ""}`,
  );
if (dehors.length > 20) console.log(`   … et ${dehors.length - 20} autres`);
console.log(`\n   ${dehors.length} séance(s) dont un chiffre servi sort de sa fourchette.`);

/* Combien de séances portent réellement une fourchette : la portée du sujet. */
console.log(`\n3. LA PORTÉE DU SUJET\n`);
const ota = rows.filter((r) => r.instrument === "OTA");
const avecDeux = ota.filter((r) => r.priceMin != null && r.priceMax != null);
const uneSeule = ota.filter((r) => (r.priceMin == null) !== (r.priceMax == null));
console.log(`   ${ota.length} séances OTA au dépôt`);
console.log(`   ${avecDeux.length} portent les deux bornes`);
console.log(`   ${uneSeule.length} n'en portent qu'une : leur libellé d'origine est alors indevinable`);
console.log(`   ${ota.filter((r) => r.priceMin == null && r.priceMax == null).length} n'en portent aucune`);
const ecarts = avecDeux.map((r) => Math.abs(r.priceMax - r.priceMin)).sort((a, b) => a - b);
if (ecarts.length) console.log(`   écart entre bornes : médiane ${ecarts[Math.floor(ecarts.length / 2)].toFixed(2)} points, maximum ${ecarts.at(-1).toFixed(2)}`);
