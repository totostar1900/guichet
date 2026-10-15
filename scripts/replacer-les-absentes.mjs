/**
 * REMETTRE À LEUR CHEMIN CALCULÉ LES PIÈCES QUI SONT LÀ SOUS UN AUTRE NOM.
 *
 * Une marque de collision dépend de l'ensemble sur lequel on la calcule. Les
 * pièces ont été déplacées avec un ensemble, l'audit les cherche avec un
 * autre, et seize fichiers bien présents sont déclarés absents. Le lot de
 * référence est désormais partagé, mais LES FICHIERS DÉJÀ ÉCRITS PORTENT
 * ENCORE L'ANCIENNE MARQUE.
 *
 * On ne devine pas où ils sont : on cherche, dans le dossier que la règle
 * désigne, un fichier dont le nom est le même à la marque près. S'il y en a un
 * seul, c'est lui ; s'il y en a plusieurs, on ne choisit pas, on le dit.
 *
 *   npx tsx --conditions=react-server scripts/replacer-les-absentes.mjs [--replacer]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { createClient } = await import("@supabase/supabase-js");
const { cheminBeac, marquesDeCollision, avecMarque } = await import("../src/lib/intake/bibliotheque.ts");
const { lotDuJournal } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const replacer = process.argv.includes("--replacer");
const MARQUE = /\s\[[0-9a-f]{6}\]\.pdf$/;

const lot = await lotDuJournal(sb);
const marques = marquesDeCollision(lot, cheminBeac);

/* Les chemins que la règle réclame : rien d'autre n'a le droit de bouger. */
const reclames = new Set(lot.map((o) => avecMarque(cheminBeac(o), marques.get(o.url))));

let replaces = 0;
let ambigus = 0;
let perdues = 0;
for (const o of lot) {
  const voulu = avecMarque(cheminBeac(o), marques.get(o.url));
  if (fs.existsSync(`${BIBLIO}/${voulu}`)) continue;
  const dossier = `${BIBLIO}/${path.dirname(voulu)}`;
  const nu = path.basename(voulu).replace(MARQUE, ".pdf");
  const candidats = fs.existsSync(dossier)
    ? fs
        .readdirSync(dossier)
        .filter((f) => f.replace(MARQUE, ".pdf") === nu)
        .filter((f) => !reclames.has(`${path.dirname(voulu)}/${f}`))
    : [];
  if (candidats.length === 1) {
    dire(`   ${replacer ? "replacée" : "à replacer"}  ${candidats[0].slice(0, 80)}  →  ${path.basename(voulu).slice(0, 80)}`);
    if (replacer) fs.renameSync(`${dossier}/${candidats[0]}`, `${BIBLIO}/${voulu}`);
    replaces++;
  } else if (candidats.length > 1) {
    ambigus++;
    dire(`   AMBIGU   ${candidats.length} candidat(s) pour ${path.basename(voulu).slice(0, 80)}`);
  } else {
    perdues++;
    dire(`   ABSENTE  ${(o.titre ?? o.url).slice(0, 100)}`);
  }
}
dire(`\n=== ${replaces} ${replacer ? "replacée(s)" : "à replacer"} · ${ambigus} ambiguë(s) · ${perdues} vraiment absente(s) ===`);
if (!replacer && replaces) dire(`Relancer avec --replacer.`);
