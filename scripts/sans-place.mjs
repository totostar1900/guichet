/** Les pieces citees par une table dont la bibliotheque ignore la place. */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const { storageKey } = await import("../src/lib/intake/cle.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
async function tout(t, c) { const o = []; for (let de = 0; ; de += 1000) { const { data } = await sb.from(t).select(c).range(de, de + 999); o.push(...(data ?? [])); if ((data ?? []).length < 1000) break; } return o; }
const index = new Set((await tout("library_items", "file_key")).map((x) => x.file_key));
const journal = new Set((await tout("beac_observations", "url")).map((x) => x.url));
for (const [t, c] of [["market_bulletins", "file_key, session_date, source_url"], ["auction_results", "file_key, source_url, session_on"], ["emission_notices", "file_key, source_url, session_on"]]) {
  const sans = (await tout(t, c)).filter((r) => r.file_key && !index.has(storageKey(r.file_key)));
  if (!sans.length) continue;
  dire(`=== ${t} : ${sans.length} ===`);
  for (const r of sans) dire(`   ${String(r.session_date ?? r.session_on ?? "").padEnd(12)} ${String(r.file_key).slice(0, 72)}\n      source au journal : ${r.source_url && journal.has(r.source_url) ? "OUI" : "non"}  ${String(r.source_url ?? "").slice(0, 80)}`);
}
