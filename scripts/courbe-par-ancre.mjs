/**
 * Ce que chaque date d'observation donne, à la profondeur par défaut.
 *
 * La figure s'ouvre sur quatre-vingt-dix jours. Reculer la date d'observation
 * de deux ans demande la courbe telle qu'elle était : si aucune séance relue ne
 * tombe dans le trimestre qui précède cette date, il n'y a rien à tracer.
 *
 * La question posée ici est celle de l'écran : à quelles ancres la figure est
 * vide, et à quelle profondeur elle reviendrait.
 *
 *   npx tsx scripts/courbe-par-ancre.mjs
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
const aujourdHui = new Date().toISOString().slice(0, 10);
const recul = (mois) => {
  const d = new Date(aujourdHui);
  d.setMonth(d.getMonth() - mois);
  return d.toISOString().slice(0, 10);
};
const ancres = [
  ["Aujourd'hui", aujourdHui],
  ["il y a 3 mois", recul(3)],
  ["il y a 6 mois", recul(6)],
  ["il y a 1 an", recul(12)],
  ["il y a 2 ans", recul(24)],
  ["il y a 3 ans", recul(36)],
  ["il y a 5 ans", recul(60)],
];

const points = (on, jours) =>
  buildCurve(rows, { windowDays: jours, on })
    .countries.filter((c) => c.points.length >= MIN_POINTS)
    .reduce((n, c) => n + c.points.length, 0);

console.log(`${"ancre".padEnd(16)}${"date".padEnd(13)}${"90 j".padStart(7)}${"1 an".padStart(7)}${"2 ans".padStart(7)}${"5 ans".padStart(7)}   à l'ouverture`);
for (const [mot, le] of ancres) {
  const n = [90, 365, 730, 1825].map((j) => points(le, j));
  console.log(
    `${mot.padEnd(16)}${le.padEnd(13)}${n.map((x) => String(x).padStart(7)).join("")}   ` +
      (n[0] > 0 ? "une courbe" : n.some((x) => x > 0) ? "RIEN (mais une profondeur plus large en a)" : "rien à aucune profondeur"),
  );
}
