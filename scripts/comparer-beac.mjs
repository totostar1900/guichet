/**
 * Notre courbe camerounaise contre celle que la BEAC publie.
 *
 * Les chiffres de la BEAC sont relevés dans le tracé vectoriel de son PDF, pas
 * à l'œil sur une image : voir scripts/beac-courbe-extraire.mjs.
 *
 * La comparaison n'est pas de plain-pied et il faut le dire avant de lire le
 * tableau. Sa courbe porte l'encours, rangé par durée d'émission, au 31 juillet
 * 2026. La nôtre porte les adjudications relues, rangées par vie restante, au
 * 29 septembre. Un écart n'accuse donc personne : il mesure deux questions
 * différentes. Ce qu'on regarde est la FORME, et l'endroit où les deux
 * divergent.
 *
 *   npx tsx scripts/comparer-beac.mjs [AAAA-MM-JJ] [jours] [demi-vie]
 */
import fs from "node:fs";
import { buildCurve, horizon } from "../src/lib/market/curve.ts";
import { derniereParDuree, poids } from "../src/lib/market/lecture-b.ts";
import { abouti, ajuster } from "../src/lib/market/nelson-siegel.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

/** Relevé dans le tracé du PDF, statistiques mensuelles n° 60, juillet 2026. */
const BEAC = {
  Cameroun: { 0.25: 6.55, 0.5: 7.35, 1: 8.44, 1.5: 9.08, 2: 9.45, 3: 9.78, 4: 9.89, 5: 9.92, 7: 9.9, 10: 9.88, 15: 9.87 },
  Congo: { 0.25: 6.69, 0.5: 8.0, 1: 9.85, 1.5: 11.05, 2: 11.81, 3: 12.67, 4: 13.08, 5: 13.31, 7: 13.54, 10: 13.69 },
  Gabon: { 0.25: 6.16, 0.5: 7.71, 1: 9.52, 1.5: 10.25, 2: 10.41, 3: 10.03, 4: 9.42, 5: 8.86, 7: 8.08, 10: 7.41 },
};

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const rows = (
  await fetch(`${v("NEXT_PUBLIC_SUPABASE_URL")}/rest/v1/auction_results?select=*&limit=2000`, {
    headers: { apikey: v("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${v("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).then((r) => r.json())
).map(toAuctionResult);

const on = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const jours = Number(process.argv[3] ?? 365);
const demiVie = Number(process.argv[4] ?? 90);
const mot = (y) => {
  const h = horizon(y);
  return `${h.n} ${h.unit}`;
};

const c = buildCurve(rows, { on, windowDays: jours });
const prep = (p) =>
  derniereParDuree(p.points.map((q) => ({ mot: mot(q.years), age: q.ageDays, annees: q.years, pct: q.yield.pct, mince: q.thin }))).map((q) => ({
    annees: q.annees,
    pct: q.pct,
    poids: poids(q, { demiVieJours: demiVie || undefined, minces: "sous-ponderer" }),
  }));

console.log(`notre courbe : observee le ${on}, profondeur ${jours} j, demi-vie ${demiVie} j, lecture B`);
console.log(`la sienne    : encours au 31 juillet 2026, range par duree d'emission, releve dans son trace\n`);

for (const [pays, sien] of Object.entries(BEAC)) {
  const p = c.countries.find((x) => x.country === pays);
  const obs = p ? prep(p) : [];
  const r = obs.length ? ajuster(obs) : { refus: "aucune observation" };
  console.log(`=== ${pays} ===`);
  if (!abouti(r)) {
    console.log(`   notre courbe ne s'ajuste pas : ${r.refus}\n`);
    continue;
  }
  console.log(`   ${obs.length} observations · ecart aux points ${Math.round(r.rmsePb)} pb · durees observees de ${mot(r.borne.court)} a ${mot(r.borne.long)}\n`);
  console.log(`   ${"duree".padEnd(9)}${"BEAC".padStart(9)}${"nous".padStart(9)}${"ecart".padStart(9)}`);
  let somme = 0;
  let n = 0;
  for (const [a, y] of Object.entries(sien)) {
    const t = Number(a);
    const nous = r.taux(t);
    const hors = t < r.borne.court || t > r.borne.long;
    const ecart = Math.round((nous - y) * 100);
    if (!hors) {
      somme += Math.abs(ecart);
      n += 1;
    }
    console.log(`   ${mot(t).padEnd(9)}${y.toFixed(2).padStart(9)}${nous.toFixed(2).padStart(9)}${`${ecart > 0 ? "+" : ""}${ecart}`.padStart(9)}   ${hors ? "extrapole" : ""}`);
  }
  if (n) console.log(`\n   ecart absolu moyen sur les durees que nous observons : ${Math.round(somme / n)} pb\n`);
  else console.log("");
}
