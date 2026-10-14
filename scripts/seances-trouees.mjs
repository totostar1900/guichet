/** Les séances où une ligne attendue manque, une par ligne, pour la relecture. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const brut = [];
for (let de = 0; ; de += 1000) { const { data } = await sb.from("debt_outstandings").select("isin, session_date").range(de, de + 999); brut.push(...(data ?? [])); if ((data ?? []).length < 1000) break; }
const bornes = new Map();
for (const l of brut) { const b = bornes.get(l.isin) ?? { d1: l.session_date, d2: l.session_date }; if (l.session_date < b.d1) b.d1 = l.session_date; if (l.session_date > b.d2) b.d2 = l.session_date; bornes.set(l.isin, b); }
const presentes = new Set(brut.map((l) => `${l.isin}|${l.session_date}`));
const seances = [...new Set(brut.map((l) => l.session_date))].sort();
const trouees = new Set();
for (const [isin, b] of bornes) for (const s of seances) if (s >= b.d1 && s <= b.d2 && !presentes.has(`${isin}|${s}`)) trouees.add(s);
fs.writeSync(1, [...trouees].sort().join("\n") + "\n");
