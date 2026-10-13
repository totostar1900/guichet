/** Les montants qui ne peuvent pas être vrais, et ce que la pièce dit.
 *    npx tsx --conditions=react-server scripts/adjudications-unites.mjs */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const { data } = await sb.from("auction_results").select("*").order("session_on");
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/* UN ORDRE DE GRANDEUR N EST PAS UN SEUIL ARBITRAIRE. Une seance d adjudication
   de la zone leve entre un et cent milliards. Dix fois plus haut ou mille fois
   plus bas, ce n est pas un record, c est une unite. */
dire(`=== AU-DESSUS DE 300 MDS SERVIS EN UNE SEANCE ===`);
for (const l of data.filter((x) => Number(x.served) > 3e11).sort((a, b) => b.served - a.served))
  dire(`   ${l.session_on}  ${l.country} ${l.instrument} ${String(l.tenor).padEnd(12)} servi ${mds(l.served).padStart(12)} Mds · annoncé ${mds(l.announced ?? 0).padStart(10)} · soumis ${mds(l.bid ?? 0).padStart(10)} · ${l.set_aside_reason ? "ÉCARTÉE" : l.confirmed_by ? "confirmée" : "non relue"}\n      ${l.source_title?.slice(0, 120)}`);

dire(`\n=== AU-DESSOUS DE 100 MILLIONS SERVIS ===`);
for (const l of data.filter((x) => x.served != null && Number(x.served) < 1e8).sort((a, b) => a.served - b.served))
  dire(`   ${l.session_on}  ${l.country} ${l.instrument} ${String(l.tenor).padEnd(12)} servi ${Number(l.served).toLocaleString("fr-FR").padStart(16)} F · annoncé ${Number(l.announced ?? 0).toLocaleString("fr-FR").padStart(16)} · ${l.set_aside_reason ? "ÉCARTÉE" : l.confirmed_by ? "confirmée" : "non relue"}`);

dire(`\n=== LES ÉCARTÉES ===`);
for (const l of data.filter((x) => x.set_aside_reason)) dire(`   ${l.session_on}  ${l.country} ${l.instrument}  « ${l.set_aside_reason} »  par ${l.set_aside_by ?? "?"}`);
