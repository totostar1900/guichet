/**
 * GQ1300000759 : LA SOURCE SE CONTREDIT ELLE-MEME, ET IL N'Y A PAS DE TIERS.
 *
 * La seance guineenne du 5 fevrier 2020 est decrite par deux pieces qui sont
 * le MEME document en deux langues. Tous les nombres coincident, sauf un :
 *
 *   francais  « Taux d'interet moyen pondere »      7,9231 %
 *   espagnol  « Tasa de interes media ponderada »   7,231 %
 *
 *   identiques de part et d'autre : 10 SVT au reseau, 3 souscripteurs,
 *   12.999 millions soumis, 12.999 servis, taux minimum 7,00 %, maximum
 *   9,00 %, limite 9,00 %, couverture 86,6600 %.
 *
 * Ce n'est donc PAS une faute de lecture : c'est une faute d'impression, et
 * nous ne savons pas de quel cote. Un caractere separe les deux lectures.
 *
 * CE QUI FERAIT PENCHER, SANS TRANCHER : ce Tresor imprime ses taux a quatre
 * decimales (7,1667 · 8,0236 · 7,6623 · 8,4384 · 6,3167 · 5,7682 · 7,3545 ·
 * 6,5562), et 7,9231 en a quatre quand 7,231 en a trois. Mais l'espagnol est
 * la langue de travail du Tresor equato-guineen, donc sa version est
 * vraisemblablement l'originale. Les deux arguments se valent.
 *
 * PAS DE TROISIEME TEMOIN : le bulletin trimestriel de la BEAC n'apparie
 * aucune seance guineenne, verifie le 16 octobre 2026.
 *
 * LA LIGNE REPART A RELIRE plutot que de servir de reference sous une
 * signature qui ne connaissait pas le desaccord. Une valeur contestee qui se
 * presente comme confirmee est le defaut que nous passons nos journees a
 * reparer ailleurs.
 *
 *   npx tsx --conditions=react-server scripts/reparer-gq1300000759.mjs [--ecrire]
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
const ecrire = process.argv.includes("--ecrire");

const { data, error } = await sb
  .from("auction_results")
  .select("id, rate_avg, confirmed_by, correction")
  .eq("code_emission", "GQ1300000759")
  .limit(1);
if (error) { dire(`ERREUR : ${error.message}`); process.exit(1); }
const r = data?.[0];
if (!r) { dire("INTROUVABLE"); process.exit(1); }

dire(`avant : escompte ${r.rate_avg}, signee par ${r.confirmed_by ?? "personne"}`);
dire("apres : escompte 7.923 inchange, ligne rouverte, desaccord nomme");
if (!ecrire) { dire("\nEssai a blanc. Relancer avec --ecrire."); process.exit(0); }

const note =
  "Les deux pièces de cette séance sont le même document en deux langues et ne diffèrent que par ce " +
  "taux : 7,9231 % au français, 7,231 % à l'espagnol. Tout le reste coïncide, y compris le taux de " +
  "couverture de 86,6600 %. C'est une faute d'impression de la source, et nous ne savons pas de quel " +
  "côté : ce Trésor imprime d'ordinaire quatre décimales, ce qui parle pour 7,9231, mais l'espagnol est " +
  "sa langue de travail, ce qui parle pour 7,231. Le bulletin trimestriel de la BEAC n'apparie aucune " +
  "séance guinéenne, donc il n'y a pas de troisième témoin. La valeur affichée reste 7,9231 % et la " +
  "ligne repart à relire : elle ne doit pas servir de référence tant que personne n'a tranché.";

const { error: e2 } = await sb
  .from("auction_results")
  .update({ confirmed_by: null, confirmed_at: null, correction: note, updated_at: new Date().toISOString() })
  .eq("id", r.id);
dire(e2 ? `ERREUR : ${e2.message}` : "\nRouverte, desaccord nomme.");
