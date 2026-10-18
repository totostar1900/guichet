/**
 * LA LIGNE GABONAISE A 5,75 % DU 29 MARS 2022, DANS LE REGISTRE DE LA BEAC.
 *
 * Le bulletin trimestriel porte l encours LIGNE A LIGNE (table
 * beac_encours_lignes). Si une obligation gabonaise de trois ans a 5,75 %
 * echeant le 29 mars 2022 a existe, elle y figure, et le registre tranche
 * SANS QUE LA SEANCE MERE SOIT PUBLIEE : l encours est un etat du stock,
 * pas le compte rendu d une seance.
 *
 * C est un temoin d une autre nature que l etiquette : ni le meme
 * document, ni le meme service, ni la meme date.
 *
 *   npx tsx --conditions=react-server scripts/ligne-gabon-mars-2022.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const { data: une, error: e0 } = await sb.from("beac_encours_lignes").select("*").limit(1);
if (e0) { dire(`beac_encours_lignes : ${e0.message}`); process.exit(1); }
if (!une?.length) { dire(`beac_encours_lignes est vide`); process.exit(1); }
const COLS = Object.keys(une[0]);
dire(`colonnes : ${COLS.join(", ")}\n`);

const toutes = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("beac_encours_lignes").select("*").range(de, de + 999);
  if (error) throw new Error(error.message);
  toutes.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
dire(`${toutes.length} lignes\n`);

/** Tout le texte d une ligne, pour chercher sans supposer le nom d une colonne. */
const texte = (r) => Object.values(r).map((v) => String(v ?? "")).join(" ");
const col = (r, ...noms) => { for (const n of noms) if (r[n] != null && String(r[n]).trim() !== "") return r[n]; return undefined; };

dire(`=== LE CODE GA2J00000085, OU UN CODE VOISIN ===`);
for (const motif of ["GA2J00000085", "GA2J0000008", "0000085"]) {
  const v = toutes.filter((r) => texte(r).includes(motif));
  dire(`   « ${motif} » : ${v.length} ligne(s)`);
  for (const r of v.slice(0, 6)) dire(`      ${JSON.stringify(r)}`);
}

dire(`\n=== TOUTE LIGNE GABONAISE ECHEANT EN MARS 2022 ===`);
const mars = toutes.filter((r) => /gabon/i.test(texte(r)) && /2022-03|29[-/ ]0?3[-/ ]2022|mars[- ]2022|MARS[- ]2022/i.test(texte(r)));
dire(`   ${mars.length} ligne(s)`);
for (const r of mars.slice(0, 12)) dire(`      ${JSON.stringify(r)}`);

dire(`\n=== TOUTE LIGNE GABONAISE A 5,75 % ===`);
const cinq = toutes.filter((r) => /gabon/i.test(texte(r)) && /5[,.]75/.test(texte(r)));
dire(`   ${cinq.length} ligne(s)`);
for (const r of cinq.slice(0, 20)) dire(`      ${JSON.stringify(r).slice(0, 220)}`);

dire(`\n=== JUSQU OU LE REGISTRE REMONTE-T-IL ? ===`);
const datees = toutes.map((r) => String(col(r, "as_of", "arrete_on", "session_on", "on", "observed_on", "quarter_on") ?? "")).filter((d) => /^\d{4}-\d{2}/.test(d)).sort();
if (datees.length) {
  dire(`   du ${datees[0]} au ${datees[datees.length - 1]}`);
  const parArret = {};
  for (const d of datees) parArret[d.slice(0, 7)] = (parArret[d.slice(0, 7)] ?? 0) + 1;
  for (const [d, n] of Object.entries(parArret).sort().slice(0, 12)) dire(`   ${d}  ${String(n).padStart(4)} ligne(s)`);
} else {
  dire(`   aucune colonne de date reconnue parmi : ${COLS.join(", ")}`);
}

dire(`\n=== LES DIX PREMIERES LIGNES GABONAISES, TELLES QUELLES ===`);
for (const r of toutes.filter((r) => /gabon/i.test(texte(r))).slice(0, 10)) dire(`   ${JSON.stringify(r).slice(0, 240)}`);
