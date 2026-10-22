import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const t of process.argv.slice(2)) {
  const { data, error } = await sb.from(t).select("*").limit(1);
  fs.writeSync(1, `=== ${t} ===\n${error ? error.message : Object.keys(data?.[0] ?? {}).join(", ")}\n`);
  if (data?.[0]) fs.writeSync(1, `   exemple : ${JSON.stringify(data[0]).slice(0, 400)}\n`);
}
