/**
 * Les clefs du lot « le desk montre la page, et les actions se lisent par la
 * géométrie », posées en une fois.
 *
 *   node scripts/clefs-lot-actions.mjs
 */
import fs from "node:fs";

const F = new URL("../src/i18n/en-desk.ts", import.meta.url);
const CLEFS = {
  // La famille V, et le sixième motif : tous deux invisibles au scanner.
  "Lu, mais refusé à l'enregistrement": "Read, but refused on saving",
  "Le lecteur a réussi : c'est la base qui refuse une valeur. Corriger la valeur ou la colonne, pas la lecture.":
    "The reader succeeded: it is the database that refuses a value. Fix the value or the column, not the reading.",
  "Le lecteur l'a manquée : la donnée est là, et lisible": "The reader missed it: the figure is there, and readable",
  "Le document porte la ligne à la page indiquée, et une personne l'a lue sans peine. C'est le lecteur qui doit être corrigé, donc la remarque reste ouverte.":
    "The document carries the line at the page given, and a person read it without difficulty. It is the reader that must be fixed, so the remark stays open.",

  // L'écran du geste.
  "Indiqué au lecteur": "Pointed out to the reader",
  "La page du document où vous avez regardé": "The page of the document where you looked",
  "Le lecteur d'aujourd'hui ne dit plus cela : la base garde la phrase de sa première lecture.":
    "Today's reader no longer says this: the database keeps the sentence from its first reading.",
  "{n} que le lecteur d'aujourd'hui ne dit plus": "{n} that today's reader no longer says",
};

let s = fs.readFileSync(F, "utf8");
const dejaLa = [];
const lignes = [];
for (const [fr, en] of Object.entries(CLEFS)) {
  /* Une clef en double fait tomber tsc avec TS1117 : regarder AVANT d'écrire. */
  if (s.includes(`\n  ${JSON.stringify(fr)}:`)) {
    dejaLa.push(fr);
    continue;
  }
  lignes.push(`  ${JSON.stringify(fr)}: ${JSON.stringify(en)},`);
}
if (lignes.length) fs.writeFileSync(F, s.replace(/\n};\s*$/, `\n${lignes.join("\n")}\n};\n`));
console.log(`${lignes.length} clefs ajoutées · ${dejaLa.length} déjà là`);
