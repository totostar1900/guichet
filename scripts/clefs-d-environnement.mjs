/**
 * QUELLES CLEFS L APPLICATION LIT-ELLE, ET LESQUELLES SONT ECRITES ?
 *
 * Une clef lue par `src/` mais absente de `.env.example` est une panne
 * muette : sur un poste neuf elle n est pas posee, la fonctionnalite se
 * degrade en silence, et rien ne le dit. Une clef listee dans l exemple
 * mais lue nulle part est l inverse : elle fait croire a un reglage qui
 * n agit plus.
 *
 * LE SCANNER A UN ANGLE MORT, ET IL LE DIT. `process.env[variable]` ne
 * se lit pas au texte. Un seul endroit le fait, `tmpl(clef, defaut)`
 * dans src/lib/notify/compose.ts, et le scanner suit ses appels : c est
 * ainsi que WA_TEMPLATE_PRELEVEMENT a ete retrouve, apres avoir ete
 * declare « lu nulle part » par une premiere version plus naive. Tout
 * AUTRE acces dynamique est signale comme hors de vue plutot que passe
 * sous silence.
 *
 * `scripts/` est compte a part : ses GUICHET_ESSAI, ONLY, BASE sont des
 * boutons d outil passes en ligne de commande, pas de la configuration
 * de deploiement, et ils n ont rien a faire dans l exemple.
 *
 *   node scripts/clefs-d-environnement.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const dire = (s) => fs.writeSync(1, `${s}\n`);

/* Posees par Vercel ou par l outillage, jamais par nous. */
/* Le scanner se lit lui-meme : ses exemples en commentaire ne sont pas des lectures. */
export const FOURNIES = new Set([
  "NODE_ENV", "CI", "PORT", "TZ", "npm_lifecycle_event",
  "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_REGION", "VERCEL_OIDC_TOKEN",
  "VERCEL_GIT_COMMIT_SHA", "VERCEL_GIT_COMMIT_REF", "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
]);

const fichiers = (depuis, out = []) => {
  for (const e of fs.readdirSync(depuis)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const p = `${depuis}/${e}`;
    if (fs.statSync(p).isDirectory()) fichiers(p, out);
    else if (/\.(ts|tsx|mjs)$/.test(e)) out.push(p);
  }
  return out;
};

/** Les clefs lues par un dossier, et les acces dynamiques qu on ne sait pas lire. */
export function scanner(dossier) {
  const lues = new Map();
  const horsDeVue = [];
  const noter = (clef, f) => {
    if (FOURNIES.has(clef)) return;
    const v = lues.get(clef) ?? new Set();
    v.add(path.relative(RACINE, f).replace(/\\/g, "/"));
    lues.set(clef, v);
  };
  for (const f of fichiers(`${RACINE}/${dossier}`)) {
    if (/[/\\]test[/\\]/.test(f)) continue;
    if (f.endsWith("clefs-d-environnement.mjs")) continue; // il se lirait lui-meme
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) noter(m[1], f);
    for (const m of src.matchAll(/process\.env\[\s*["'`]([A-Z0-9_]+)["'`]\s*\]/g)) noter(m[1], f);
    /* L indirection connue : tmpl("WA_TEMPLATE_X", "guichet_x"). */
    for (const m of src.matchAll(/\btmpl\(\s*["'`]([A-Z0-9_]+)["'`]/g)) noter(m[1], f);
    /* Toute autre lecture dynamique, nommee pour qu elle ne disparaisse pas. */
    for (const [i, l] of src.split(/\r?\n/).entries()) {
      if (!/process\.env\[/.test(l)) continue;
      if (/process\.env\[\s*["'`][A-Z0-9_]+["'`]\s*\]/.test(l)) continue;
      if (/process\.env\[(m\[1\]|key)\]\s*(=|\|\|)/.test(l)) continue; // chargeur .env.local, et tmpl lui-meme
      horsDeVue.push(`${path.relative(RACINE, f).replace(/\\/g, "/")}:${i + 1}`);
    }
  }
  return { lues, horsDeVue };
}

export const clefsDeLExemple = () =>
  new Set(
    fs.readFileSync(`${RACINE}/.env.example`, "utf8")
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z0-9_]+)=/)?.[1])
      .filter(Boolean),
  );

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const app = scanner("src");
  const outils = scanner("scripts");
  const exemple = clefsDeLExemple();

  const manquantes = [...app.lues.keys()].filter((k) => !exemple.has(k)).sort();
  const orphelines = [...exemple].filter((k) => !app.lues.has(k)).sort();

  dire(`${app.lues.size} clefs lues par src · ${outils.lues.size} par scripts · ${exemple.size} listees dans .env.example\n`);

  dire(`=== LUES PAR L APPLICATION, ABSENTES DE .env.example (${manquantes.length}) ===`);
  dire(`    sur un poste neuf elles ne seront pas posees, et personne ne le saura`);
  for (const k of manquantes) {
    const ou = [...app.lues.get(k)];
    dire(`   ${k.padEnd(26)} ${ou.slice(0, 3).join(" · ")}${ou.length > 3 ? ` (+${ou.length - 3})` : ""}`);
  }
  if (!manquantes.length) dire(`   aucune`);

  dire(`\n=== LISTEES DANS .env.example, LUES NULLE PART (${orphelines.length}) ===`);
  dire(`    elles font croire a un reglage qui n agit plus`);
  for (const k of orphelines) dire(`   ${k}`);
  if (!orphelines.length) dire(`   aucune`);

  dire(`\n=== BOUTONS D OUTIL (scripts/), hors configuration (${outils.lues.size}) ===`);
  dire(`   ${[...outils.lues.keys()].filter((k) => !app.lues.has(k)).sort().join(" · ") || "aucun"}`);

  const aveugle = [...app.horsDeVue, ...outils.horsDeVue];
  dire(`\n=== HORS DE VUE DU SCANNER (${aveugle.length}) ===`);
  dire(`    une lecture dynamique que le texte ne nomme pas ; a suivre a la main`);
  for (const l of aveugle) dire(`   ${l}`);
  if (!aveugle.length) dire(`   aucune`);
}
