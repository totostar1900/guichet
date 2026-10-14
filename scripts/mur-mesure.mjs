/** Le mur des echeances de la zone, sur la donnee reelle, les deux portes. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const A = await import("../src/lib/market/amortissement.ts");
const M = await import("../src/lib/market/mur-echeances.ts");
const { principalDuCoupon } = await import("../src/lib/market/principal-par-le-coupon.ts");
const { issuerKey } = await import("../src/data/issuer-registry.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const nommer = (b) => issuerKey({ issuer: b, isin: "", title: "" });
const auj = new Date().toISOString().slice(0, 10);

/* LA COTE : l echeancier mesure, ligne par ligne. */
const { data: der } = await sb.from("debt_outstandings").select("session_date").order("session_date", { ascending: false }).limit(1);
const { data: cot } = await sb.from("debt_outstandings").select("*").eq("session_date", der[0].session_date);
const tombees = [];
for (const l of cot) {
  const ech = A.echeancierDe({
    isin: l.isin, tauxPct: Number(l.coupon_rate ?? 0), encours: Number(l.outstanding),
    amortissement: l.amortisation ?? "IN FINE", periodicite: l.periodicity ?? "AN",
    prochainCoupon: l.next_coupon_on ?? auj,
    echeance: l.maturity_on ?? new Date(Date.parse(`${l.first_listed_on}T12:00:00Z`) + Number(l.maturity_years ?? 5) * 365.25 * 86400000).toISOString().slice(0, 10),
  });
  for (const t of ech) tombees.push({ ...t, porte: "cote", emetteur: nommer(l.issuer) });
}
dire(`cote : ${cot.length} ligne(s), ${tombees.length} tombee(s)`);

/* L ADJUGE : le principal deduit du coupon, du au jour de l echeance, et le
   coupon chaque annee jusque-la. Hypothese in fine, declaree. */
const ops = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("treasury_operations").select("pays, code_emission, coupon_rate, montant, operation_on, maturity_on, operation").range(de, de + 999); ops.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const dernier = new Map();
for (const o of ops.filter((x) => x.operation === "paiement_interets" && x.code_emission && x.coupon_rate && x.montant && x.operation_on).sort((a, b) => a.operation_on.localeCompare(b.operation_on))) dernier.set(o.code_emission.trim().toUpperCase(), o);
let nAdj = 0;
for (const [code, o] of dernier) {
  if (!o.maturity_on || o.maturity_on <= auj) continue;
  const principal = principalDuCoupon({ taux: Number(o.coupon_rate), montant: Number(o.montant) });
  if (principal === undefined) continue;
  nAdj++;
  tombees.push({ isin: code, quand: o.maturity_on, capital: principal, coupon: 0, source: "suppose", porte: "adjuge", emetteur: nommer(o.pays) });
  /* Un coupon par an jusqu a l echeance, au meme jour-mois que le dernier vu. */
  for (let d = new Date(`${o.operation_on}T12:00:00Z`); ; ) {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    const q = d.toISOString().slice(0, 10);
    if (q > o.maturity_on) break;
    tombees.push({ isin: code, quand: q, capital: 0, coupon: Number(o.montant), source: "mesure", porte: "adjuge", emetteur: nommer(o.pays) });
  }
}
dire(`adjuge : ${nAdj} ligne(s) vivante(s)\n`);

const m = M.mur(tombees, auj, 12);
dire(`${"trimestre".padEnd(10)} ${"capital".padStart(9)} ${"coupon".padStart(8)} ${"total".padStart(9)}  ${"cote".padStart(8)} ${"adjuge".padStart(8)}  lignes`);
for (const q of m) dire(`${q.clef.padEnd(10)} ${mds(q.capital).padStart(9)} ${mds(q.coupon).padStart(8)} ${mds(q.capital + q.coupon).padStart(9)}  ${mds(q.parPorte.cote.capital + q.parPorte.cote.coupon).padStart(8)} ${mds(q.parPorte.adjuge.capital + q.parPorte.adjuge.coupon).padStart(8)}  ${q.lignes}`);
const h = M.plusLourd(m);
dire(`\n   trimestre le plus lourd : ${h.clef}, ${mds(h.capital + h.coupon)} Mds`);
dire(`   part du capital mesuree : ${M.partMesuree(m).toFixed(0)} %`);
dire(`   total sur douze trimestres : ${mds(m.reduce((a, q) => a + q.capital + q.coupon, 0))} Mds`);
