/**
 * LES TROIS DESACCORDS QUI ONT ARRETE LA REPARATION.
 *
 * Le temoin « la meme ligne ailleurs » reconnait une ligne par son pays,
 * sa date d emission et son echeance. Si deux lignes DIFFERENTES
 * partagent ce triplet, le temoin designe la mauvaise, et il le fait en
 * silence. On regarde les rangees, on ne devine pas.
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_encours_lignes").select("arrete,pays,isin,instrument,emis_le,echeance_le,tenor,titres,faciale,encours,source_titre").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const seances = await repo().listAuctionResults({ limit: 2000 });
const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("country,session_on,code_emission,maturity_on,tenor").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const CAS = ["CM120000091", "CM1200000998/MN", "CM1200001004/MN"];
for (const code of CAS) {
  dire(`\n============ « ${code} » ============`);
  const siennes = lignes.filter((r) => r.isin === code);
  for (const r of siennes) dire(`   REGISTRE ${r.arrete} ${r.pays} ${r.instrument} ${r.tenor} emis ${r.emis_le} → ${r.echeance_le} · ${r.titres ?? "—"} × ${r.faciale} = ${r.encours}`);

  const r = siennes[0];
  dire(`\n   TOUTES LES LIGNES DU REGISTRE DE MEME PAYS, MEME EMISSION ET MEME ECHEANCE :`);
  for (const x of lignes.filter((x) => x.pays === r.pays && x.emis_le === r.emis_le && x.echeance_le === r.echeance_le))
    dire(`      ${x.arrete} « ${x.isin} » ${x.instrument} ${x.tenor} · ${x.titres ?? "—"} × ${x.faciale} = ${x.encours}`);

  const nu = code.replace(/\/.*$/, "");
  dire(`\n   LE CODE SANS SON SUFFIXE, « ${nu} », EST-IL CONNU ?`);
  dire(`      au registre : ${lignes.filter((x) => x.isin === nu).length} ligne(s)`);
  for (const x of lignes.filter((x) => x.isin === nu)) dire(`         ${x.arrete} ${x.pays} ${x.instrument} ${x.tenor} emis ${x.emis_le} → ${x.echeance_le} · ${x.encours}`);
  dire(`      en seance   : ${seances.filter((s) => s.codeEmission === nu).map((s) => `${s.sessionOn} ${s.country} ${s.instrument} ${s.tenor} echeance ${s.maturityOn ?? "—"}`).join(" | ") || "aucune"}`);
  dire(`      en avis     : ${avis.filter((a) => a.code_emission === nu).map((a) => `${a.session_on} ${a.country} echeance ${a.maturity_on ?? "—"}`).join(" | ") || "aucun"}`);

  dire(`\n   CE QUE NOS SOURCES PORTENT A CETTE ECHEANCE (${r.echeance_le}), MEME PAYS :`);
  for (const s of seances.filter((s) => s.country === r.pays && s.maturityOn === r.echeance_le))
    dire(`      SEANCE ${s.sessionOn} « ${s.codeEmission ?? "—"} » ${s.instrument} ${s.tenor}`);
  for (const a of avis.filter((a) => a.country === r.pays && a.maturity_on === r.echeance_le))
    dire(`      AVIS   ${a.session_on} « ${a.code_emission ?? "—"} » ${a.tenor}`);
}

dire(`\n============ DEUX LIGNES PARTAGENT-ELLES LE MEME TRIPLET ? ============`);
const parTriplet = new Map();
for (const r of lignes) {
  const k = `${r.pays}|${r.emis_le}|${r.echeance_le}`;
  const v = parTriplet.get(k) ?? new Set();
  v.add(r.isin);
  parTriplet.set(k, v);
}
const ambigus = [...parTriplet].filter(([, v]) => v.size > 1);
dire(`   ${ambigus.length} triplet(s) portent PLUSIEURS codes distincts, sur ${parTriplet.size}`);
for (const [k, v] of ambigus.slice(0, 15)) dire(`      ${k} → ${[...v].join(" · ")}`);
if (ambigus.length > 15) dire(`      … et ${ambigus.length - 15} autre(s)`);
