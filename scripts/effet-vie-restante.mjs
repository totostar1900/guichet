/**
 * Ce que le passage à la vie restante change, séance par séance.
 *
 * Un correctif de calcul qui touche une courbe publiable ne se vérifie pas en
 * lisant le code : il se vérifie en comparant l'ancien chiffre au nouveau sur
 * les séances réelles, et en regardant d'abord celles qui bougent le plus. Les
 * abondements sortent seuls de ce classement, ce qui est la preuve que le
 * correctif touche ce qu'il visait et rien d'autre.
 *
 *   node scripts/effet-vie-restante.mjs
 */
import fs from "node:fs";
import { auctionYield, tenorYears, vieRestante, ytm, priceOf } from "../src/lib/market/yield.ts";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
const v = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim().replace(/^["']|["']$/g, "");
const U = v("NEXT_PUBLIC_SUPABASE_URL");
const K = v("SUPABASE_SERVICE_ROLE_KEY");

const rows = await fetch(`${U}/rest/v1/auction_results?select=*&order=session_on.desc&limit=2000`, {
  headers: { apikey: K, Authorization: `Bearer ${K}` },
}).then((r) => r.json());

/** La séance telle que le domaine la lit. */
const dom = (r) => ({
  instrument: r.instrument,
  tenor: r.tenor,
  sessionOn: r.session_on,
  maturityOn: r.maturity_on ?? undefined,
  yieldAvg: r.yield_avg ?? undefined,
  yieldLimit: r.yield_limit ?? undefined,
  rateAvg: r.rate_avg ?? undefined,
  rateLimit: r.rate_limit ?? undefined,
  priceAvg: r.price_avg ?? undefined,
  priceLimit: r.price_limit ?? undefined,
  priceMin: r.price_min ?? undefined,
  priceMax: r.price_max ?? undefined,
  priceAvgFcfa: r.price_avg_fcfa ?? undefined,
  couponRate: r.coupon_rate ?? undefined,
});

/** L'ancien calcul : l'étiquette, et la borne lue par son nom. */
function ancien(r) {
  const d = dom(r);
  if (d.yieldAvg != null) return d.yieldAvg;
  if (d.yieldLimit != null) return d.yieldLimit;
  if (d.instrument === "BTA") return auctionYield(d)?.pct;
  const horsBornes = d.priceAvg != null && d.priceMax != null && d.priceAvg > d.priceMax + 0.01;
  const prix = horsBornes && d.priceLimit != null ? d.priceLimit : priceOf({ ...d, priceMin: undefined, priceMax: d.priceMax })?.pct;
  const annees = tenorYears(d.tenor);
  if (prix == null || d.couponRate == null || annees == null) return undefined;
  const n = Math.round(annees);
  if (n < 1 || Math.abs(annees - n) > 0.2) return undefined;
  return ytm(prix, d.couponRate, n);
}

const bouge = [];
let inchanges = 0;
for (const r of rows) {
  const a = ancien(r);
  const b = auctionYield(dom(r))?.pct;
  if (a == null && b == null) continue;
  if (a != null && b != null && Math.abs(a - b) < 0.005) {
    inchanges++;
    continue;
  }
  const vie = vieRestante(dom(r));
  bouge.push({
    on: r.session_on,
    pays: r.country,
    tenor: r.tenor,
    code: r.code_emission,
    ech: r.maturity_on,
    vie: vie ? vie.years.toFixed(2) : "—",
    de: vie?.from === "échéance" ? "éch." : "étiq.",
    a,
    b,
    relue: Boolean(r.confirmed_by),
  });
}

bouge.sort((x, y) => Math.abs((y.b ?? 0) - (y.a ?? 0)) - Math.abs((x.b ?? 0) - (x.a ?? 0)));
const pc = (x) => (x == null ? "  aucun" : x.toFixed(2).padStart(6));
console.log(`${rows.length} séances · ${inchanges} inchangées · ${bouge.length} déplacées\n`);
console.log("date       pays        durée     reste   avant → après   écart   code");
for (const o of bouge.slice(0, 40)) {
  const ecart = o.a != null && o.b != null ? `${((o.b - o.a) * 100).toFixed(0).padStart(5)} pb` : "  nouveau";
  console.log(`${o.on} ${o.pays.padEnd(11)} ${String(o.tenor).padEnd(9)} ${o.vie.padStart(5)} ${o.de.padEnd(6)} ${pc(o.a)} → ${pc(o.b)} ${ecart} ${o.relue ? "relue" : "     "} ${o.code ?? ""}`);
}
if (bouge.length > 40) console.log(`… et ${bouge.length - 40} autres`);
