/** Combien de relevés d encours manquent, et sur combien de seances. */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const brut = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("debt_outstandings").select("isin, session_date").range(de, de + 999); brut.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
dire(`${brut.length} relevé(s) en base`);
const bornes = new Map();
for (const l of brut) { const b = bornes.get(l.isin) ?? { d1: l.session_date, d2: l.session_date }; if (l.session_date < b.d1) b.d1 = l.session_date; if (l.session_date > b.d2) b.d2 = l.session_date; bornes.set(l.isin, b); }
const presentes = new Set(brut.map((l) => `${l.isin}|${l.session_date}`));
const seances = [...new Set(brut.map((l) => l.session_date))].sort();
let manquants = 0; const trouees = new Set(); const parIsin = new Map();
for (const [isin, b] of bornes) for (const s of seances) {
  if (s < b.d1 || s > b.d2 || presentes.has(`${isin}|${s}`)) continue;
  manquants++; trouees.add(s); parIsin.set(isin, (parIsin.get(isin) ?? 0) + 1);
}
dire(`${seances.length} séance(s), ${bornes.size} ligne(s)`);
dire(`LIGNES MANQUANTES ${manquants} sur ${trouees.size} séance(s), ${parIsin.size} ISIN touché(s)`);
dire(`attendus ${[...bornes.values()].reduce((a, b) => a + seances.filter((s) => s >= b.d1 && s <= b.d2).length, 0)}`);
dire(`\n   les dix plus touchés :`);
for (const [i, n] of [...parIsin.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) dire(`      ${i}  ${n} séance(s)`);
