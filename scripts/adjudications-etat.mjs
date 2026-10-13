/** L'état exact de la table des adjudications, avant de décider quoi ramasser.
 *    npx tsx --conditions=react-server scripts/adjudications-etat.mjs */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("auction_results").select("*").order("session_on").range(de, de + 999);
  if (error) throw new Error(error.message);
  lignes.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
dire(`${lignes.length} séance(s) en base\n`);

const compte = (quoi, f) => dire(`   ${quoi.padEnd(42)} ${String(lignes.filter(f).length).padStart(5)}`);
dire(`=== CE QUE CHAQUE LIGNE PORTE ===`);
compte("lue par le robot (read_at)", (l) => l.read_at);
compte("jamais ouverte", (l) => !l.read_at);
compte("confirmée par une personne", (l) => l.confirmed_by);
compte("écartée", (l) => l.set_aside_reason);
compte("pièce gardée (file_key)", (l) => l.file_key);
dire(``);
dire(`=== CE QU'IL FAUT POUR UN ENCOURS ===`);
compte("montant SERVI", (l) => l.served != null);
compte("échéance imprimée", (l) => l.maturity_on);
compte("durée (tenor)", (l) => l.tenor);
compte("servi ET échéance  ← reconstituable", (l) => l.served != null && l.maturity_on);
compte("servi SANS échéance", (l) => l.served != null && !l.maturity_on);
dire(``);
dire(`=== PAR PAYS ET INSTRUMENT ===`);
const par = new Map();
for (const l of lignes) {
  const k = `${l.country} ${l.instrument}`;
  const v = par.get(k) ?? { n: 0, servi: 0, avecServi: 0, avecEcheance: 0 };
  v.n++; if (l.served != null) { v.avecServi++; v.servi += Number(l.served); } if (l.maturity_on) v.avecEcheance++;
  par.set(k, v);
}
const mds = (n) => (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
for (const [k, v] of [...par.entries()].sort()) dire(`   ${k.padEnd(12)} ${String(v.n).padStart(4)} séance(s) · ${String(v.avecServi).padStart(4)} avec servi · ${String(v.avecEcheance).padStart(4)} avec échéance · ${mds(v.servi).padStart(8)} Mds levés`);
dire(``);
const dates = lignes.map((l) => l.session_on).filter(Boolean).sort();
dire(`   de ${dates[0]} à ${dates[dates.length - 1]}`);
