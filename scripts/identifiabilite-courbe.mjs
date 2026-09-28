/**
 * Ce qu'on peut ajuster, Trésor par Trésor.
 *
 * Nelson-Siegel a quatre paramètres : le niveau, la pente, la courbure et la
 * décroissance. La question n'est pas de savoir si on peut écrire la formule,
 * c'est de savoir combien de Trésors ont de quoi la contraindre.
 *
 * Trois choses comptent, et le nombre de points n'est que la première :
 *   - des horizons DISTINCTS, car vingt bons à trois mois ne contraignent
 *     qu'un seul point de la courbe ;
 *   - une AMPLITUDE, car la courbure ne se voit qu'entre un court et un long ;
 *   - de la FRAÎCHEUR, car un ajustement sur cinq ans d'époques mélangées
 *     décrit une moyenne historique et non un coût de l'argent.
 *
 *   npx tsx scripts/identifiabilite-courbe.mjs [AAAA-MM-JJ]
 */
import fs from "node:fs";
import { buildCurve, horizon } from "../src/lib/market/curve.ts";
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
const mot = (y) => {
  const h = horizon(y);
  return `${h.n} ${h.unit}`;
};

/**
 * Le verdict, sur les seuils usuels de l'ajustement de courbe.
 *
 * Quatre paramètres demandent au moins six observations distinctes pour être
 * identifiés, et huit à dix pour être stables. Sous quatre, on ne peut plus
 * estimer qu'un décalage par rapport à une courbe de référence : un paramètre.
 */
const verdict = (n, amplitude) => {
  if (n >= 8 && amplitude >= 8) return "Nelson-Siegel complet";
  if (n >= 6 && amplitude >= 5) return "Nelson-Siegel contraint (λ fixé)";
  if (n >= 4) return "pente et niveau seulement";
  if (n >= 1) return "un écart à la courbe de zone";
  return "rien";
};

for (const jours of [365, 730, 1825]) {
  const c = buildCurve(rows, { on, windowDays: jours });
  console.log(`\n=== fenêtre de ${jours} jours au ${on} ===`);
  console.log(`${"Trésor".padEnd(12)}${"points".padStart(7)}${"horizons".padStart(10)}${"le plus court".padStart(15)}${"le plus long".padStart(14)}${"amplitude".padStart(11)}${"âge médian".padStart(12)}   ce qu'on peut ajuster`);
  for (const p of c.countries) {
    if (!p.points.length) continue;
    const annees = p.points.map((q) => q.years);
    const distincts = new Set(p.points.map((q) => mot(q.years)));
    const court = Math.min(...annees);
    const long = Math.max(...annees);
    const ages = p.points.map((q) => q.ageDays).sort((a, b) => a - b);
    const median = ages[Math.floor(ages.length / 2)];
    const amplitude = long / court;
    console.log(
      `${p.country.padEnd(12)}${String(p.points.length).padStart(7)}${String(distincts.size).padStart(10)}${mot(court).padStart(15)}${mot(long).padStart(14)}${`x${amplitude.toFixed(0)}`.padStart(11)}${`${median} j`.padStart(12)}   ${verdict(distincts.size, amplitude)}`,
    );
  }
}

/* La zone entière, toutes signatures confondues : la forme commune. */
console.log(`\n=== la zone, toutes signatures confondues ===`);
for (const jours of [365, 730, 1825]) {
  const c = buildCurve(rows, { on, windowDays: jours });
  const tous = c.countries.flatMap((p) => p.points);
  const distincts = new Set(tous.map((q) => mot(q.years)));
  const annees = tous.map((q) => q.years);
  console.log(
    `${String(jours).padStart(5)} j : ${String(tous.length).padStart(3)} points · ${String(distincts.size).padStart(2)} horizons distincts · de ${mot(Math.min(...annees))} à ${mot(Math.max(...annees))} · ${verdict(distincts.size, Math.max(...annees) / Math.min(...annees))}`,
  );
}

/* Ce que coûterait le mélange des signatures : l'écart entre Trésors au même horizon. */
console.log(`\n=== ce que le mélange des signatures coûterait (fenêtre 730 j) ===`);
const c = buildCurve(rows, { on, windowDays: 730 });
const par = new Map();
for (const p of c.countries) for (const q of p.points) par.set(mot(q.years), [...(par.get(mot(q.years)) ?? []), { pays: p.country, pct: q.yield.pct }]);
for (const [h, l] of [...par.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const pays = [...new Set(l.map((x) => x.pays))];
  if (pays.length < 2) continue;
  const pcts = l.map((x) => x.pct);
  console.log(`  ${h.padEnd(9)} ${pays.join(", ").padEnd(28)} de ${Math.min(...pcts).toFixed(2)} à ${Math.max(...pcts).toFixed(2)} % · ${Math.round((Math.max(...pcts) - Math.min(...pcts)) * 100)} pb d'écart`);
}
