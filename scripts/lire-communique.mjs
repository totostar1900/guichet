/** Le texte brut d'un communiqué d'adjudication gardé, pour lever un doute d'unité.
 *    npx tsx --conditions=react-server scripts/lire-communique.mjs <id|date> */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

for (const q of process.argv.slice(2)) {
  const { data } = await sb.from("auction_results").select("*").eq("session_on", q);
  for (const l of data ?? []) {
    dire(`\n=== ${l.session_on} ${l.country} ${l.instrument} ${l.tenor} ===`);
    dire(`   base : annoncé ${l.announced} · soumis ${l.bid} · servi ${l.served}`);
    dire(`   ${l.source_title}`);
    if (!l.file_key) { dire(`   (aucune pièce gardée)`); continue; }
    try {
      const r = await rangeesDuPdf(await readSource(l.file_key));
      const texte = r.map((x) => x.cellules.map((c) => c.texte).join(" ")).join("\n");
      dire(texte.trim() ? `   --- texte de la pièce ---\n${texte.split("\n").map((x) => "   " + x).join("\n").slice(0, 2600)}` : `   PIÈCE SANS COUCHE TEXTE : c'est un scan, seul un lecteur de modèle y accède.`);
    } catch (e) { dire(`   illisible : ${e.message}`); }
  }
}
