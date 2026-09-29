/**
 * Ce que la confirmation en lot a fait entrer dans les références.
 *
 * Le lot passe par les mêmes contrôles qu'une confirmation unitaire, mais il
 * supprime le coup d'œil pièce par pièce, et c'est exactement le risque que la
 * maison avait écrit. On regarde donc ce qui est entré, et on le compare à ce
 * qui était déjà là au même horizon.
 *
 * Un rendement qui s'écarte de plusieurs centaines de points de base de ses
 * voisins n'est pas forcément faux : la zone porte de vrais écarts de crédit.
 * Mais il mérite qu'on rouvre la pièce avant qu'il ne fonde une indication.
 *
 *   npx tsx scripts/entrees-du-lot.mjs [AAAA-MM-JJ]
 */
import fs from "node:fs";
import { auctionYield } from "../src/lib/market/yield.ts";
import { horizon } from "../src/lib/market/curve.ts";
import { vieRestante } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const depuis = process.argv[2] ?? new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
const neuves = rows.filter((r) => r.confirmedAt && r.confirmedAt.slice(0, 10) >= depuis);
console.log(`${neuves.length} séance(s) confirmées depuis le ${depuis}\n`);

const mot = (r) => {
  const vie = vieRestante(r);
  if (!vie) return "—";
  const h = horizon(vie.years);
  return `${h.n} ${h.unit}`;
};

/* La distribution par horizon, toutes séances relues confondues. */
const par = new Map();
for (const r of rows) {
  const y = auctionYield(r);
  if (!r.confirmedBy || !y) continue;
  const m = mot(r);
  par.set(m, [...(par.get(m) ?? []), { r, pct: y.pct }]);
}

console.log(`LES ENTRÉES QUI S'ÉCARTENT DE LEURS VOISINS AU MÊME HORIZON\n`);
const suspectes = [];
for (const r of neuves) {
  const y = auctionYield(r);
  if (!y) continue;
  const m = mot(r);
  /* Les voisins de la MEME EPOQUE : le court terme camerounais etait a 2 %
     en 2020 et a 6 % aujourd hui, et comparer a travers les regimes fabrique
     des anomalies qui n en sont pas. Deux ans de part et d autre. */
  const an = Number(r.sessionOn.slice(0, 4));
  const voisins = (par.get(m) ?? []).filter((x) => x.r.id !== r.id && Math.abs(Number(x.r.sessionOn.slice(0, 4)) - an) <= 2);
  if (voisins.length < 2) continue;
  const pcts = voisins.map((x) => x.pct).sort((a, b) => a - b);
  const mediane = pcts[Math.floor(pcts.length / 2)];
  const ecart = Math.round((y.pct - mediane) * 100);
  if (Math.abs(ecart) < 250) continue;
  suspectes.push({ r, y, m, mediane, ecart, n: voisins.length });
}
for (const s of suspectes.sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart)))
  console.log(
    `   ${s.r.country.padEnd(11)}${s.r.sessionOn}  ${s.r.instrument} ${String(s.r.tenor).padEnd(12)} ${s.m.padEnd(9)} ${s.y.pct.toFixed(2)} % · médiane des ${s.n} voisins ${s.mediane.toFixed(2)} % · ${s.ecart > 0 ? "+" : ""}${s.ecart} pb\n      origine ${s.y.origin} · ${s.r.codeEmission ?? "sans code"} · ${s.r.sourceUrl?.slice(-70) ?? "—"}`,
  );
if (!suspectes.length) console.log(`   Aucune à plus de 250 points de base de ses voisins.`);

/* Et les valeurs extrêmes du dépôt, quelles qu'elles soient : le lot a pu en
   faire entrer une qui n'a pas de voisin. */
console.log(`\nLES RENDEMENTS EXTRÊMES DU DÉPÔT, TOUTES SÉANCES RELUES\n`);
const tous = rows.filter((r) => r.confirmedBy && auctionYield(r)).map((r) => ({ r, pct: auctionYield(r).pct }));
const tri = [...tous].sort((a, b) => a.pct - b.pct);
for (const x of [...tri.slice(0, 4), ...tri.slice(-4)])
  console.log(
    `   ${x.pct.toFixed(2).padStart(6)} %  ${x.r.country.padEnd(11)}${x.r.sessionOn}  ${x.r.instrument} ${String(x.r.tenor).padEnd(12)} ${mot(x.r).padEnd(9)} ${auctionYield(x.r).origin}${x.r.confirmedAt?.slice(0, 10) >= depuis ? "  ← entrée du lot" : ""}`,
  );
