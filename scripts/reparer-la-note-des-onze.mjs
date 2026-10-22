/**
 * UNE NOTE QUI EXPLIQUE UN NOMBRE PAR UNE FAUSSE CAUSE.
 *
 * En corrigeant les onze seances gabonaises, j ai ecrit que les quelques
 * milliemes restants venaient « de la convention de decompte des jours du
 * coupon couru ». La mesure du residu dement cette phrase :
 *
 *   le couru varie d un facteur cinq, de 1,16 a 5,66 points ;
 *   le residu, lui, reste entre 0,023 et 0,035 point, moyenne 0,028 ;
 *   la correlation entre les deux vaut 0,10, la pente 0,0003.
 *
 * Un ecart de decompte des jours grandirait AVEC le couru. Celui-ci n en
 * depend pas. Ce n est donc pas un defaut de calcul : c est la MARGE REELLE
 * entre la moyenne des prix servis et le prix limite, qui est le plus bas
 * d entre eux. Une moyenne au-dessus de sa borne basse, c est la normale.
 *
 * La phrase fausse est remplacee, et la note dit qu elle l a ete. Une
 * explication erronee vieillit en silence et finit par faire autorite.
 *
 *   npx tsx --conditions=react-server scripts/reparer-la-note-des-onze.mjs [--ecrire]
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

const MESURE =
  "Rectifié le 17 octobre 2026. Cette note attribuait d'abord les quelques millièmes restants à la convention de décompte des jours du coupon couru. " +
  "La mesure le dément : sur les huit séances qui tombent à moins de 0,2 point du prix limite, le coupon couru varie d'un facteur cinq, de 1,16 à 5,66 points, " +
  "pendant que le reste tient entre 0,023 et 0,035 point, pour une moyenne de 0,028, une corrélation de 0,10 et une pente de 0,0003. " +
  "Un écart de décompte grandirait avec le couru ; celui-ci n'en dépend pas. Ce n'est donc pas un défaut de calcul, c'est la marge réelle entre la moyenne des prix servis " +
  "et le prix limite, qui en est le plus bas : une moyenne au-dessus de sa borne basse est la normale, et sa petitesse dit que presque tout a été servi au limite.";

const toutes = await repo().listAuctionResults({ limit: 2000 });
const vise = toutes.filter((r) => r.correction?.includes("convention de décompte des jours"));
dire(`${vise.length} note(s) portant la fausse cause\n`);

let n = 0;
for (const r of vise) {
  if (r.correction.includes("Rectifié le 17 octobre 2026")) {
    dire(`   ${r.sessionOn} ${r.codeEmission} : deja rectifiee, laissee`);
    continue;
  }
  dire(`   ${r.sessionOn} ${r.codeEmission}`);
  if (!ecrire) continue;
  const { error } = await sb
    .from("auction_results")
    .update({ correction: `${r.correction}\n\n${MESURE}`, updated_at: new Date().toISOString() })
    .eq("id", r.id);
  if (error) dire(`      ERREUR : ${error.message}`);
  else n++;
}
dire(ecrire ? `\n=== ${n} note(s) rectifiee(s) ===` : `\nEssai a blanc. Relancer avec --ecrire.`);
