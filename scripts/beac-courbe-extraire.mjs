/**
 * Lire les chiffres de la courbe que la BEAC publie en image.
 *
 * Elle ne publie pas de table : la courbe est un graphique posé dans un PDF, et
 * relever des points à l'œil sur une image serait inventer une précision que la
 * source ne donne pas.
 *
 * Mais ce n'est pas une image : c'est un tracé vectoriel, et ses coordonnées
 * sont dans le flux du document. On les prend telles quelles, et on les ramène
 * en pour cent avec les graduations de l'axe, dont les positions sont elles
 * aussi dans le document. Rien n'est estimé à l'œil.
 *
 *   npx tsx scripts/beac-courbe-extraire.mjs <fichier.pdf> [page]
 */
import fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const fichier = process.argv[2];
const page = Number(process.argv[3] ?? 5);
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(fichier)), disableFontFace: true }).promise;
const p = await doc.getPage(page);

/* Les étiquettes, avec leur position : ce sont elles qui calibrent le repère. */
const texte = await p.getTextContent();
const mots = texte.items
  .filter((i) => "str" in i && i.str.trim())
  .map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5] }));

/** Les graduations de l'ordonnée : « 0,00 », « 2,00 » … alignées verticalement. */
/**
 * Une pile verticale : les graduations d'un axe partagent leur abscisse, ce que
 * les nombres d'une table voisine ne font pas. « 25,00 » figure dans la table
 * des taux de participation collée au graphique, et il suffisait à fausser
 * l'échelle. On garde la plus grande pile.
 */
const candidats = mots.filter((m) => /^\d{1,2},00$/.test(m.s)).map((m) => ({ v: Number(m.s.replace(",", ".")), x: m.x, y: m.y }));
const piles = new Map();
for (const c of candidats) {
  const clef = Math.round(c.x / 4);
  piles.set(clef, [...(piles.get(clef) ?? []), c]);
}
const grad = ([...piles.values()].sort((a, b) => b.length - a.length)[0] ?? []).sort((a, b) => a.v - b.v);
if (grad.length < 2) throw new Error("graduations de l'axe introuvables");
console.log(`graduations retenues : ${grad.map((g) => `${g.v} @ ${g.y.toFixed(1)}`).join(" · ")}`);
/* Deux graduations suffisent à poser l'échelle, on prend les extrêmes. */
const g0 = grad[0];
const g1 = grad[grad.length - 1];
const pctDe = (y) => g0.v + ((y - g0.y) * (g1.v - g0.v)) / (g1.y - g0.y);

/** Les durées, en abscisse, dans l'ordre où elles sont écrites. */
const DUREE = /^(\d+([,.]\d+)?)\s*(mois|ans?|A)$/i;
const durees = mots.filter((m) => DUREE.test(m.s) && m.x > g0.x).sort((a, b) => a.x - b.x);

console.log(`page ${page} · ordonnée calibrée sur ${g0.v} % à y=${g0.y.toFixed(1)} et ${g1.v} % à y=${g1.y.toFixed(1)}`);
console.log(`${durees.length} durées en abscisse : ${durees.map((d) => d.s).join(" · ")}\n`);

/* Les tracés. On garde les polylignes longues : les trois courbes. */
const ops = await p.getOperatorList();
const CONSTRUCT = pdfjs.OPS.constructPath;
const traces = [];
for (let i = 0; i < ops.fnArray.length; i++) {
  if (ops.fnArray[i] !== CONSTRUCT) continue;
  const [types, args] = ops.argsArray[i];
  const pts = [];
  let k = 0;
  for (const t of types) {
    if (t === pdfjs.OPS.moveTo || t === pdfjs.OPS.lineTo) {
      pts.push({ x: args[k], y: args[k + 1] });
      k += 2;
    } else if (t === pdfjs.OPS.curveTo) {
      pts.push({ x: args[k + 4], y: args[k + 5] });
      k += 6;
    } else if (t === pdfjs.OPS.rectangle) k += 4;
    else if (t === pdfjs.OPS.closePath) continue;
  }
  if (pts.length >= 5) traces.push(pts);
}

console.log(`${traces.length} tracé(s) de cinq points ou plus\n`);
for (const [i, pts] of traces.slice(0, 6).entries()) {
  const xs = pts.map((q) => q.x);
  console.log(`--- tracé ${i + 1} · ${pts.length} points · x de ${Math.min(...xs).toFixed(0)} à ${Math.max(...xs).toFixed(0)}`);
  /* À chaque point tracé, la durée dont l'étiquette est la plus proche. */
  for (const q of pts) {
    const d = durees.reduce((m, x) => (Math.abs(x.x - q.x) < Math.abs(m.x - q.x) ? x : m), durees[0]);
    console.log(`     ${d.s.padEnd(9)} ${pctDe(q.y).toFixed(2)} %   (x ${q.x.toFixed(0)}, y ${q.y.toFixed(0)})`);
  }
}
