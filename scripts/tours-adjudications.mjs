/** Le robot de lecture des adjudications tourne-t-il encore, et rend-il quelque chose ? */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const { data } = await sb.from("robot_tours").select("*").order("fini_le", { ascending: false }).limit(14);
if (!data?.length) { dire("aucun tour en base"); process.exit(0); }
dire(`${"robot".padEnd(22)} ${"fini".padEnd(22)} resultat`);
for (const t of data) dire(`${String(t.cle ?? t.robot ?? "?").padEnd(22)} ${String(t.fini_le ?? "").slice(0, 19).padEnd(22)} ${JSON.stringify(t.resultat ?? t.detail ?? t.note ?? "").slice(0, 110)}`);
