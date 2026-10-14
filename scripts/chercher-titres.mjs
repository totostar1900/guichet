/** Chercher un motif dans les titres du journal BEAC. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const lignes = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("beac_observations").select("url, titre, genre, pays").range(de, de + 999); lignes.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const vus = new Map(); for (const l of lignes) if (!vus.has(l.url)) vus.set(l.url, l);
const motif = new RegExp(process.argv[2], "i");
const trouves = [...vus.values()].filter((o) => motif.test(o.titre ?? "") || motif.test(o.url ?? ""));
dire(`${trouves.length} document(s) sur ${vus.size}\n`);
for (const o of trouves.slice(0, 40)) dire(`   [${(o.genre ?? "?").padEnd(10)}] ${(o.pays ?? "?").padEnd(12)} ${o.titre?.slice(0, 110)}`);
