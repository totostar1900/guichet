/** La dette des Etats par ses deux portes, sur la donnee reelle. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const D = await import("../src/lib/market/dette-souveraine.ts");
const { issuerKey } = await import("../src/data/issuer-registry.ts");
/* Le registre porte deja « ETAT DU GABON » et « Gabon » comme alias du meme
   profil : on l injecte plutot que d ecrire une seconde table. */
const nommer = (brut) => issuerKey({ issuer: brut, isin: "", title: "" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const { data: der } = await sb.from("debt_outstandings").select("session_date").order("session_date", { ascending: false }).limit(1);
const seance = der[0].session_date;
const { data: brut } = await sb.from("debt_outstandings").select("*").eq("session_date", seance);
const cotees = brut.map((l) => ({ isin: l.isin, issuer: l.issuer, units: Number(l.units), nominalRemaining: Number(l.nominal_remaining), couponRate: Number(l.coupon_rate ?? 0), coursPct: Number(l.price_pct), outstanding: Number(l.outstanding), sessionDate: l.session_date }));

const ops = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("treasury_operations").select("pays, code_emission, coupon_rate, montant, operation_on, maturity_on, operation").range(de, de + 999); ops.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const coupons = ops.filter((o) => o.operation === "paiement_interets" && o.code_emission && o.coupon_rate && o.montant && o.operation_on)
  .map((o) => ({ pays: o.pays, code: o.code_emission.trim().toUpperCase(), taux: Number(o.coupon_rate), montant: Number(o.montant), le: o.operation_on, echeance: o.maturity_on ?? undefined }));

const auj = new Date().toISOString().slice(0, 10);
const f = D.fiches(D.coteParEmetteur(cotees, nommer), D.adjugeParEmetteur(coupons, auj, nommer));
const t = D.total(f);

dire(`cote : seance du ${seance}, ${cotees.length} ligne(s)`);
dire(`adjuge : ${coupons.length} coupon(s) lus\n`);
dire(`${"emetteur".padEnd(26)} ${"cote".padStart(10)} ${"adjuge".padStart(10)} ${"total".padStart(10)}  ${"cout/an".padStart(9)}  taux`);
for (const x of f) {
  dire(`${x.emetteur.slice(0, 26).padEnd(26)} ${(x.cote ? mds(x.cote.encours) : "—").padStart(10)} ${(x.adjuge ? mds(x.adjuge.encours) : "—").padStart(10)} ${mds(x.total).padStart(10)}  ${mds(x.coutTotal).padStart(9)}  ${x.total ? ((100 * x.coutTotal) / x.total).toFixed(2) : "—"} %`);
}
dire(`\n${"TOTAL".padEnd(26)} ${mds(t.cote).padStart(10)} ${mds(t.adjuge).padStart(10)} ${mds(t.total).padStart(10)}  ${mds(t.coutTotal).padStart(9)}  ${((100 * t.coutTotal) / t.total).toFixed(2)} %`);
dire(`part adjugee : ${t.partAdjugee.toFixed(0)} %`);
dire(`\nreserves :`);
for (const r of D.RESERVES) dire(`   · ${r}`);
