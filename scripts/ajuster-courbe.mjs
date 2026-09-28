/**
 * Ce que le modèle donne sur les données réelles.
 *
 * Un ajustement qui passe ses tests sur une courbe fabriquée peut encore rendre
 * n'importe quoi sur les nôtres : quinze pour cent à dix ans, une pente
 * inversée par un point aberrant, une bande de huit cents points de base. On
 * regarde avant de publier.
 *
 *   npx tsx scripts/ajuster-courbe.mjs [AAAA-MM-JJ] [jours] [demi-vie]
 */
import fs from "node:fs";
import { buildCurve, horizon } from "../src/lib/market/curve.ts";
import { derniereParDuree, poids } from "../src/lib/market/lecture-b.ts";
import { abouti, ajuster, tauxCourt } from "../src/lib/market/nelson-siegel.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (
  await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: K, Authorization: `Bearer ${K}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const on = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const jours = Number(process.argv[3] ?? 730);
const demiVie = Number(process.argv[4] ?? 180);
const mot = (y) => {
  const h = horizon(y);
  return `${h.n} ${h.unit}`;
};
const USUELS = [0.25, 0.5, 1, 2, 3, 5, 7, 10];

const c = buildCurve(rows, { on, windowDays: jours });
const prep = (p) =>
  derniereParDuree(p.points.map((q) => ({ annees: q.years, pct: q.yield.pct, mot: mot(q.years), age: q.ageDays, mince: q.thin }))).map((q) => ({
    ...q,
    poids: poids(q, { demiVieJours: demiVie || undefined, minces: "sous-ponderer" }),
  }));

console.log(`observée le ${on} · profondeur ${jours} j · demi-vie ${demiVie || "aucune"} j · lecture B\n`);

const zoneObs = c.countries.flatMap(prep);
const zoneR = ajuster(zoneObs);
const zone = abouti(zoneR) ? zoneR : undefined;
console.log(`ZONE : ${zoneObs.length} observations sur ${new Set(zoneObs.map((o) => o.mot)).size} durées`);
if (!zone) {
  console.log(`   pas ajustable`);
  process.exit(0);
}
console.log(`   β₀ ${zone.b0.toFixed(2)} · β₁ ${zone.b1.toFixed(2)} · β₂ ${zone.b2.toFixed(2)} · λ ${zone.lambda.toFixed(2)} · court ${tauxCourt(zone).toFixed(2)} % · écart ${zone.rmsePb.toFixed(0)} pb`);

const ligne = (nom, f, obs) => {
  const durees = new Set(obs.map((o) => o.mot)).size;
  if (!f) return console.log(`${nom.padEnd(11)}${String(durees).padStart(3)} durées   pas ajustable`);
  console.log(
    `${nom.padEnd(11)}${String(durees).padStart(3)} durées   β₀ ${f.b0.toFixed(2).padStart(6)} · β₁ ${f.b1.toFixed(2).padStart(6)} · β₂ ${f.b2.toFixed(2).padStart(6)} · λ ${f.lambda.toFixed(2).padStart(5)} · court ${tauxCourt(f).toFixed(2).padStart(5)} % · écart ${String(Math.round(f.rmsePb)).padStart(3)} pb`,
  );
};

console.log(`\nPAR TRÉSOR, λ emprunté à la zone (${zone.lambda.toFixed(2)})`);
const fits = [];
for (const p of c.countries) {
  const obs = prep(p);
  const rr = ajuster(obs, { lambda: zone.lambda });
  const f = abouti(rr) ? rr : undefined;
  if (!f) console.log(`   (${p.country} : ${rr.refus})`);
  fits.push({ nom: p.country, f, obs });
  ligne(p.country, f, obs);
}

console.log(`\nPAR TRÉSOR, λ propre à chacun`);
for (const p of c.countries) { const rr = ajuster(prep(p)); ligne(p.country, abouti(rr) ? rr : undefined, prep(p)); if (!abouti(rr)) console.log(`   (${p.country} : ${rr.refus})`); }

console.log(`\nLES DURÉES USUELLES, λ de la zone · « ext » = aucune séance à cette durée`);
const ajustes = [{ nom: "CEMAC", f: zone, obs: zoneObs }, ...fits.filter((x) => x.f)];
console.log(`${"durée".padEnd(9)}${ajustes.map((a) => a.nom.padStart(20)).join("")}`);
for (const u of USUELS) {
  const cases = ajustes.map((a) => {
    const hors = u < a.f.borne.court || u > a.f.borne.long;
    return `${a.f.taux(u).toFixed(2)} ±${Math.round(a.f.bande(u) * 100)}${hors ? " ext" : ""}`.padStart(20);
  });
  console.log(`${mot(u).padEnd(9)}${cases.join("")}`);
}

/* Le contrôle qui compte : l'écart entre la courbe et chaque point observé. */
console.log(`\nLES RÉSIDUS DE LA ZONE, en points de base`);
for (const o of [...zoneObs].sort((a, b) => a.annees - b.annees)) {
  const r = Math.round((o.pct - zone.taux(o.annees)) * 100);
  console.log(`   ${mot(o.annees).padEnd(9)} observé ${o.pct.toFixed(2)} % · ajusté ${zone.taux(o.annees).toFixed(2)} % · ${r > 0 ? "+" : ""}${r} pb${o.mince ? " (mince)" : ""}`);
}
