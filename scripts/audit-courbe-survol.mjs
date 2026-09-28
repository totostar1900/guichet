/**
 * Audit de la courbe : l'échelle, le filigrane, et ce que le suivi peut atteindre.
 *
 * Trois questions posées par le desk, et une seule façon honnête d'y répondre :
 * refaire le calcul de l'écran, en dehors de l'écran.
 *
 * 1. Le filigrane du présent est tracé avec l'échelle de la courbe affichée,
 *    alors qu'il n'est pas dans les points qui l'ont calculée. S'il porte un
 *    horizon plus long, il sort de la zone de tracé, par-dessus la marge droite
 *    où vivent les étiquettes de fin de ligne.
 *
 * 2. Le suivi cherche, pour chaque série, le point le plus proche en abscisse.
 *    Un horizon qu'une seule série porte n'est donc jamais atteignable seul :
 *    les autres séries y répondent avec un point d'ailleurs, et la série qui le
 *    porte vraiment peut ne jamais être en tête de la bulle.
 *
 * 3. Deux points au même horizon arrondi : le suivi n'en désigne qu'un.
 *
 *   npx tsx scripts/audit-courbe-survol.mjs [AAAA-MM-JJ] [jours]
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

const MIN = 2;
const on = process.argv[2] ?? "2021-09-28";
const jours = Number(process.argv[3] ?? 1825);

/* Les mêmes constantes que le composant : l'audit doit refaire son calcul. */
const W = 900;
const P = { l: 54, r: 104 };

const tracees = buildCurve(rows, { on, windowDays: jours }).countries.filter((c) => c.points.length >= MIN);
/* Le filigrane est toujours la courbe du jour à quatre-vingt-dix jours. */
const fantome = buildCurve(rows, { windowDays: 90 }).countries.filter((c) => c.points.length >= MIN);

const tous = tracees.flatMap((c) => c.points);
if (!tous.length) {
  console.log(`aucun point au ${on} sur ${jours} jours`);
  process.exit(0);
}
const xs = tous.map((p) => Math.log(p.years));
const x0 = Math.min(...xs);
const x1 = Math.max(...xs);
const X = (a) => P.l + ((Math.log(a) - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);

const ans = (y) => {
  const h = horizon(y);
  return `${h.n} ${h.unit}`;
};

console.log(`observée le ${on}, profondeur ${jours} j`);
console.log(`échelle calculée sur les points affichés : de ${ans(Math.exp(x0))} à ${ans(Math.exp(x1))}`);
console.log(`zone de tracé : x de ${P.l} à ${W - P.r}\n`);

console.log(`1. LE FILIGRANE (courbe du jour, 90 j)`);
const pf = fantome.flatMap((c) => c.points);
if (!pf.length) console.log(`   vide : rien à tracer`);
else {
  const dehors = pf.filter((p) => X(p.years) < P.l - 0.5 || X(p.years) > W - P.r + 0.5);
  console.log(`   ${pf.length} points, de ${ans(Math.min(...pf.map((p) => p.years)))} à ${ans(Math.max(...pf.map((p) => p.years)))}`);
  console.log(`   ${dehors.length} point(s) hors de la zone de tracé`);
  for (const p of [...new Map(dehors.map((p) => [ans(p.years), p])).values()]) console.log(`      ${ans(p.years).padEnd(9)} x = ${X(p.years).toFixed(0)}  (dépassement de ${(X(p.years) - (W - P.r)).toFixed(0)} px)`);
}

console.log(`\n2. LES HORIZONS QU'UNE SEULE SÉRIE PORTE`);
const parHorizon = new Map();
for (const c of tracees) for (const p of c.points) parHorizon.set(ans(p.years), new Set([...(parHorizon.get(ans(p.years)) ?? []), c.country]));
const seuls = [...parHorizon.entries()].filter(([, s]) => s.size === 1);
console.log(`   ${seuls.length} horizon(s) sur ${parHorizon.size} ne sont portés que par un Trésor :`);
for (const [h, s] of seuls) console.log(`      ${h.padEnd(9)} ${[...s][0]}`);

console.log(`\n3. LES POINTS QUE LE SUIVI NE PEUT PAS DÉSIGNER`);
/* Le suivi prend, par série, le point le plus proche en log-abscisse. Un point
   n'est atteignable que s'il existe une abscisse où il gagne pour sa série. */
let jamais = 0;
for (const c of tracees) {
  const inatteignables = [];
  for (const p of c.points) {
    const gagne = c.points.every((q) => q === p || Math.abs(Math.log(q.years) - Math.log(p.years)) > 1e-12 || c.points.indexOf(q) > c.points.indexOf(p));
    /* Deux points strictement au même horizon : seul le premier sort du reduce. */
    const jumeau = c.points.find((q) => q !== p && Math.abs(Math.log(q.years) - Math.log(p.years)) < 1e-12);
    if (jumeau && !gagne) inatteignables.push(p);
  }
  /* Le cas qui compte vraiment : plusieurs points au même horizon arrondi. */
  const parMot = new Map();
  for (const p of c.points) parMot.set(ans(p.years), [...(parMot.get(ans(p.years)) ?? []), p]);
  const empiles = [...parMot.entries()].filter(([, l]) => l.length > 1);
  if (empiles.length) {
    console.log(`   ${c.country} :`);
    for (const [h, l] of empiles) {
      jamais += l.length - 1;
      console.log(`      ${h.padEnd(9)} ${l.length} points empilés, le suivi n'en désigne qu'un (${l.length - 1} inatteignables)`);
    }
  }
  void inatteignables;
}
console.log(`   ${jamais} point(s) au total que le suivi ne peut jamais nommer.`);
