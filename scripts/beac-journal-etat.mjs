/** Ce que le journal des observations porte, contre ce que la page affiche.
 *    npx tsx --conditions=react-server scripts/beac-journal-etat.mjs */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_observations").select("url, genre, pays, seance, present, vu_le").order("vu_le", { ascending: false }).range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const vus = new Map();
for (const l of lignes) if (!vus.has(l.url)) vus.set(l.url, l);
dire(`${lignes.length} observation(s), ${vus.size} document(s) distinct(s)`);
const presents = [...vus.values()].filter((o) => o.present);
dire(`${presents.length} encore présent(s) sur le site\n`);
const parGenre = new Map();
for (const o of presents) parGenre.set(o.genre ?? "?", (parGenre.get(o.genre ?? "?") ?? 0) + 1);
dire(`=== PAR GENRE ===`);
for (const [g, n] of [...parGenre.entries()].sort((a, b) => b[1] - a[1])) dire(`   ${String(g).padEnd(14)} ${String(n).padStart(4)}`);
const d = [...vus.values()].map((o) => o.vu_le).filter(Boolean).sort();
dire(`\n   dernier passage du robot : ${d[d.length - 1]}`);
