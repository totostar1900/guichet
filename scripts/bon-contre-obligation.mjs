/**
 * Le bon d'un Trésor contre l'obligation du même Trésor, au même horizon.
 *
 * C'est le contrôle le plus dur qui existe sans ouvrir une pièce. Un écart de
 * crédit se mesure entre deux signatures ; entre un bon et une obligation du
 * MÊME État, à la même échéance et à la même date, il ne reste rien à expliquer
 * par le crédit. Un écart de plusieurs centaines de points de base n'est donc
 * pas une courbe, c'est une contradiction.
 *
 * Le soupçon vient du Congo. Ses obligations abondées se servent toutes autour
 * de 90, quelle que soit la vie qui leur reste, et un prix de 90 sur une ligne
 * à un an et demi donne seize pour cent quand le même prix sur trois ans en
 * donne dix. Pendant ce temps ses bons à un an partent à 7,5 %.
 *
 * Deux lectures, et il faut trancher avant de publier une courbe congolaise :
 * soit le Trésor paie réellement neuf cents points de base de plus sur son
 * papier long que sur son papier court, soit une échéance a été lue avec un
 * chiffre de travers.
 *
 *   npx tsx scripts/bon-contre-obligation.mjs [écart minimum en pb]
 */
import fs from "node:fs";
import { auctionYield, vieRestante, ytm } from "../src/lib/market/yield.ts";
import { horizon } from "../src/lib/market/curve.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const seuil = Number(process.argv[2] ?? 300);
const JOURS = 180;

const util = rows
  .filter((r) => r.confirmedBy)
  .map((r) => ({ r, vie: vieRestante(r), y: auctionYield(r) }))
  .filter((x) => x.vie && x.y);

const mot = (a) => {
  const h = horizon(a);
  return `${h.n} ${h.unit}`;
};

console.log(`${util.length} séances relues avec un rendement · seuil ${seuil} pb · voisinage ${JOURS} jours\n`);
const paires = [];
for (const o of util.filter((x) => x.r.instrument === "OTA")) {
  for (const b of util.filter((x) => x.r.instrument === "BTA" && x.r.country === o.r.country)) {
    const jours = Math.abs(Date.parse(o.r.sessionOn) - Date.parse(b.r.sessionOn)) / 86_400_000;
    if (jours > JOURS) continue;
    /* Les horizons doivent être voisins : à vingt pour cent près. */
    if (Math.abs(Math.log(o.vie.years / b.vie.years)) > 0.2) continue;
    const ecart = Math.round((o.y.pct - b.y.pct) * 100);
    if (Math.abs(ecart) < seuil) continue;
    paires.push({ o, b, jours: Math.round(jours), ecart });
  }
}

const vues = new Set();
for (const p of paires.sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))) {
  if (vues.has(p.o.r.id)) continue;
  vues.add(p.o.r.id);
  const annonce = Number(/(\d+)\s*an/.exec(p.o.r.tenor ?? "")?.[1] ?? 0);
  const plein = annonce && p.o.r.priceAvg != null && p.o.r.couponRate != null ? ytm(p.o.r.priceAvg, p.o.r.couponRate, annonce) : undefined;
  console.log(`${p.o.r.country} · obligation du ${p.o.r.sessionOn}, ${p.o.r.tenor}, ${p.o.r.codeEmission ?? "sans code"}`);
  console.log(`   échéance ${p.o.r.maturityOn ?? "—"} → ${mot(p.o.vie.years)} à courir · prix ${p.o.r.priceAvg ?? p.o.r.priceLimit} · coupon ${p.o.r.couponRate ?? "—"} % → ${p.o.y.pct.toFixed(2)} %`);
  console.log(`   son bon du ${p.b.r.sessionOn}, ${mot(p.b.vie.years)} à courir → ${p.b.y.pct.toFixed(2)} %  (${p.jours} jours d'écart)`);
  console.log(`   écart ${p.ecart > 0 ? "+" : ""}${p.ecart} pb entre deux papiers du même État au même horizon`);
  if (plein != null) console.log(`   si l'échéance était à ${annonce} ans pleins : ${plein.toFixed(2)} %, soit ${Math.round((plein - p.b.y.pct) * 100)} pb du bon`);
  console.log(`   ${p.o.r.sourceUrl}\n`);
}
console.log(`${vues.size} obligation(s) en contradiction avec les bons de leur propre Trésor.`);
