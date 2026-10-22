/**
 * LE TROISIEME TEMOIN, INSCRIT SUR LA LIGNE.
 *
 * ECRIRE L HISTORIQUE AVANT DE SE DECLARER SATISFAIT. La note posee hier
 * sur l OTA du 12 juin 2019 ne citait que deux temoins deductifs ; le
 * registre de l encours en est un troisieme, et il ne deduit rien.
 *
 *   npx tsx --conditions=react-server scripts/note-ota-12-juin-registre.mjs [--ecrire]
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

const CODE = "GA2J00000085";
const { data: rows, error } = await sb.from("auction_results").select("id,session_on,maturity_on,correction").eq("code_emission", CODE);
if (error) throw new Error(error.message);
if (rows?.length !== 1) { dire(`${rows?.length ?? 0} seance(s) portent ${CODE} : on s arrete.`); process.exit(1); }
const r = rows[0];

const NOTE =
  `Confirmée le ${new Date().toISOString().slice(0, 10)} par un TROISIÈME TÉMOIN, qui ne déduit rien : le registre de l'encours du bulletin trimestriel de la BEAC. ` +
  `La ligne ${CODE} y figure dans huit bulletins, du n°9 (mars 2020) au n°16 (décembre 2021). SIX d'entre eux portent exactement « émise le 29 mars 2019, échéance le 29 mars 2022, 3 305 000 titres de 10 000 FCFA, soit 33,05 milliards ». ` +
  `Les deux autres se lisent comme des fautes de lecture et non comme des désaccords : le n°9 donne une émission au 10 avril 2019 avec un nominal de 1 500 000 et un encours de 10 000, deux valeurs interverties ; ` +
  `le n°11 attribue à ce code les chiffres d'une ligne à cinq ans de 2020, tandis qu'il donne au code voisin GA2J00000093 ceux de celle-ci, ce qui est un décalage d'une rangée. La majorité fait foi, et elle est de six contre un. ` +
  `LE RÈGLEMENT AU 29 MARS 2019 EST UN VENDREDI, donc la séance mère est le mercredi 27 mars 2019, et les 101 séances gabonaises de notre base sont toutes des mercredis. ` +
  `Cette date avait été déduite AVANT la lecture du registre, par la règle des trois ans et par le jour de la semaine ; le registre la confirme au jour près, sans l'avoir servie. ` +
  `LA SÉANCE MÈRE N'EST PAS PUBLIÉE : lue sur ses neuf pages avec le lecteur de la maison, la BEAC ne porte aucune adjudication avant le 5 juin 2019. La ligne est prouvée, la séance qui l'a créée ne l'est pas, et ces deux faits tiennent ensemble parce qu'un encours est un état du stock et non le compte rendu d'une séance.`;

dire(`   ${r.session_on} ${CODE} · echeance ${r.maturity_on}`);
dire(`   la note porte ${String(r.correction ?? "").length} caracteres`);
if (String(r.correction ?? "").includes("TROISIÈME TÉMOIN")) { dire(`\n   le troisieme temoin y est deja : rien a faire.`); process.exit(0); }
if (!ecrire) { dire(`\nEssai a blanc. Relancer avec --ecrire.`); process.exit(0); }

const { error: e2 } = await sb
  .from("auction_results")
  .update({ correction: r.correction ? `${r.correction}\n\n${NOTE}` : NOTE, updated_at: new Date().toISOString() })
  .eq("id", r.id);
if (e2) { dire(`   ERREUR : ${e2.message}`); process.exit(1); }
dire(`\n=== LE TROISIEME TEMOIN EST INSCRIT ===`);
