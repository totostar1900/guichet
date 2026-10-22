/**
 * DEUX SEANCES TCHADIENNES OU LE SERVI DEPASSE LES SOUMISSIONS.
 *
 * C est impossible, et pourtant les deux sont SIGNEES, avec l anomalie
 * acquittee. Acquitter avait fait taire le panneau sans rien resoudre.
 *
 * LE TAUX DE COUVERTURE DESIGNE LA CASE FAUTIVE, et ce n est pas la meme
 * des deux cotes. Il est imprime a cote de ses deux termes, donc il se
 * verifie sans rien supposer.
 *
 *   2020-02-05 : couverture 117,65 % = 9 720 / 8 262, soit SERVI sur
 *   annonce. Elle confirme l annonce et le servi, et designe les
 *   soumissions, 9 262, comme le nombre de trop. Mieux : la piece porte
 *   une couche de texte, et elle imprime bien 9 262. NOTRE LECTURE EST
 *   FIDELE, et c est le Tresor qui se contredit.
 *
 *   2020-07-29 : couverture 94,25 % = 7 592 / 8 055, soit SOUMISSIONS sur
 *   annonce. Elle confirme l annonce et les soumissions, et designe le
 *   servi, 8 055, comme le nombre de trop. Or 8 055 est exactement le
 *   montant annonce, que l avis d emission confirme de son cote. La piece
 *   est un scan muet : nous ne pouvons pas verifier notre lecture, et
 *   l hypothese la plus simple est que l annonce a ete recopiee dans la
 *   case du servi.
 *
 * UNE INTUITION ECARTEE PAR LA MESURE. « Servi egal a l annonce » semblait
 * une signature ; c est le cas NORMAL, cent vingt-trois fois sur deux cent
 * quarante-quatre. Seule la couverture tranche.
 *
 * ON NE TOUCHE A AUCUN CHIFFRE. L un est fidele a sa piece, l autre est
 * signe et sa vraie valeur est inconnue : un Tresor ne se corrige pas par
 * script, et une case videe sans decision vaut moins qu une case fausse
 * expliquee.
 *
 *   npx tsx --conditions=react-server scripts/noter-les-deux-tchadiennes.mjs [--ecrire]
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

const NOTES = {
  "2020-02-05":
    `Le Trésor se contredit, et notre lecture lui est fidèle. La pièce imprime un montant annoncé de 8 262 millions, des soumissions de 9 262 millions, un montant servi de 9 720 millions et un taux de couverture de 117,65 %. ` +
    `Or 9 720 / 8 262 fait exactement 117,65 %, quand 9 262 / 8 262 fait 112,10 % : le taux de couverture confirme l'annoncé et le servi, et désigne les soumissions comme le nombre de trop. ` +
    `Un Trésor ne peut pas servir plus qu'on ne lui a offert, donc la pièce se contredit elle-même. ` +
    `La vérification est allée jusqu'au bout : ce communiqué porte une couche de texte, et elle imprime bien « Montant total des soumissions (en millions de FCFA) 9262 ». Aucune valeur n'est donc modifiée, la contradiction étant à la source et non dans la lecture. ` +
    `Établi le 17 octobre 2026.`,
  "2020-07-29":
    `Le montant servi est impossible, et nous ne pouvons pas le corriger. La pièce donne un montant annoncé de 8 055 millions, des soumissions de 7 592 millions, un montant servi de 8 055 millions et un taux de couverture de 94,25 %. ` +
    `Or 7 592 / 8 055 fait exactement 94,25 % : le taux de couverture confirme l'annoncé et les soumissions, et désigne le servi comme le nombre de trop, puisqu'un Trésor ne sert pas plus qu'on ne lui a offert. ` +
    `Le servi porte d'ailleurs exactement le montant annoncé, que l'avis d'émission de la séance confirme de son côté à 8 055 millions : l'hypothèse la plus simple est que l'annoncé a été recopié dans la case du servi au moment de la lecture. ` +
    `Elle n'est pas vérifiable : ce communiqué est un scan sans couche de texte, et seul un œil sur la pièce peut dire ce qu'elle imprime. ` +
    `La valeur est laissée en place plutôt que vidée, le temps d'une relecture : la séance en devient « servie partiellement », ce qui lui refuse la déduction du prix limite et la tient hors de la courbe. ` +
    `Noter que « servi égal à l'annoncé » n'est pas en soi un indice : c'est le cas normal, cent vingt-trois séances sur deux cent quarante-quatre. Seul le taux de couverture tranche. ` +
    `Établi le 17 octobre 2026.`,
};

const toutes = await repo().listAuctionResults({ limit: 2000 });
const vise = toutes.filter((r) => r.country === "Tchad" && NOTES[r.sessionOn] && Number(r.served) > Number(r.bid) + 1e6);
dire(`${vise.length} seance(s) visee(s)\n`);

let n = 0;
for (const r of vise) {
  if (r.correction?.includes("Établi le 17 octobre 2026")) {
    dire(`   ${r.sessionOn} ${r.codeEmission} : deja notee`);
    continue;
  }
  dire(`   ${r.sessionOn} ${r.codeEmission} · signee par ${r.confirmedBy ?? "personne"} · aucun chiffre ne bouge`);
  if (!ecrire) continue;
  const note = NOTES[r.sessionOn];
  const { error } = await sb
    .from("auction_results")
    .update({ correction: r.correction ? `${r.correction}\n\n${note}` : note, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`      ERREUR : ${error.message}`);
  else n++;
}
dire(ecrire ? `\n=== ${n} note(s) ecrite(s), aucun chiffre modifie ===` : `\nEssai a blanc. Relancer avec --ecrire.`);
