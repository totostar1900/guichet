/**
 * L ECHEANCE DE L OTA GABONAISE DU 12 JUIN 2019.
 *
 * Le modele a lu l etiquette « OTA 3 ANS 5,75% 29-MARS-2022 » mais s est
 * abstenu d en tirer une echeance, la date n etant pas imprimee en toutes
 * lettres ailleurs. La question n est pas « quelle date » mais « CETTE
 * LIGNE EST-ELLE NEUVE » : 29 mars 2022 n est pas a trois ans du 12 juin
 * 2019, et si l etiquette dit vrai, la seance est un ABONDEMENT.
 *
 *   npx tsx --conditions=react-server scripts/ota-12-juin-2019.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const CODE = "GA2J00000085";
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("country,session_on,instrument,tenor,code_emission,maturity_on,settle_on,coupon_rate,source_title,source_url").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);

dire(`=== LE MEME CODE ${CODE} AILLEURS ===`);
const memeCodeR = toutes.filter((r) => r.codeEmission === CODE);
const memeCodeA = avis.filter((a) => a.code_emission === CODE);
dire(`   resultats : ${memeCodeR.length}`);
for (const r of memeCodeR) dire(`      ${r.sessionOn} ${r.instrument} ${r.tenor} · echeance ${r.maturityOn ?? "—"} · coupon ${r.couponRate ?? "—"} · annonce ${r.announced} servi ${r.served}`);
dire(`   avis : ${memeCodeA.length}`);
for (const a of memeCodeA) dire(`      ${a.session_on} ${a.instrument} ${a.tenor} · echeance ${a.maturity_on ?? "—"} · reglement ${a.settle_on ?? "—"} · coupon ${a.coupon_rate ?? "—"} · ${String(a.source_title).slice(0, 70)}`);

dire(`\n=== TOUTE LIGNE GABONAISE A 5,75 % ===`);
for (const r of toutes.filter((r) => r.country === "Gabon" && r.couponRate === 5.75)) dire(`   RESULTAT ${r.sessionOn} ${r.instrument} ${r.tenor} ${r.codeEmission ?? "—"} echeance ${r.maturityOn ?? "—"}`);
for (const a of avis.filter((a) => a.country === "Gabon" && Number(a.coupon_rate) === 5.75)) dire(`   AVIS     ${a.session_on} ${a.instrument} ${a.tenor} ${a.code_emission ?? "—"} echeance ${a.maturity_on ?? "—"}`);

dire(`\n=== TOUTE LIGNE GABONAISE ECHEANT EN MARS 2022 ===`);
for (const r of toutes.filter((r) => r.country === "Gabon" && String(r.maturityOn ?? "").startsWith("2022-03"))) dire(`   RESULTAT ${r.sessionOn} ${r.instrument} ${r.tenor} ${r.codeEmission ?? "—"} echeance ${r.maturityOn} coupon ${r.couponRate ?? "—"}`);
for (const a of avis.filter((a) => a.country === "Gabon" && String(a.maturity_on ?? "").startsWith("2022-03"))) dire(`   AVIS     ${a.session_on} ${a.instrument} ${a.tenor} ${a.code_emission ?? "—"} echeance ${a.maturity_on} coupon ${a.coupon_rate ?? "—"}`);

dire(`\n=== LES SEANCES GABONAISES DU PRINTEMPS 2019 (une ligne de 3 ans echeant en mars 2022 naitrait fin mars 2019) ===`);
for (const r of toutes.filter((r) => r.country === "Gabon" && r.sessionOn >= "2019-01-01" && r.sessionOn <= "2019-07-01").sort((a, b) => a.sessionOn.localeCompare(b.sessionOn)))
  dire(`   RESULTAT ${r.sessionOn} ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${String(r.codeEmission ?? "—").padEnd(14)} echeance ${r.maturityOn ?? "—"} coupon ${r.couponRate ?? "—"}`);
for (const a of avis.filter((a) => a.country === "Gabon" && a.session_on >= "2019-01-01" && a.session_on <= "2019-07-01").sort((x, y) => x.session_on.localeCompare(y.session_on)))
  dire(`   AVIS     ${a.session_on} ${String(a.instrument).padEnd(4)} ${String(a.tenor).padEnd(12)} ${String(a.code_emission ?? "—").padEnd(14)} echeance ${a.maturity_on ?? "—"} coupon ${a.coupon_rate ?? "—"}`);

dire(`\n=== CE QUE LES AUTRES OBLIGATIONS GABONAISES « 2J » (3 ans) PORTENT ===`);
const j = [...toutes.filter((r) => r.country === "Gabon" && String(r.codeEmission ?? "").slice(2, 4) === "2J").map((r) => ({ q: "RESULTAT", s: r.sessionOn, c: r.codeEmission, e: r.maturityOn, k: r.couponRate })),
           ...avis.filter((a) => a.country === "Gabon" && String(a.code_emission ?? "").slice(2, 4) === "2J").map((a) => ({ q: "AVIS", s: a.session_on, c: a.code_emission, e: a.maturity_on, k: a.coupon_rate }))];
j.sort((a, b) => String(a.c).localeCompare(String(b.c)));
for (const x of j) dire(`   ${x.q.padEnd(8)} ${x.s} ${x.c} echeance ${x.e ?? "—"} coupon ${x.k ?? "—"}`);
