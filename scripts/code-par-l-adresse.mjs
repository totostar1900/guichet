/**
 * QUAND LE CODE EST MUTILE, L ADRESSE DE LA PIECE LE PORTE.
 *
 * La BEAC nomme ses fichiers avec le code de la ligne :
 * « Communiqué-des-résultats-BTA-13S-220726_GA1100002292.pdf ». Quand la
 * lecture du scan rend « GA110000292 », il manque un 2 et le nom du fichier
 * le dit. Ce n est pas une deduction : c est un SECOND TEMOIN, publie par la
 * meme main que la piece.
 *
 * ON NE REPARE QUE SOUS TROIS CONDITIONS :
 *
 *   le code lu n a PAS la forme du CRCT (sinon il n y a rien a reparer) ;
 *   l adresse porte un code qui a la forme ;
 *   les deux sont a DEUX CARACTERES PRES l un de l autre, faute de quoi ce
 *   n est pas le meme code et l adresse parle d autre chose.
 *
 *   npx tsx --conditions=react-server scripts/code-par-l-adresse.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { tout } = await import("./_journal.mjs");
const { CANONIQUE, distance, codesDeLAdresse, nettoyer, reparerParLaForme } = await import("./_codes.mjs");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const nos = await tout(sb, "auction_results", "id, country, session_on, instrument, tenor, code_emission, source_url, source_title");
const tordus = nos.filter((n) => n.code_emission && !CANONIQUE(n.code_emission));
dire(`${nos.length} ligne(s) · ${tordus.length} code(s) qui n ont pas la forme du CRCT\n`);

const aFaire = [];
for (const n of tordus) {
  /* L ADRESSE D ABORD : c est un temoin publie, pas une deduction. */
  const candidats = codesDeLAdresse(n.source_url);
  let proche = candidats.find((c) => distance(String(n.code_emission), c) <= 2);
  let par = "l'adresse";
  /* A DEFAUT, LA FORME, quand une seule correction y mene. */
  if (!proche) {
    const propre = nettoyer(n.code_emission);
    if (propre && CANONIQUE(propre)) {
      proche = propre;
      par = "le nettoyage du champ";
    } else {
      const r = reparerParLaForme(propre ?? n.code_emission);
      if (r.code) {
        proche = r.code;
        par = "la forme, une seule correction y menant";
      }
    }
  }
  if (!proche) {
    dire(`   ${String(n.session_on).slice(0, 10)} ${String(n.country).padEnd(12)} « ${n.code_emission} » : ${candidats.length ? `l adresse dit « ${candidats.join(", ")} », trop loin` : "aucun témoin, aucune correction unique"}`);
    continue;
  }
  aFaire.push({ n, proche });
  dire(`   ${String(n.session_on).slice(0, 10)} ${String(n.country).padEnd(12)} « ${n.code_emission} »  →  « ${proche} »  (par ${par})`);
}
dire(`\n=== ${aFaire.length} code(s) réparable(s) par l'adresse, ${tordus.length - aFaire.length} sans témoin ===`);

/* Une reparation ne doit pas faire entrer la ligne en collision avec une autre. */
const clefs = new Set(nos.map((n) => `${n.country}|${String(n.session_on).slice(0, 10)}|${n.code_emission}`));
const heurts = aFaire.filter((x) => clefs.has(`${x.n.country}|${String(x.n.session_on).slice(0, 10)}|${x.proche}`));
if (heurts.length) {
  dire(`\n   ${heurts.length} réparation(s) heurteraient une ligne existante : elles désignent alors le MÊME tirage, et c'est une fusion, pas un renommage.`);
  for (const h of heurts) dire(`      ${h.n.session_on} ${h.n.country} « ${h.n.code_emission} » → « ${h.proche} » déjà pris`);
}

if (!ecrire) {
  dire(`\nEssai a blanc. Relancer avec --ecrire.`);
  process.exit(0);
}
let n = 0;
for (const x of aFaire) {
  if (heurts.includes(x)) continue;
  const { error } = await sb.from("auction_results").update({ code_emission: x.proche, updated_at: new Date().toISOString() }).eq("id", x.n.id);
  if (error) dire(`   ERREUR ${x.n.session_on} : ${error.message}`);
  else n++;
}
dire(`\n=== ${n} code(s) remis d'après l'adresse de leur pièce ===`);
