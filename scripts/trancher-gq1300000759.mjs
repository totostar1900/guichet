/**
 * GQ1300000759 : LE FRANCAIS FAIT FOI, ARBITRE PAR GEORGES LE 16 OCTOBRE 2026.
 *
 * Les deux pieces de la seance guineenne du 5 fevrier 2020 sont le meme
 * document en deux langues et ne differaient que par le taux moyen pondere :
 * 7,9231 % au francais, 7,231 % a l'espagnol. Aucun troisieme temoin, le
 * bulletin trimestriel n'appariant aucune seance guineenne. Georges tranche
 * pour le francais.
 *
 * LA VALEUR NE BOUGE PAS, ET C'EST UN PIEGE A SIGNALER : `rate_avg` est en
 * numeric(6,3), donc 7,9231 s'y range en 7,923 et la quatrieme decimale
 * n'existe pas en base. Le Tresor equato-guineen imprime pourtant quatre
 * decimales sur toutes ses pieces. La base ne peut donc jamais reproduire
 * exactement le chiffre imprime pour ce Tresor : l'ecart plafonne a cinq
 * dix-millemes de point, negligeable pour une courbe, mais il faut le savoir
 * avant de comparer un de nos taux a un taux publie.
 *
 * LA SIGNATURE RESTE A POSER AU DESK. Georges a tranche la valeur, il n'a
 * pas signe la ligne, et un script ne signe pas a sa place : c'est la regle
 * de la maison. La ligne reste donc a relire, avec l'arbitrage ecrit dedans
 * pour que la confirmation soit un clic.
 *
 *   npx tsx --conditions=react-server scripts/trancher-gq1300000759.mjs [--ecrire]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ecrire = process.argv.includes("--ecrire");

const URL_FR = "https://www.beac.int/wp-content/uploads/2020/02/COMMUNIQUE-RESULTATS_BTA_GE_05-02-2020.pdf";
const TITRE_FR = "Communiqué des résultats d'adjudication des BTA du 05 février 2020 - République de Guinée Equatoriale";

const { data, error } = await sb
  .from("auction_results")
  .select("id, rate_avg, source_url, confirmed_by")
  .eq("code_emission", "GQ1300000759")
  .limit(1);
if (error) { dire(`ERREUR : ${error.message}`); process.exit(1); }
const r = data?.[0];
if (!r) { dire("INTROUVABLE"); process.exit(1); }

dire(`taux    : ${r.rate_avg}  (7,9231 arrondi par la colonne numeric(6,3))`);
dire(`piece   : ${r.source_url?.split("/").pop()}`);
dire(`a citer : ${URL_FR.split("/").pop()}`);
if (!ecrire) { dire("\nEssai a blanc. Relancer avec --ecrire."); process.exit(0); }

const note =
  "Arbitré par Georges le 16 octobre 2026 : le français fait foi. Les deux pièces de cette séance sont " +
  "le même document en deux langues et ne différaient que par le taux moyen pondéré, 7,9231 % au " +
  "français contre 7,231 % à l'espagnol, tout le reste coïncidant y compris le taux de couverture de " +
  "86,6600 %. Il n'existe pas de troisième témoin : le bulletin trimestriel de la BEAC n'apparie aucune " +
  "séance guinéenne. La pièce citée est désormais la française. " +
  "Réserve de précision : la colonne stocke trois décimales, donc 7,9231 % y figure en 7,923 %.";

const { error: e2 } = await sb
  .from("auction_results")
  .update({ rate_avg: 7.9231, source_url: URL_FR, source_title: TITRE_FR, correction: note, updated_at: new Date().toISOString() })
  .eq("id", r.id);
dire(e2 ? `ERREUR : ${e2.message}` : "\nTranche. La piece francaise est citee, et la signature reste a poser au desk.");
