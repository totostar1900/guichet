/** Ce que le journal porte de calendriers, et d'ou ils viennent.
 *    npx tsx --conditions=react-server scripts/beac-calendriers.mjs */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_observations").select("url, titre, genre, pays, seance, present, vu_le").range(de, de + 999);
  lignes.push(...(data ?? [])); if ((data ?? []).length < 1000) break;
}
const vus = new Map();
for (const l of lignes) if (!vus.has(l.url)) vus.set(l.url, l);
const tous = [...vus.values()];

dire(`=== CE QUI PORTE « CALENDRIER » DANS SON TITRE ===`);
for (const o of tous.filter((x) => /calendrier/i.test(x.titre ?? ""))) dire(`   [${o.genre}] ${o.pays ?? "?"} · ${o.titre}\n      ${o.url}`);

dire(`\n=== LA DERNIÈRE ANNONCE DE CHAQUE PAYS ===`);
const parPays = new Map();
for (const o of tous.filter((x) => x.genre === "annonce" && x.seance)) {
  const p = o.pays ?? "?";
  if (!parPays.has(p) || o.seance > parPays.get(p).seance) parPays.set(p, o);
}
const auj = new Date().toISOString().slice(0, 10);
for (const [p, o] of [...parPays.entries()].sort()) {
  const jours = Math.round((Date.parse(auj) - Date.parse(o.seance)) / 86400000);
  dire(`   ${p.padEnd(20)} ${o.seance}  il y a ${jours} jour(s)`);
}
dire(`\n   aujourd'hui : ${auj}`);
const devant = tous.filter((x) => x.seance && x.seance >= auj);
dire(`   documents annonçant une séance à venir : ${devant.length}`);
for (const o of devant.slice(0, 10)) dire(`      ${o.seance} [${o.genre}] ${o.titre?.slice(0, 90)}`);
