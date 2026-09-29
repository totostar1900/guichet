/**
 * Les chaînes françaises d'un fichier que les dictionnaires anglais ignorent.
 *
 * Le cliquet les signale, mais tronquées à soixante-dix caractères : de quoi
 * savoir qu'il en manque, pas de quoi les traduire. Celui-ci les rend entières,
 * prêtes à coller, et vérifie du même geste qu'aucune n'existe déjà sous une
 * autre forme, guillemets ou non, dans l'un quelconque des fichiers en-*.ts.
 *
 *   node scripts/clefs-manquantes.mjs src/components/market/CourbeFusion.tsx
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

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

/* Le même détecteur que le cliquet, à la lettre : deux copies qui divergent
   donneraient deux vérités, et celle du script serait la plus consultée. */
const duFrancais = (s) =>
  /[àâäéèêëîïôöùûüçœ]/i.test(s) ||
  /\b(le|la|les|des|une|qui|que|pour|dans|sur|avec|sans|plus|entre|chaque|tous|toutes)\b/i.test(s) ||
  /\b(il y a|aucun|aucune|ans|mois|jours|selon|depuis|vers|leur|leurs|cette|cet|ces|son|ses|nous|vous)\b/i.test(s) ||
  /\b(un|du|au|aux|et|ni|est|sont|ne|pas|votre|vos|notre|nos|mon|ma|mes)\b/i.test(s);

const vues = new Set();
for (const cible of process.argv.slice(2)) {
  const s = readFileSync(path.join(process.cwd(), cible), "utf8");
  for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    let clef;
    try {
      clef = JSON.parse(`"${m[1]}"`);
    } catch {
      continue;
    }
    if (connues.has(clef) || !duFrancais(clef) || vues.has(clef)) continue;
    vues.add(clef);
    console.log(`  ${JSON.stringify(clef)}: "",`);
  }
}
console.error(`${vues.size} clefs à traduire · ${connues.size} déjà connues`);
