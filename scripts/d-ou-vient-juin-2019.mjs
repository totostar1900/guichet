/**
 * D OU VIENNENT NOS PIECES DE JUIN 2019, QUE L INDEX NE MONTRE PLUS ?
 *
 * L index de la BEAC s arrete au 14 aout 2019, et notre base porte le
 * 5 juin. L une des deux affirmations suivantes est vraie, et elles ne
 * se reparent pas pareil :
 *
 *   L INDEX A MAIGRI. La BEAC a retire des pieces qu elle publiait quand
 *   nous avons ramasse. Les fichiers peuvent survivre a leur adresse.
 *
 *   NOUS LES TENONS D AILLEURS. Un autre site, un bulletin, une main.
 *
 * L adresse de la piece repond, et on la lui demande.
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const lire = async (table) => {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(table).select("country,session_on,source_title,source_url,created_at").range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out.map((r) => ({ ...r, table }));
};
const toutes = [...(await lire("auction_results")), ...(await lire("emission_notices"))].filter((r) => r.session_on);
toutes.sort((a, b) => a.session_on.localeCompare(b.session_on));

dire(`=== LES DOUZE PLUS ANCIENNES PIECES DE NOTRE BASE ===`);
for (const r of toutes.slice(0, 12)) {
  dire(`   ${r.session_on} ${String(r.country).padEnd(18)} ${r.table === "auction_results" ? "resultat" : "avis    "} ramasse le ${String(r.created_at).slice(0, 10)}`);
  dire(`      ${decodeURIComponent(String(r.source_url))}`);
}

dire(`\n=== L HOTE DE CHAQUE PIECE D AVANT SEPTEMBRE 2019 ===`);
const hotes = {};
for (const r of toutes.filter((r) => r.session_on < "2019-09-01")) {
  let h = "adresse illisible";
  try { h = new URL(String(r.source_url)).host; } catch { /* rien */ }
  hotes[h] = (hotes[h] ?? 0) + 1;
}
for (const [h, n] of Object.entries(hotes).sort((a, b) => b[1] - a[1])) dire(`   ${h.padEnd(34)} ${String(n).padStart(3)}`);

dire(`\n=== CES ADRESSES REPONDENT-ELLES ENCORE ? ===`);
const aTester = toutes.filter((r) => r.session_on < "2019-09-01").slice(0, 8);
for (const r of aTester) {
  let etat = "—";
  try {
    const res = await fetch(String(r.source_url), { method: "HEAD", headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" }, signal: AbortSignal.timeout(45_000) });
    etat = `${res.status} · ${res.headers.get("content-type") ?? "?"} · ${res.headers.get("content-length") ?? "?"} octets`;
  } catch (e) {
    etat = `injoignable · ${String(e.message).slice(0, 48)}`;
  }
  dire(`   ${r.session_on} ${String(r.country).padEnd(16)} ${etat}`);
}

dire(`\n=== QUAND AVONS-NOUS RAMASSE CES PIECES-LA ? ===`);
const parJour = {};
for (const r of toutes.filter((r) => r.session_on < "2019-09-01")) {
  const j = String(r.created_at).slice(0, 10);
  parJour[j] = (parJour[j] ?? 0) + 1;
}
for (const [j, n] of Object.entries(parJour).sort()) dire(`   ${j}  ${String(n).padStart(3)} piece(s)`);
