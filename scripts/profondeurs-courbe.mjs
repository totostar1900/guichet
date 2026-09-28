/**
 * Ce que chaque profondeur donne, aujourd'hui.
 *
 * La figure prend par défaut la fenêtre la plus courte, quatre-vingt-dix jours,
 * parce qu'elle donnait autrefois les mêmes points qu'un an. Si les Trésors se
 * taisent un trimestre, cette fenêtre se vide et la figure s'affiche creuse,
 * alors que la section, elle, est décidée sur l'année.
 *
 *   npx tsx scripts/profondeurs-courbe.mjs
 */
import fs from "node:fs";
import { buildCurve } from "../src/lib/market/curve.ts";
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

const MIN_POINTS = 2;
console.log(`${rows.length} séances lues · ${rows.filter((r) => r.confirmedBy).length} relues\n`);
console.log(`${"fenêtre".padEnd(10)}${"Trésors tracés".padStart(16)}${"points".padStart(9)}   le détail`);
for (const jours of [90, 365, 730, 1825]) {
  const c = buildCurve(rows, { windowDays: jours });
  const traces = c.countries.filter((x) => x.points.length >= MIN_POINTS);
  const isoles = c.countries.filter((x) => x.points.length < MIN_POINTS);
  console.log(
    `${`${jours} j`.padEnd(10)}${String(traces.length).padStart(16)}${String(traces.reduce((n, x) => n + x.points.length, 0)).padStart(9)}   ` +
      (traces.map((x) => `${x.country} ${x.points.length}`).join(" · ") || "aucun") +
      (isoles.length ? `   [isolés : ${isoles.map((x) => x.country).join(", ")}]` : ""),
  );
}

/* La séance relue la plus récente : c'est elle qui décide si 90 jours vit. */
const relues = rows.filter((r) => r.confirmedBy).map((r) => r.sessionOn).sort();
const derniere = relues.at(-1);
const jours = Math.round((Date.now() - Date.parse(derniere)) / 86_400_000);
console.log(`\ndernière séance relue : ${derniere}, il y a ${jours} jours`);

/* La zone consolidée n'existe qu'aux horizons portés par deux Trésors au moins. */
import { horizon } from "../src/lib/market/curve.ts";
console.log("\nhorizons partagés, fenêtre par fenêtre :");
for (const jours of [90, 365, 730, 1825]) {
  const c = buildCurve(rows, { windowDays: jours });
  const par = new Map();
  for (const p of c.countries.filter((x) => x.points.length >= MIN_POINTS))
    for (const q of p.points) {
      const h = horizon(q.years);
      const mot = `${h.n} ${h.unit}`;
      par.set(mot, [...(par.get(mot) ?? []), p.country]);
    }
  const partages = [...par.entries()].filter(([, l]) => l.length > 1);
  console.log(`  ${String(jours).padStart(4)} j : ${partages.length} horizon(s) à deux Trésors ou plus` + (partages.length ? ` · ${partages.map(([m, l]) => `${m} (${l.join("+")})`).join(" · ")}` : "   -> la vue CEMAC est vide"));
}
