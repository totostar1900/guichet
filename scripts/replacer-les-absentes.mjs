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
const { storageKey } = await import("../src/lib/intake/cle.ts");
const { lotDuJournal } = await import("./_journal.mjs");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const replacer = process.argv.includes("--replacer");
const MARQUE = /\s\[[0-9a-f]{6}\]\.pdf$/;

const lot = await lotDuJournal(sb);

/** La place que l'index a enregistrée pour chaque clef de dépôt. */
const inscrites = new Map();
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("library_items").select("file_key, library_path").range(de, de + 999);
  for (const x of data ?? []) inscrites.set(x.file_key, x.library_path);
  if ((data ?? []).length < 1000) break;
}

/** Tous les fichiers de la bibliothèque, par nom nu : un seul parcours. */
const parNom = new Map();
const parcourir = (dossier) => {
  for (const e of fs.readdirSync(`${BIBLIO}/${dossier}`, { withFileTypes: true })) {
    const rel = `${dossier}/${e.name}`;
    if (e.isDirectory()) parcourir(rel);
    else {
      const nu = e.name.replace(MARQUE, ".pdf");
      parNom.set(nu, [...(parNom.get(nu) ?? []), rel]);
    }
  }
};
parcourir("1. Donnees de marche");

/**
 * L'ADRESSE DE CHAQUE PIÈCE TÉLÉCHARGÉE, prise dans l'inventaire.
 *
 * C'est le seul pont qui survive à un changement de règle : le dossier et le
 * nom se recalculent, l'adresse non. La dernière ligne fait foi, une pièce
 * reprise deux fois en ayant deux.
 */
const parAdresse = new Map();
const SOUS = "1. Donnees de marche";
const csv = `${BIBLIO}/${SOUS}/9. Index/inventaire.csv`;
if (fs.existsSync(csv)) {
  for (const ligne of fs.readFileSync(csv, "utf8").split(/\r?\n/).slice(1).filter(Boolean)) {
    const c = ligne.split(";");
    if (c[4] && c[7]?.startsWith("http")) parAdresse.set(c[7], `${SOUS}/${c[4]}`);
  }
}
const marques = marquesDeCollision(lot, cheminBeac);

/* Les chemins que la règle réclame : rien d'autre n'a le droit de bouger. */
const reclames = new Set(lot.map((o) => avecMarque(cheminBeac(o), marques.get(o.url))));

let replaces = 0;
let ambigus = 0;
let perdues = 0;
for (const o of lot) {
  const voulu = avecMarque(cheminBeac(o), marques.get(o.url));
  if (fs.existsSync(`${BIBLIO}/${voulu}`)) continue;
  const nu = path.basename(voulu).replace(MARQUE, ".pdf");
  /* DANS TOUT L'ARBRE : une pièce peut avoir changé de dossier parce que le
     lecteur la comprend mieux, pas seulement de nom. */
  /* L'ADRESSE D'ABORD, le nom ensuite : l'une survit à un changement de
     règle, l'autre non. */
  /* L'INDEX D'ABORD : c'est lui qui enregistre où la pièce est vraiment. */
  const parIndex = inscrites.get(storageKey(`beac/${decodeURIComponent(o.url.split("/").pop() ?? "")}`));
  const parUrl = (parIndex && fs.existsSync(`${BIBLIO}/${parIndex}`) ? parIndex : undefined) ?? parAdresse.get(o.url);
  const candidats =
    parUrl && fs.existsSync(`${BIBLIO}/${parUrl}`) && !reclames.has(parUrl) && parUrl !== voulu
      ? [parUrl]
      : (parNom.get(nu) ?? []).filter((rel) => !reclames.has(rel) && rel !== voulu);
  if (candidats.length === 1) {
    dire(`   ${replacer ? "replacée" : "à replacer"}  ${candidats[0].slice(-80)}\n              →  ${voulu.slice(-80)}`);
    if (replacer) {
      fs.mkdirSync(path.dirname(`${BIBLIO}/${voulu}`), { recursive: true });
      fs.renameSync(`${BIBLIO}/${candidats[0]}`, `${BIBLIO}/${voulu}`);
    }
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
