/**
 * Les chaînes françaises d'un fichier que les dictionnaires anglais ignorent.
 *
 * Le cliquet les signale, mais tronquées à soixante-dix caractères : de quoi
 * savoir qu'il en manque, pas de quoi les traduire. Celui-ci les rend entières,
 * prêtes à coller, et vérifie du même geste qu'aucune n'existe déjà sous une
 * autre forme, guillemets ou non, dans l'un quelconque des fichiers en-*.ts.
 *
 *   node scripts/clefs-manquantes.mjs src/components/market/CourbeFusion.tsx
 *   node scripts/clefs-manquantes.mjs            (tout src)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Les fichiers a lire : ceux qu on nomme, sinon tout src.
 *
 * SANS ARGUMENT, IL NE LISAIT RIEN et annoncait « 0 clefs a traduire ». Le
 * compte des clefs connues, lui, etait juste : la sortie ressemblait trait pour
 * trait a un succes. Une verification qui passe a vide est pire que pas de
 * verification, parce qu elle rassure.
 */
const fichiers = (cibles) => {
  const out = [];
  const marche = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const q = path.join(d, e.name);
      if (e.isDirectory()) marche(q);
      else if (/\.tsx?$/.test(e.name)) out.push(q);
    }
  };
  for (const c of cibles.length ? cibles : ["src"]) {
    const q = path.join(process.cwd(), c);
    if (statSync(q).isDirectory()) marche(q);
    else out.push(q);
  }
  return out;
};

const connues = new Set();
const dossier = path.join(process.cwd(), "src/i18n");
for (const f of readdirSync(dossier).filter((x) => /^en.*\.ts$/.test(x))) {
  const s = readFileSync(path.join(dossier, f), "utf8");
  for (const m of s.matchAll(/^\s*"((?:[^"\\]|\\.)*)"\s*:/gm)) {
    try {
      connues.add(JSON.parse(`"${m[1]}"`));
    } catch {
      /* Le compilateur signalera une clef illisible. */
    }
  }
  for (const m of s.matchAll(/^\s*([A-Za-zÀ-ÿ_$][\w$À-ÿ]*)\s*:/gm)) connues.add(m[1]);
}

/* La même règle que le cliquet, à la lettre : TOUTE chaîne passée à t() doit
   être au dictionnaire. Le détecteur « a l'air français » qui tenait cette
   place ratait tout ce qui n'a ni accent ni mot-outil, « Citer » et « Joindre »
   parmi d'autres. Un mot identique dans les deux langues s'inscrit sur
   lui-même. */

const vues = new Set();
const cibles = fichiers(process.argv.slice(2));
for (const cible of cibles) {
  const s = readFileSync(cible, "utf8");
  for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    let clef;
    try {
      clef = JSON.parse(`"${m[1]}"`);
    } catch {
      continue;
    }
    if (connues.has(clef) || vues.has(clef)) continue;
    vues.add(clef);
    console.log(`  ${JSON.stringify(clef)}: "",`);
  }
}
/* Le nombre de fichiers lus fait partie du verdict : « 0 clefs » sur 0 fichier
   ne dit rien, et c'est exactement ce que cette sortie disait avant. */
console.error(`${vues.size} clefs à traduire · ${connues.size} déjà connues · ${cibles.length} fichiers lus`);
