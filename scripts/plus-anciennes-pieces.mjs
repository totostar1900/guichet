/** CE QUE NOTRE COLLECTE PORTE DE PLUS ANCIEN, PAR PAYS ET PAR FAMILLE. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const lire = async (table, colSeance) => {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select(`country,${colSeance},source_title,source_url`).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out.map((r) => ({ ...r, on: r[colSeance] }));
};
const res = await lire("auction_results", "session_on");
const ann = await lire("emission_notices", "session_on");
dire(`${res.length} resultats · ${ann.length} avis\n`);

for (const [nom, xs] of [["RESULTATS", res], ["AVIS", ann]]) {
  dire(`=== ${nom} : la plus ancienne piece par pays ===`);
  const parPays = new Map();
  for (const r of xs.filter((r) => r.on).sort((a, b) => a.on.localeCompare(b.on))) if (!parPays.has(r.country)) parPays.set(r.country, r);
  for (const [p, r] of [...parPays].sort()) dire(`   ${String(p).padEnd(20)} ${r.on} · ${String(r.source_title).slice(0, 70)}`);
  dire("");
}

dire(`=== TOUTES LES PIECES, TOUS PAYS, AVANT JUIN 2019 ===`);
const tot = [...res.map((r) => ({ ...r, f: "resultat" })), ...ann.map((r) => ({ ...r, f: "avis" }))].filter((r) => r.on && r.on < "2019-06-01").sort((a, b) => a.on.localeCompare(b.on));
dire(`   ${tot.length} piece(s)`);
for (const r of tot) dire(`   ${r.on} ${r.f.padEnd(9)} ${String(r.country).padEnd(18)} · ${String(r.source_title).slice(0, 72)}`);
