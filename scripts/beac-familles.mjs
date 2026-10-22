/** Les familles de documents du journal BEAC, comptees par leur titre. */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const lignes = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("beac_observations").select("url, titre").range(de, de + 999); lignes.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const vus = new Map(); for (const l of lignes) if (!vus.has(l.url)) vus.set(l.url, l);
const FAM = [
  ["tableau de bord · valeurs du Tresor", /tableau\s+(de\s+bord\s+)?hebdomadaire|tableau de bord/i],
  ["RAPPORT hebdo · marche FINANCIER UNIFIE", /rapport hebdomadaire.*march[ée] financier unifi/i],
  ["RAPPORT hebdo · valeurs du Tresor", /rapport hebdomadaire.*valeurs du tr[ée]sor/i],
  ["autre rapport", /rapport/i],
  ["resultats d adjudication", /r[ée]sultats?/i],
  ["annonce", /annonce/i],
  ["calendrier", /calendrier/i],
];
const reste = [];
const n = new Map(FAM.map(([k]) => [k, []]));
for (const o of vus.values()) {
  const f = FAM.find(([, m]) => m.test(o.titre ?? ""));
  if (f) n.get(f[0]).push(o); else reste.push(o);
}
for (const [k, xs] of n) dire(`${String(xs.length).padStart(4)}  ${k}`);
dire(`${String(reste.length).padStart(4)}  (non classe)`);
const u = n.get("RAPPORT hebdo · marche FINANCIER UNIFIE");
dire(`\nexemples de rapports « marche financier unifie » :`);
for (const o of u.slice(0, 3)) dire(`   ${o.titre.slice(0, 95)}\n      ${o.url}`);
const v = n.get("RAPPORT hebdo · valeurs du Tresor");
dire(`\nexemples de rapports « valeurs du Tresor » :`);
for (const o of v.slice(0, 2)) dire(`   ${o.titre.slice(0, 95)}\n      ${o.url}`);
