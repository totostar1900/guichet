/**
 * LES CLEFS D'UN FICHIER QUI N'ONT PAS D'ANGLAIS, EN ENTIER.
 *
 * Le cliquet « français sans anglais » les signale, mais il tronque les
 * phrases à soixante-dix caractères pour rester lisible : on ne peut pas les
 * recopier depuis son rapport. Ce script rend les chaînes entières, prêtes à
 * coller dans un dictionnaire.
 *
 *   npx tsx --conditions=react-server scripts/clefs-a-traduire.mjs src/app/Accueil.tsx
 */
import fs from "node:fs";

const { EN_ALL } = await import("../src/i18n/core.ts");

const fichiers = process.argv.slice(2).filter((x) => x.endsWith(".tsx") || x.endsWith(".ts"));
if (!fichiers.length) throw new Error("usage : clefs-a-traduire.mjs <fichier> [fichier...]");

const vues = new Set();
for (const f of fichiers) {
  const src = fs.readFileSync(f, "utf8");
  /* Les deux formes littérales que le scanner reconnaît : t("…") et t('…'). Un
     t(variable) reste un angle mort, ici comme là-bas. */
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) vues.add(m[1].replace(/\\"/g, '"'));
  for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) vues.add(m[1].replace(/\\'/g, "'"));
}

const manquantes = [...vues].filter((k) => !(k in EN_ALL));
console.log(`${vues.size} clefs littérales · ${manquantes.length} sans anglais\n`);
for (const k of manquantes) console.log(`  ${JSON.stringify(k)}: "",`);
