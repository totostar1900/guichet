/** Le texte d'une pièce du journal BEAC, par motif de titre.
 *    npx tsx --conditions=react-server scripts/lire-piece-url.mjs "tableau de bord" */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const lignes = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("beac_observations").select("url, titre, genre, pays").range(de, de + 999); lignes.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const vus = new Map(); for (const l of lignes) if (!vus.has(l.url)) vus.set(l.url, l);
const motif = new RegExp(process.argv[2], "i");
for (const o of [...vus.values()].filter((x) => motif.test(x.titre ?? ""))) {
  dire(`=== ${o.titre} ===\n   ${o.url}`);
  const buf = await fetch(o.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" } }).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  if (!buf) { dire(`   la source ne rend rien`); continue; }
  dire(`   ${(buf.byteLength / 1024).toFixed(0)} Ko`);
  try {
    const r = await rangeesDuPdf(new Uint8Array(buf));
    const texte = r.map((x) => `p${x.page} ` + x.cellules.map((c) => c.texte).join(" | ")).join("\n");
    dire(texte.trim() ? texte.split("\n").slice(0, Number(process.argv[3] ?? 90)).map((x) => "   " + x.slice(0, 190)).join("\n") : "   SCAN SANS COUCHE TEXTE");
  } catch (e) { dire(`   illisible : ${e.message}`); }
}
