/**
 * METTRE CHAQUE TABLEAU DE BORD À LA PLACE QUE LA RÈGLE LUI DONNE.
 *
 * La campagne de lecture les a lus mais n'en a déplacé que quatre, son
 * rattachement fichier → journal se trompant. Les chiffres sont en base et
 * rattachés ; il reste à poser les pièces là où le ramasseur les cherchera,
 * faute de quoi il les retéléchargera toutes à son prochain passage.
 *
 * CE N'EST PAS UN SIMPLE DÉPLACEMENT, C'EST UNE RÉCONCILIATION. Deux titres
 * de la même année se coupent au même endroit à cent dix signes : la règle
 * donne au second une marque de six signes, mais l'exemplaire déjà rangé
 * occupe le nom nu. Déplacer sans réconcilier laisse donc deux pièces à se
 * disputer un chemin, ce qui est exactement le défaut qu'on répare.
 *
 * EN DEUX TEMPS, ET C'EST NÉCESSAIRE : on passe d'abord tout ce qui bouge par
 * un nom provisoire, ensuite on pose les noms définitifs. Sans cela, renommer
 * A en B pendant que B existe encore écrase B.
 *
 *   npx tsx --conditions=react-server scripts/ranger-tableaux.mjs [--ranger]
 */
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const { avecMarque, cheminBeac, marquesDeCollision, nomDeFichier } = await import("../src/lib/intake/bibliotheque.ts");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ranger = process.argv.includes("--ranger");

const BIBLIO = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet";
const BEAC = `${BIBLIO}/1. Donnees de marche/1. BEAC - Marche des titres publics`;
const MARQUE = /\s\[[0-9a-f]{6}\]$/;

const obs = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from("beac_observations").select("url, titre, genre, pays, instrument, tenor, seance").range(de, de + 999);
  obs.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const vus = new Map();
for (const o of obs) if (/tableau/i.test(o.titre ?? "") && !vus.has(o.url)) vus.set(o.url, o);
const tableaux = [...vus.values()];
const marques = marquesDeCollision(tableaux, cheminBeac);
dire(`${tableaux.length} tableau(x) au journal, ${marques.size} marque(s) de collision\n`);

/** Tous les fichiers du dossier BEAC dont le nom dit « tableau ». */
function trouver(d) {
  if (!fs.existsSync(d)) return [];
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) out.push(...trouver(p));
    else if (/tableau/i.test(e.name) && e.name.toLowerCase().endsWith(".pdf")) out.push(p);
  }
  return out;
}
const surDisque = trouver(BEAC);
dire(`${surDisque.length} fichier(s) sur le disque`);

/* On rattache un fichier à sa pièce par le NOM, marque ôtée, puisque c'est la
   règle qui l'a écrit. Quand deux fichiers portent le même nom nu, l'année du
   dossier les sépare, et c'est l'ordre de lecture qui tranche le reste. */
const parNomNu = new Map();
for (const o of tableaux) parNomNu.set(nomDeFichier(o.titre), [...(parNomNu.get(nomDeFichier(o.titre)) ?? []), o]);

const prevu = [];
const sansPiece = [];
const dejaPris = new Set();
for (const f of surDisque.sort()) {
  const nu = path.basename(f, ".pdf").replace(MARQUE, "");
  const candidates = (parNomNu.get(nu) ?? []).filter((o) => !dejaPris.has(o.url));
  if (!candidates.length) {
    sansPiece.push(f);
    continue;
  }
  /* Entre deux homonymes, celui dont l'année du dossier correspond. */
  const an = path.basename(path.dirname(f));
  const o = candidates.find((x) => cheminBeac(x).includes(`/${an}/`)) ?? candidates[0];
  dejaPris.add(o.url);
  const cible = `${BIBLIO}/${avecMarque(cheminBeac(o), marques.get(o.url))}`;
  if (path.resolve(f) !== path.resolve(cible)) prevu.push({ de: f, vers: cible });
}

dire(`\n=== CE QUI BOUGE ===`);
dire(`   fichiers déjà à leur place   ${surDisque.length - prevu.length - sansPiece.length}`);
dire(`   fichiers à déplacer          ${prevu.length}`);
dire(`   fichiers sans pièce au journal ${sansPiece.length}`);
for (const f of sansPiece.slice(0, 5)) dire(`      ${f.replace(BEAC, "…")}`);
for (const m of prevu.slice(0, 6)) dire(`      ${m.de.replace(BEAC, "…")}\n         → ${m.vers.replace(BEAC, "…")}`);
if (prevu.length > 6) dire(`      … et ${prevu.length - 6} autre(s)`);

/**
 * L'ORPHELIN NE S'ÉCRASE PAS, IL SE MARQUE.
 *
 * Deux fichiers ne correspondent à aucun titre du journal, alors que le
 * journal n'a aucune collision : la BEAC a renommé ses pièces après notre
 * ramassage, et le fichier garde l'ancien nom. Il occupe donc le chemin que
 * la règle donne aujourd'hui à une AUTRE pièce.
 *
 * On ne l'écrase pas et on ne l'efface pas : c'est un document public ramassé
 * à une date, et il vaut ce qu'il vaut. On lui donne une marque tirée de son
 * propre contenu, ce qui le distingue et dit au passage qu'il ne se rattache
 * plus à rien.
 */
const { createHash } = await import("node:crypto");
for (const f of sansPiece) {
  const occupe = prevu.some((m) => path.resolve(m.vers) === path.resolve(f));
  if (!occupe) continue;
  const h = createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 6);
  const neuf = avecMarque(f, `orph-${h}`);
  dire(`   ORPHELIN MARQUÉ  ${path.basename(neuf)}`);
  if (ranger) fs.renameSync(f, neuf);
}

const cibles = new Set(prevu.map((m) => path.resolve(m.vers)));
if (cibles.size !== prevu.length) {
  dire(`\nREFUS : deux fichiers visent la même destination. La règle de marque n'a pas joué.`);
  process.exit(1);
}

if (!ranger) {
  dire(`\nEssai à blanc. Relancer avec --ranger.`);
  process.exit(0);
}

/* Premier temps : tout ce qui bouge passe par un nom provisoire, pour qu'un
   renommage n'écrase jamais un fichier qui doit encore bouger. */
const transit = [];
for (const m of prevu) {
  const t = `${m.de}.transit`;
  fs.renameSync(m.de, t);
  transit.push({ ...m, t });
}
let faits = 0;
for (const m of transit) {
  fs.mkdirSync(path.dirname(m.vers), { recursive: true });
  if (fs.existsSync(m.vers)) {
    dire(`   OCCUPÉ  ${m.vers.replace(BEAC, "…")}`);
    fs.renameSync(m.t, m.de);
    continue;
  }
  fs.renameSync(m.t, m.vers);
  faits++;
}
dire(`\n=== ${faits} fichier(s) rangé(s) sur ${prevu.length} ===`);
dire(`   restants hors du dossier des tableaux : ${trouver(`${BEAC}/Autres communiques`).length}`);
