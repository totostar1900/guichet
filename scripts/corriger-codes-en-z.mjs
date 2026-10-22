/**
 * LE CHIFFRE 2 LU COMME UN Z.
 *
 * Un code d emission CEMAC commence par deux lettres de pays puis un
 * CHIFFRE. Deux avis gabonais de 2019 portent « GAZ000000026 » et
 * « GAZA00000076 » : le lecteur a pris le 2 pour un Z sur un scan.
 *
 * La consequence n est pas cosmetique. Le rapprochement entre un resultat
 * et son avis se fait par le code : ces deux lignes ne se rapprochaient de
 * rien, en silence. C est ainsi qu une seance gabonaise a paru n avoir
 * aucun avis d emission alors qu elle en avait un.
 *
 * ON NE CORRIGE PAS SUR LA FORME. La forme dit seulement qu il y a faute,
 * pas quelle est la bonne valeur. Chaque code est rapproche d un resultat
 * d adjudication par DEUX champs independants, la duree ET l echeance, et
 * le script refuse d ecrire si le rapprochement n est pas unique.
 *
 *   npx tsx --conditions=react-server scripts/corriger-codes-en-z.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const avis = [];
for (let de = 0; ; de += 1000) {
  const { data, error } = await sb.from("emission_notices").select("id,country,session_on,code_emission,tenor,maturity_on").range(de, de + 999);
  if (error) throw new Error(error.message);
  avis.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}
const tordus = avis.filter((a) => a.code_emission && /^[A-Z]{2}[ZOSIB]/.test(a.code_emission));
dire(`${tordus.length} code(s) dont le troisieme caractere n est pas un chiffre\n`);

const resultats = await repo().listAuctionResults({ limit: 2000 });
let n = 0;
for (const a of tordus) {
  const candidats = resultats.filter(
    (r) => r.country === a.country && r.maturityOn === a.maturity_on && String(r.tenor) === String(a.tenor) && r.codeEmission,
  );
  const codes = [...new Set(candidats.map((r) => r.codeEmission))];
  if (codes.length !== 1) {
    dire(`   ${a.session_on} ${a.code_emission} : ${codes.length} candidat(s) [${codes.join(", ")}], NON TRANCHE, laisse`);
    continue;
  }
  dire(`   ${a.session_on} ${a.code_emission} → ${codes[0]}   (duree ${a.tenor}, echeance ${a.maturity_on}, ${candidats.length} resultat(s) d accord)`);
  if (!ecrire) continue;
  const { error } = await sb.from("emission_notices").update({ code_emission: codes[0] }).eq("id", a.id);
  if (error) dire(`      ERREUR : ${error.message}`);
  else n++;
}
dire(ecrire ? `\n=== ${n} code(s) remis d aplomb ===` : `\nEssai a blanc. Relancer avec --ecrire.`);
