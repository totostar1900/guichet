/** Tous les mots d'une page de courbe, avec leur place : la légende y est.
 *    npx tsx scripts/courbe-mots.mjs <fichier.pdf> [page] */
import fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), disableFontFace: true, verbosity: 0 }).promise;
const p = await doc.getPage(Number(process.argv[3] ?? 1));
const t = await p.getTextContent();
for (const i of t.items) {
  if (!("str" in i) || !i.str.trim()) continue;
  fs.writeSync(1, `   x ${i.transform[4].toFixed(0).padStart(4)}  y ${i.transform[5].toFixed(0).padStart(4)}   ${i.str.trim()}\n`);
}
