/**
 * Les chaînes françaises qu'aucun dictionnaire ne traduit.
 *
 * Le dictionnaire est indexé par le français : une clef absente ressort donc
 * telle quelle, en français, au milieu d'une page anglaise. Rien ne casse,
 * rien n'avertit, et le mélange ne se voit qu'à l'écran — dans une langue que
 * le lecteur ne parle peut-être pas.
 *
 * Le contrôle liste, pour les fichiers qu'on lui donne, toute chaîne passée à
 * t() qui n'a d'entrée dans aucun fichier de traduction.
 *
 *   node scripts/francais-sans-anglais.mjs src/app/desk/analyses src/components/market
 */
import fs from "node:fs";
import path from "node:path";

const cibles = process.argv.slice(2);
if (!cibles.length) {
  console.error("Donnez au moins un dossier ou un fichier.");
  process.exit(1);
}

const fichiers = [];
for (const c of cibles) {
  const st = fs.statSync(c);
  if (st.isFile()) fichiers.push(c);
  else
    (function marche(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) marche(p);
        else if (/\.tsx?$/.test(e.name)) fichiers.push(p);
      }
    })(c);
}

/** Tout ce que les dictionnaires anglais savent traduire. */
const connues = new Set();
const dossier = "src/i18n";
for (const f of fs.readdirSync(dossier).filter((x) => /^en.*\.ts$/.test(x))) {
  const s = fs.readFileSync(path.join(dossier, f), "utf8");
  // Une clef s'écrit avec ou sans guillemets, et c'est la même propriété.
  for (const m of s.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) {
    try {
      connues.add(JSON.parse(`"${m[1]}"`));
    } catch {
      // Une clef illisible n'est pas une clef : elle se signalera ailleurs.
    }
  }
  for (const m of s.matchAll(/^\s*([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)\s*:/gm)) connues.add(m[1]);
}

/** Une chaîne qui ressemble à du français : accents, ou mots-outils courants. */
const duFrancais = (s) => /[àâäéèêëîïôöùûüçœ]/i.test(s) || /\b(le|la|les|des|une|qui|que|pour|dans|sur|avec|sans|plus|entre|chaque|tous|toutes)\b/i.test(s);

const trous = [];
for (const f of fichiers) {
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    let clef;
    try {
      clef = JSON.parse(`"${m[1]}"`);
    } catch {
      continue;
    }
    if (connues.has(clef) || !duFrancais(clef)) continue;
    trous.push({ f: path.relative(process.cwd(), f), ligne: s.slice(0, m.index).split("\n").length, clef });
  }
}

console.log(`${connues.size} clefs traduites · ${fichiers.length} fichiers examinés\n`);
if (!trous.length) {
  console.log("Aucune chaîne française sans traduction.");
  process.exit(0);
}
console.log(`${trous.length} chaînes ressortiraient en français dans la version anglaise :\n`);
for (const x of trous) console.log(`${x.f}:${x.ligne}\n   ${x.clef}\n`);
process.exit(1);
