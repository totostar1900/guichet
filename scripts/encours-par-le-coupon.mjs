/**
 * L ENCOURS ADJUGE, DEDUIT DES COUPONS.
 *
 * Ni les communiques (82 levees sur 536) ni les emissions du tableau de bord
 * (des intentions) ne donnent le stock. Le paiement d interets, lui, est
 * exact et le taux facial est imprime a cote : coupon divise par taux rend le
 * principal, et l identite tient 69 fois sur 80 contre une source
 * independante.
 *
 *   npx tsx --conditions=react-server scripts/encours-par-le-coupon.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const C = await import("../src/lib/market/principal-par-le-coupon.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const ops = [];
for (let de = 0; ; de += 1000) { const { data, error } = await sb.from("treasury_operations").select("pays, code_emission, coupon_rate, montant, operation, operation_on, maturity_on, tenor").range(de, de + 999); if (error) throw new Error(error.message); ops.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }

const coupons = ops.filter((o) => o.operation === "paiement_interets" && o.code_emission && o.coupon_rate && o.montant)
  .map((o) => ({ code: o.code_emission.trim().toUpperCase(), taux: Number(o.coupon_rate), montant: Number(o.montant), le: o.operation_on, pays: o.pays, echeance: o.maturity_on }));
dire(`${coupons.length} coupon(s) portant un taux\n`);

/* Ce que chaque couple raconte, quand un remboursement existe aussi. */
const remb = new Map();
for (const o of ops.filter((x) => x.operation === "remboursement" && x.code_emission)) {
  const k = o.code_emission.trim().toUpperCase();
  remb.set(k, (remb.get(k) ?? 0) + Number(o.montant ?? 0));
}
const natures = new Map();
for (const c of coupons) {
  const l = C.lireLeCouple(c, remb.get(c.code) ?? 0);
  natures.set(l.nature, (natures.get(l.nature) ?? 0) + 1);
}
dire(`=== CE QUE LES COUPLES RACONTENT ===`);
for (const [n, k] of [...natures.entries()].sort((a, b) => b[1] - a[1])) dire(`   ${n.padEnd(20)} ${String(k).padStart(4)}`);

/* LE STOCK : le dernier principal connu de chaque ligne, retire a l echeance. */
const dernier = C.dernierPrincipalConnu(coupons);
const parCode = new Map(coupons.map((c) => [c.code, c]));
const auj = new Date().toISOString().slice(0, 10);
let vivant = 0, echu = 0, sansEcheance = 0;
const parPays = new Map();
for (const [code, e] of dernier) {
  const c = parCode.get(code);
  const ech = c?.echeance;
  if (!ech) { sansEcheance++; continue; }
  if (ech <= auj) { echu++; continue; }
  vivant += e.principal;
  const v = parPays.get(c.pays) ?? { n: 0, m: 0 };
  v.n++; v.m += e.principal; parPays.set(c.pays, v);
}
dire(`\n=== LE STOCK DEDUIT, AU ${auj} ===`);
dire(`   lignes dont un coupon est connu        ${dernier.size}`);
dire(`   deja echues                            ${echu}`);
dire(`   sans echeance lisible                  ${sansEcheance}`);
dire(`   VIVANTES                               ${[...parPays.values()].reduce((a, v) => a + v.n, 0)} · ${mds(vivant)} Mds\n`);
for (const [p, v] of [...parPays.entries()].sort((a, b) => b[1].m - a[1].m)) dire(`   ${p.padEnd(16)} ${String(v.n).padStart(3)} ligne(s) · ${mds(v.m).padStart(8)} Mds`);

/* LE COUT ANNUEL : un coupon annuel par ligne vivante, par construction. */
let cout = 0;
for (const [code] of dernier) {
  const c = parCode.get(code);
  if (!c?.echeance || c.echeance <= auj) continue;
  cout += c.montant;
}
dire(`\n   cout annuel des lignes vivantes : ${mds(cout)} Mds`);
dire(`   taux moyen pondere : ${vivant ? ((100 * cout) / vivant).toFixed(2) : "?"} %`);

dire(`\n   A DIRE AVEC LE CHIFFRE : seules les lignes ayant paye un coupon`);
dire(`   pendant les 81 semaines lues sont comptees. Les bons, qui n en paient`);
dire(`   pas, en sont absents par nature : c est un encours d OBLIGATIONS.`);
