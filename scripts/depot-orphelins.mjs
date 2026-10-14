/**
 * LES OBJETS DU DEPOT QUE PLUS AUCUNE LIGNE NE DESIGNE.
 *
 * 385 pieces BEAC portent une clef d une ancienne convention
 * (« 2019-08-21-annonce-Gabon--… »). Avant de conclure qu elles sont perdues
 * ou qu elles font double emploi, on demande la seule chose qui compte : une
 * table les designe-t-elle encore ? Un objet que personne ne nomme n est pas
 * une archive, c est un residu.
 *
 *   npx tsx --conditions=react-server scripts/depot-orphelins.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

async function tout(t, c) { const out = []; for (let de = 0; ; de += 1000) { const { data, error } = await sb.from(t).select(c).range(de, de + 999); if (error) { dire(`   ${t} : ${error.message}`); break; } out.push(...(data ?? [])); if ((data ?? []).length < 1000) break; } return out; }

/* Toutes les clefs que les tables designent, sous la forme du depot. */
const designees = new Map();
for (const [t, c] of [["market_bulletins", "file_key"], ["auction_results", "file_key"], ["emission_notices", "file_key"], ["issuer_documents", "file_key"], ["generated_documents", "file_key"], ["client_files", "file_key"]]) {
  for (const r of await tout(t, c)) if (r.file_key) designees.set(storageKey(r.file_key), t);
}
dire(`${designees.size} clef(s) designee(s) par une table\n`);

async function parcourir(p, prof = 0) { const out = []; for (let de = 0; ; de += 100) { const { data, error } = await sb.storage.from("sources").list(p, { limit: 100, offset: de }); if (error) break; for (const o of data ?? []) { const cle = p ? `${p}/${o.name}` : o.name; if (o.id === null && prof < 4) out.push(...(await parcourir(cle, prof + 1))); else if (o.id) out.push({ cle, octets: o.metadata?.size ?? 0 }); } if ((data ?? []).length < 100) break; } return out; }
const lot = await parcourir("");

const orphelins = lot.filter((o) => !designees.has(o.cle));
const mo = (n) => (n / 1024 / 1024).toFixed(1);
dire(`${lot.length} objet(s) au depot`);
dire(`${orphelins.length} ORPHELIN(S), ${mo(orphelins.reduce((a, o) => a + o.octets, 0))} Mo\n`);
const parTete = new Map();
for (const o of orphelins) { const t = o.cle.split("/")[0]; const v = parTete.get(t) ?? { n: 0, o: 0 }; v.n++; v.o += o.octets; parTete.set(t, v); }
for (const [t, v] of [...parTete.entries()].sort((a, b) => b[1].o - a[1].o)) dire(`   ${t.padEnd(12)} ${String(v.n).padStart(5)} · ${mo(v.o).padStart(8)} Mo`);
dire(`\n   dix exemples :`);
for (const o of orphelins.slice(0, 10)) dire(`      ${o.cle}`);
