/**
 * QUELS BULLETINS NOUS MANQUENT, ET COMMENT ON LE SAIT SANS DEMANDER.
 *
 * Le BOC porte un NUMÉRO DE SÉRIE que la BVMAC incrémente d'une séance à la
 * suivante. La suite des numéros est donc l'inventaire : un trou dans la suite
 * est un bulletin qui a paru et que nous n'avons pas. C'est plus sûr que de
 * compter les jours ouvrés, qui ne disent rien des jours fériés de six pays.
 *
 *   npx tsx --conditions=react-server scripts/boc-manquants.mjs
 */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);

const lignes = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("market_bulletins").select("session_date, number, file_key, source_url").order("session_date").range(de, de + 999);
  lignes.push(...(data ?? [])); if ((data ?? []).length < 1000) break;
}
dire(`${lignes.length} bulletin(s) en base`);
dire(`${lignes.filter((b) => b.file_key).length} avec une pièce gardée`);
const numerotes = lignes.filter((b) => b.number).sort((a, b) => a.number - b.number);
dire(`${numerotes.length} avec un numéro, de ${numerotes[0]?.number} à ${numerotes[numerotes.length - 1]?.number}\n`);

const vus = new Set(numerotes.map((b) => b.number));
const trous = [];
for (let n = numerotes[0].number; n <= numerotes[numerotes.length - 1].number; n++) if (!vus.has(n)) trous.push(n);
dire(`=== LA SUITE DES NUMÉROS ===`);
dire(`   attendus ${numerotes[numerotes.length - 1].number - numerotes[0].number + 1}`);
dire(`   MANQUANTS ${trous.length}\n`);
/* Les trous se lisent par plages : « 1900 à 1912 » dit une interruption,
   trente numéros isolés disent autre chose. */
const plages = [];
for (const n of trous) {
  const d = plages[plages.length - 1];
  if (d && n === d[1] + 1) d[1] = n; else plages.push([n, n]);
}
dire(`   ${plages.length} plage(s) :`);
for (const [a, b] of plages.slice(0, 40)) {
  const avant = numerotes.filter((x) => x.number < a).pop();
  const apres = numerotes.find((x) => x.number > b);
  dire(`      ${a === b ? a : `${a} à ${b}`}  (${b - a + 1})  entre le ${avant?.session_date ?? "?"} et le ${apres?.session_date ?? "?"}`);
}
if (plages.length > 40) dire(`      … et ${plages.length - 40} autre(s)`);

const sansNumero = lignes.filter((b) => !b.number);
if (sansNumero.length) dire(`\n   ${sansNumero.length} bulletin(s) en base SANS numéro : ${sansNumero.slice(0, 8).map((b) => b.session_date).join(" ")}`);
const sansPiece = lignes.filter((b) => !b.file_key);
if (sansPiece.length) dire(`   ${sansPiece.length} bulletin(s) SANS pièce gardée : ${sansPiece.slice(0, 8).map((b) => b.session_date).join(" ")}`);
