/**
 * La bibliothèque de relevé, éprouvée sur les vrais bulletins.
 *
 * Les tests unitaires vérifient chaque pièce sur des cas fabriqués. Celui-ci
 * vérifie l'assemblage sur les PDF eux-mêmes, et compare au relevé fait à la
 * main : si les deux ne coïncident pas au centième, c'est l'assemblage qui a
 * tort, et les tests ne le verraient pas.
 *
 *   npx tsx scripts/beac-bulletin-essai.mjs <fichier.pdf> [page]
 */
import fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { abscisses, calibrer, series, tresorsDuTitre } from "../src/lib/market/beac-bulletin.ts";

/** Le relevé fait à la main sur le n° 60, pour comparaison. */
const ATTENDU = {
  Cameroun: { 0.25: 6.55, 1: 8.44, 3: 9.78, 5: 9.92, 10: 9.88, 15: 9.87 },
  Congo: { 0.25: 6.69, 1: 9.85, 3: 12.67, 5: 13.31, 10: 13.69 },
  Gabon: { 0.25: 6.16, 1: 9.52, 3: 10.03, 5: 8.86, 10: 7.41 },
};

const fichier = process.argv[2];
const page = Number(process.argv[3] ?? 5);
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(fichier)), disableFontFace: true }).promise;
const p = await doc.getPage(page);

const texte = await p.getTextContent();
const mots = texte.items.filter((i) => "str" in i && i.str.trim()).map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5] }));
const brut = mots.map((m) => m.s).join(" ");

if (!mots.length) {
  console.log(`${fichier} page ${page} : aucun texte, c'est un scan.`);
  process.exit(0);
}

const noms = tresorsDuTitre(brut);
console.log(`Trésors nommés par la figure : ${noms.join(", ") || "aucun"}`);

const cal = calibrer(mots);
if (typeof cal === "string") {
  console.log(`refus : ${cal}`);
  process.exit(0);
}
console.log(`calibration sur ${cal.n} graduations, colinéaires`);

const abs = abscisses(mots, cal.x);
console.log(`${abs.length} durées en abscisse, de ${abs[0]?.annees} à ${abs.at(-1)?.annees} an(s)\n`);

/* Les tracés, tels que pdf.js les rend. */
const ops = await p.getOperatorList();
const traces = [];
for (let i = 0; i < ops.fnArray.length; i++) {
  if (ops.fnArray[i] !== pdfjs.OPS.constructPath) continue;
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
  }
  if (pts.length) traces.push(pts);
}

const s = series(traces, cal, abs, noms);
if (typeof s === "string") {
  console.log(`refus : ${s}`);
  process.exit(0);
}

let ecarts = 0;
for (const serie of s) {
  console.log(`${serie.pays} · ${serie.points.length} points`);
  const att = ATTENDU[serie.pays];
  for (const pt of serie.points) {
    const a = att?.[pt.annees];
    const dit = a == null ? "" : Math.abs(a - pt.pct) < 0.005 ? "  = relevé à la main" : `  ≠ relevé à la main : ${a}`;
    if (a != null && Math.abs(a - pt.pct) >= 0.005) ecarts += 1;
    console.log(`   ${String(pt.annees).padStart(5)} an  ${pt.pct.toFixed(2).padStart(6)} %${dit}`);
  }
}
console.log(`\n${ecarts} écart(s) avec le relevé fait à la main.`);
