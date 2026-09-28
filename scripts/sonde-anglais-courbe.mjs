/**
 * Ce que l'écran de la courbe rend en anglais, clef par clef.
 *
 * Une clef absente du dictionnaire rend le français en silence. Le mélange se
 * voit donc à l'écran et nulle part ailleurs : ni la compilation ni les tests
 * ne s'en plaignent.
 *
 *   npx tsx scripts/sonde-anglais-courbe.mjs
 */
import { EN } from "../src/i18n/en.ts";
import { EN_ANALYSES } from "../src/i18n/en-analyses.ts";
import { EN_MORE } from "../src/i18n/en-desk.ts";
import { EN_REST } from "../src/i18n/en-rest.ts";

const dico = { ...EN, ...EN_MORE, ...EN_REST, ...EN_ANALYSES };

const CLEFS = [
  "Aujourd'hui",
  "il y a 3 mois",
  "il y a 6 mois",
  "il y a 1 an",
  "il y a 2 ans",
  "il y a 3 ans",
  "il y a 5 ans",
  "Observée le",
  "Profondeur",
  "Trésor",
  "3 mois",
  "1 an",
  "2 ans",
  "5 ans",
  "mois",
  "ans",
  "au {d}",
  "point le plus ancien : {n} jours",
];

let manquantes = 0;
for (const k of CLEFS) {
  const v = dico[k];
  if (v === undefined) manquantes += 1;
  console.log(`${v === undefined ? "MANQUE " : "       "}${JSON.stringify(k).padEnd(38)} ${v === undefined ? "-> rend le français" : JSON.stringify(v)}`);
}
console.log(`\n${manquantes} clef(s) sans anglais sur ${CLEFS.length}`);
