/**
 * Une courbe datée peut-elle porter un titre déjà remboursé ?
 *
 * L'abscisse est la vie restante, et elle se mesure depuis la séance :
 * échéance moins date de séance. La fenêtre de profondeur, elle, se mesure
 * depuis la date d'observation. Les deux ne parlent donc pas du même jour.
 *
 * Conséquence à vérifier : un bon à trois mois adjugé en 2019 garde une
 * abscisse de trois mois sur une courbe annoncée « observée le 28 septembre
 * 2021 », alors qu'il était remboursé depuis dix-neuf mois ce jour-là.
 *
 *   npx tsx scripts/courbe-echues.mjs [AAAA-MM-JJ] [jours]
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

const on = process.argv[2] ?? "2021-09-28";
const jours = Number(process.argv[3] ?? 1825);
const c = buildCurve(rows, { on, windowDays: jours });
const traces = c.countries.filter((x) => x.points.length >= 2);

const debut = new Date(Date.parse(on) - jours * 86_400_000).toISOString().slice(0, 10);
console.log(`observée le ${on}, profondeur ${jours} jours · la fenêtre part du ${debut}\n`);
console.log(`${"Trésor".padEnd(11)}${"horizon".padEnd(11)}${"séance".padEnd(12)}${"âge".padStart(6)}${"échéance".padStart(13)}   état au jour d'observation`);

let echus = 0;
let total = 0;
for (const p of traces)
  for (const q of p.points.sort((a, b) => a.years - b.years)) {
    total += 1;
    const ech = q.from.maturityOn;
    const etat = !ech ? "échéance non imprimée" : ech < on ? `REMBOURSÉ depuis ${Math.round((Date.parse(on) - Date.parse(ech)) / 86_400_000)} jours` : "vivant";
    if (ech && ech < on) echus += 1;
    const h = q.years < 1 ? `${Math.max(1, Math.round(q.years * 12))} mois` : `${Math.round(q.years * 10) / 10} ans`;
    console.log(`${p.country.padEnd(11)}${h.padEnd(11)}${q.from.sessionOn.padEnd(12)}${String(q.ageDays).padStart(6)}${(ech ?? "—").padStart(13)}   ${etat}`);
  }

console.log(`\n${echus} point(s) sur ${total} portent un titre déjà remboursé au ${on}.`);

/* La même mesure à chaque profondeur : c'est le réglage qui décide. */
console.log(`\npar profondeur, au ${on} :`);
for (const j of [90, 365, 730, 1825]) {
  const k = buildCurve(rows, { on, windowDays: j });
  const pts = k.countries.filter((x) => x.points.length >= 2).flatMap((x) => x.points);
  const morts = pts.filter((q) => q.from.maturityOn && q.from.maturityOn < on).length;
  const sans = pts.filter((q) => !q.from.maturityOn).length;
  console.log(`  ${String(j).padStart(4)} j : ${String(pts.length).padStart(3)} points · ${morts} remboursés · ${sans} sans échéance imprimée`);
}

/* Combien de points se superposent au même horizon, et sur quelle amplitude. */
console.log(`\nempilements au ${on}, profondeur ${jours} jours :`);
for (const p of traces) {
  const par = new Map();
  for (const q of p.points) {
    const h = q.years < 1 ? `${Math.max(1, Math.round(q.years * 12))} mois` : `${Math.round(q.years * 10) / 10} ans`;
    par.set(h, [...(par.get(h) ?? []), q]);
  }
  for (const [h, l] of [...par.entries()].filter(([, l]) => l.length > 1).sort((a, b) => b[1].length - a[1].length)) {
    const pcts = l.map((q) => q.yield.pct);
    const dates = l.map((q) => q.from.sessionOn).sort();
    console.log(
      `  ${p.country.padEnd(11)}${h.padEnd(9)}${String(l.length).padStart(3)} points empilés · de ${dates[0]} à ${dates.at(-1)} · de ${Math.min(...pcts).toFixed(2)} à ${Math.max(...pcts).toFixed(2)} %`,
    );
  }
}
