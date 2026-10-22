import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const t = [];
for (let de = 0; ; de += 1000) { const { data, error } = await sb.from("treasury_operations").select("*").range(de, de + 999); if (error) throw new Error(error.message); t.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
dire(`${t.length} operation(s) en base`);
const d = t.map((x) => x.operation_on).filter(Boolean).sort();
dire(`du ${d[0]} au ${d[d.length - 1]} · ${new Set(t.map((x) => x.source_url)).size} piece(s)\n`);
const par = new Map();
for (const x of t) { const v = par.get(x.operation) ?? { n: 0, m: 0 }; v.n++; v.m += Number(x.montant ?? 0); par.set(x.operation, v); }
dire(`=== PAR TYPE D OPERATION ===`);
for (const [k, v] of [...par.entries()].sort((a, b) => b[1].m - a[1].m)) dire(`   ${k.padEnd(20)} ${String(v.n).padStart(5)} · ${mds(v.m).padStart(10)} Mds`);
const pays = new Map();
for (const x of t) { const v = pays.get(x.pays) ?? { n: 0, m: 0 }; v.n++; v.m += Number(x.montant ?? 0); pays.set(x.pays, v); }
dire(`\n=== PAR PAYS ===`);
for (const [k, v] of [...pays.entries()].sort((a, b) => b[1].m - a[1].m)) dire(`   ${k.padEnd(16)} ${String(v.n).padStart(5)} · ${mds(v.m).padStart(10)} Mds`);
const coupons = t.filter((x) => x.operation === "paiement_interets");
dire(`\n   interets payes, cumules sur les semaines lues : ${mds(coupons.reduce((a, x) => a + Number(x.montant ?? 0), 0))} Mds sur ${coupons.length} paiement(s)`);
