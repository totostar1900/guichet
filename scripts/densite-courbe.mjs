/**
 * Combien de points la courbe gagnerait, et à quel prix.
 *
 * Trois leviers, et ils ne se valent pas :
 *
 *   élargir la fenêtre d'observation, qui peuple la courbe avec des séances
 *   plus vieilles — donc avec des prix qui ne sont plus ceux d'aujourd'hui ;
 *
 *   relire les séances qui attendent, qui ajoute des points sans rien supposer,
 *   puisque la donnée est déjà là et signée par un Trésor ;
 *
 *   compléter les coupons manquants, qui débloque des séances dont le prix est
 *   connu mais dont le rendement ne se calcule pas.
 *
 * Le premier coûte de la vérité, les deux autres coûtent du travail. Ce script
 * chiffre les trois pour que l'arbitrage se fasse sur des nombres.
 *
 *   node scripts/densite-courbe.mjs
 */
import fs from "node:fs";
import { buildCurve, MIN_POINTS } from "../src/lib/market/curve.ts";
import { auctionYield } from "../src/lib/market/yield.ts";
import { toAuctionResult } from "../src/lib/data/supabase.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = (await fetch(`${U}/rest/v1/auction_results?select=*&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json())).map(toAuctionResult);

console.log("① ce que la fenêtre change, à relecture constante\n");
console.log("fenêtre   points  Trésors tracés  âge du plus vieux  détail");
for (const j of [90, 180, 365, 730, 1825, 3650]) {
  const c = buildCurve(rows, { windowDays: j });
  const traces = c.countries.filter((x) => x.points.length >= MIN_POINTS);
  const pts = c.countries.reduce((n, x) => n + x.points.length, 0);
  const vieux = c.countries.length ? Math.max(...c.countries.map((x) => x.oldestDays)) : 0;
  console.log(
    `${String(j).padStart(5)} j ${String(pts).padStart(7)} ${String(traces.length).padStart(14)} ${String(vieux).padStart(16)} j  ` +
      traces.map((x) => `${x.country} ${x.points.length}`).join(" · "),
  );
}

/**
 * ② Ce que la relecture débloquerait, sans toucher à la fenêtre.
 *
 * Une séance non relue qui porte déjà de quoi calculer un rendement est un
 * point qui attend une signature, pas une donnée manquante.
 */
console.log("\n② ce que la relecture débloquerait, fenêtre d'un an\n");
const AN = 365;
const aujourdhui = new Date().toISOString().slice(0, 10);
const jours = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
const dansLaFenetre = rows.filter((r) => {
  const age = jours(aujourdhui, r.sessionOn);
  return age >= 0 && age <= AN;
});
const attente = dansLaFenetre.filter((r) => !r.confirmedBy);
const attenteUtile = attente.filter((r) => auctionYield(r));
const parPays = {};
for (const r of attenteUtile) parPays[r.country] = (parPays[r.country] ?? 0) + 1;

console.log(`${dansLaFenetre.length} séances dans la fenêtre · ${dansLaFenetre.length - attente.length} relues · ${attente.length} en attente`);
console.log(`dont ${attenteUtile.length} donneraient un point immédiatement si elles étaient signées :`);
for (const [p, n] of Object.entries(parPays).sort((a, b) => b[1] - a[1])) console.log(`   ${p.padEnd(12)} ${n}`);

/** ③ Les séances relues qui ne donnent rien, et ce qui leur manque. */
console.log("\n③ ce qui manque aux séances déjà relues\n");
const relues = dansLaFenetre.filter((r) => r.confirmedBy);
const muettes = relues.filter((r) => !auctionYield(r));
const manque = {};
for (const r of muettes) {
  const quoi =
    r.instrument === "OTA" && r.couponRate == null && (r.priceAvg != null || r.priceLimit != null)
      ? "coupon absent, prix connu"
      : r.instrument === "OTA" && r.priceAvg == null && r.priceLimit == null
        ? "aucun prix servi"
        : "autre";
  manque[quoi] = (manque[quoi] ?? 0) + 1;
}
console.log(`${muettes.length} séances relues sans rendement :`);
for (const [q, n] of Object.entries(manque)) console.log(`   ${String(n).padStart(3)} ${q}`);

/** ④ Ce que la courbe deviendrait si tout ce qui est signable était signé. */
console.log("\n④ la courbe si tout ce qui est calculable entrait, fenêtre d'un an\n");
const commeSiTout = rows.map((r) => (auctionYield(r) ? { ...r, confirmedBy: r.confirmedBy ?? "hypothèse" } : r));
const c2 = buildCurve(commeSiTout, { windowDays: AN });
for (const x of c2.countries.sort((a, b) => b.points.length - a.points.length)) {
  const actuel = buildCurve(rows, { windowDays: AN }).countries.find((y) => y.country === x.country);
  console.log(`   ${x.country.padEnd(12)} ${String(actuel?.points.length ?? 0).padStart(2)} → ${String(x.points.length).padStart(2)} points`);
}
