/**
 * CM1300000484 : L'ESCOMPTE ET LE RENDEMENT RANGÉS DANS LE MÊME CHAMP.
 *
 * Le communiqué camerounais du 18 mars 2020 imprime DEUX taux, et c'est la
 * règle de la maison pour un bon précompté :
 *
 *   Taux d'intérêt moyen pondéré    3,41 %   <- l'escompte
 *   Taux de rendement moyen pondéré 3,52 %   <- le rendement
 *
 * La ligne portait 3,52 dans `rate_avg` ET dans `yield_avg` : le rendement
 * avait été rangé dans le champ de l'escompte, et l'escompte perdu. Le
 * bulletin trimestriel de la BEAC dit 3,41, comme la pièce.
 *
 * TROIS FOIS LA MÊME FAUTE, LE MÊME JOUR. Ce matin je prenais un escompte
 * pour un rendement en rapprochant les guinéennes ; cet après-midi j'ai
 * « rendu à sa valeur signée » un 3,52 qui était le rendement mis à la place
 * de l'escompte, croyant réparer un écrasement. Un champ dont le nom ne dit
 * pas la convention se remplit un jour de travers.
 *
 * LA LIGNE REPART À RELIRE. Sa valeur a changé après sa signature : une
 * signature couvre un chiffre, pas une ligne. Celle-ci est d'essai (« Test
 * Toto »), aucune des dix signatures de Georges n'est concernée, mais la
 * règle ne dépend pas de qui a signé.
 *
 *   npx tsx --conditions=react-server scripts/reparer-cm1300000484.mjs [--ecrire]
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
  .select("id, rate_avg, yield_avg, confirmed_by, confirmed_at")
  .eq("code_emission", "CM1300000484")
  .limit(1);
if (error) { dire(`ERREUR : ${error.message}`); process.exit(1); }
const r = data?.[0];
if (!r) { dire("INTROUVABLE"); process.exit(1); }

dire(`avant : escompte ${r.rate_avg}  rendement ${r.yield_avg}  signee par ${r.confirmed_by ?? "personne"}`);
dire(`apres : escompte 3.41          rendement 3.52       a relire`);

if (!ecrire) { dire("\nEssai a blanc. Relancer avec --ecrire."); process.exit(0); }

const note =
  "Escompte et rendement étaient rangés dans le même champ. Le communiqué du 18 mars 2020 imprime " +
  "« Taux d'intérêt moyen pondéré : 3,41 % » et « Taux de rendement moyen pondéré : 3,52 % » ; la ligne " +
  "portait 3,52 dans les deux. L'escompte est rendu à 3,41, le rendement reste 3,52, et le bulletin " +
  "trimestriel de la BEAC confirme 3,41. La ligne repart à relire : sa valeur a changé après sa signature, " +
  "et une signature couvre un chiffre, pas une ligne.";

const { error: e2 } = await sb
  .from("auction_results")
  .update({ rate_avg: 3.41, yield_avg: 3.52, confirmed_by: null, confirmed_at: null, correction: note, updated_at: new Date().toISOString() })
  .eq("id", r.id);
dire(e2 ? `ERREUR : ${e2.message}` : "\nCorrigee et rouverte.");
