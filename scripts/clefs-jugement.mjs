/**
 * Les clefs du lot « le desk répond au lecteur », posées en une fois.
 *
 * Vingt-deux clefs, dont dix que le scanner ne voit pas : les libellés des
 * motifs traversent t() sous forme de variable, et c'est le premier des trois
 * angles morts de la maison.
 *
 *   node scripts/clefs-jugement.mjs
 */
import fs from "node:fs";

const F = new URL("../src/i18n/en-desk.ts", import.meta.url);
const CLEFS = {
  // L'écran du geste.
  "Répondre au lecteur": "Answer the reader",
  "Jugé": "Judged",
  "sur une période": "over a period",
  "Retirer ce jugement": "Withdraw this judgement",
  "Ce que vous avez constaté": "What you found",
  "cette séance seulement": "this session only",
  "toutes les séances jusqu'au {d}, pour la famille {c}": "every session up to {d}, for family {c}",
  "Ce que vous ajoutez (facultatif)": "What you add (optional)",
  "ce que vous avez vu, en une phrase": "what you saw, in one sentence",
  "page {n} du document": "page {n} of the document",
  "page {n}": "page {n}",
  "le texte du PDF tel qu'il l'a vu, ce qu'il y cherchait, et la page : gardé à la lecture":
    "the PDF text as it saw it, what it was looking for, and the page: kept at reading time",
  "le texte du PDF tel qu'il l'a vu, et ce qu'il y cherchait : retrouvé à l'instant, la lecture d'origine ne le gardait pas":
    "the PDF text as it saw it, and what it was looking for: found just now, the original reading did not keep it",

  // Les motifs : invisibles au scanner, ils passent par t(variable).
  "La bourse ne publiait pas encore cette donnée": "The exchange was not publishing this figure yet",
  "Le document ne peut pas la porter : elle n'existait pas à cette date.": "The document cannot carry it: it did not exist on that date.",
  "Regardé : la donnée n'est pas dans ce document": "Looked: the figure is not in this document",
  "Le document a été ouvert à la page indiquée, la donnée n'y figure pas.": "The document was opened at the page given, and the figure is not there.",
  "Elle y est, mais le document est illisible à cet endroit": "It is there, but the document is unreadable at that spot",
  "La donnée est imprimée et le document l'abîme : ni le lecteur ni une personne ne peut la relever.":
    "The figure is printed and the document spoils it: neither the reader nor a person can take it down.",
  "La ligne a réellement quitté la cote": "The line really has left the list",
  "Ce n'est pas un défaut de lecture : la ligne n'est plus cotée, et elle ne reviendra pas.":
    "This is not a reading defect: the line is no longer listed, and it will not come back.",
  "Le mouvement est réel": "The move is real",
  "Le saut de valeur a été vérifié à la source : le marché a bougé, le lecteur a bien lu.":
    "The jump was checked against the source: the market moved, and the reader read correctly.",

  // Le point de Santé, qui change de nom et de phrases.
  "Bulletins à regarder": "Bulletins to look at",
  "{n} lue(s) par un lecteur plus ancien, donc à relire": "{n} read by an older reader, so worth rereading",
  "aucune relecture à attendre : toutes lues par le lecteur courant": "no rereading to expect: all read by the current reader",
  "chaque séance a été lue ou jugée": "every session has been read or judged",
};

let s = fs.readFileSync(F, "utf8");
const dejaLa = [];
const ajoutees = [];
const lignes = [];
for (const [fr, en] of Object.entries(CLEFS)) {
  /* Une clef en double fait tomber tsc avec TS1117, et le piège a déjà servi :
     il faut regarder AVANT d'écrire, pas après. */
  if (s.includes(`\n  ${JSON.stringify(fr)}:`)) {
    dejaLa.push(fr);
    continue;
  }
  ajoutees.push(fr);
  lignes.push(`  ${JSON.stringify(fr)}: ${JSON.stringify(en)},`);
}
if (lignes.length) {
  s = s.replace(/\n};\s*$/, `\n${lignes.join("\n")}\n};\n`);
  fs.writeFileSync(F, s);
}
console.log(`${ajoutees.length} clefs ajoutées · ${dejaLa.length} déjà là`);
for (const k of dejaLa) console.log(`   déjà : ${k}`);
