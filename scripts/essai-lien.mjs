/** Un lien de bibliotheque, pour que quelqu un le clique et confirme. */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const { lienBibliotheque } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
for (const motif of ["2. BVMAC%", "%Adjudications - resultats/Tchad%2024-01-24%", "%Calendriers%"]) {
  const { data } = await sb.from("library_items").select("file_key, library_path, bytes").like("library_path", motif).limit(1);
  for (const r of data ?? []) dire(`${r.library_path}\n   ${Math.round(r.bytes / 1024)} Ko\n   ${lienBibliotheque(r.library_path)}\n`);
}
