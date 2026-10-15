/**
 * COMBIEN DES 277 COURBES SONT DES TRACÉS, ET COMBIEN DES IMAGES ?
 *
 * La BEAC ne publie pas de table de rendements : elle publie un graphique. Un
 * graphique VECTORIEL porte ses coordonnées dans le flux du document et se lit
 * sans rien estimer ; un graphique SCANNÉ n'est qu'une image, et relever ses
 * points à l'œil serait inventer une précision que la pièce ne donne pas.
 *
 * LA DIFFÉRENCE NE SE DEVINE PAS AU NOM DU FICHIER. On ouvre les 277, on compte
 * les polylignes longues et les graduations d'axe, et on dit combien de pièces
 * sont lisibles. Le reste sera nommé comme non lisible, pas oublié.
 *
 *   npx tsx scripts/courbes-recensement.mjs
 */
import fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const dire = (s) => fs.writeSync(1, `${s}\n`);
const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics/Courbes de rendement BEAC";

const fichiers = fs
  .readdirSync(RACINE)
  .flatMap((an) => fs.readdirSync(`${RACINE}/${an}`).map((f) => ({ an, f, p: `${RACINE}/${an}/${f}` })))
  .sort((a, b) => a.p.localeCompare(b.p));

const parAn = new Map();
const etats = new Map();
const lisibles = [];

for (const { an, f, p } of fichiers) {
  let etat = "?";
  let detail = "";
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(p)), disableFontFace: true, verbosity: 0 }).promise;
    let traces = 0;
    let graduations = 0;
    let durees = 0;
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const mots = (await page.getTextContent()).items.filter((i) => "str" in i && i.str.trim()).map((i) => i.str.trim());
      graduations += mots.filter((s) => /^\d{1,2},00$/.test(s)).length;
      durees += mots.filter((s) => /^\d+([,.]\d+)?\s*(mois|ans?)$/i.test(s)).length;
      const ops = await page.getOperatorList();
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] !== pdfjs.OPS.constructPath) continue;
        const [types] = ops.argsArray[i];
        let k = 0;
        for (const t of types) if (t === pdfjs.OPS.moveTo || t === pdfjs.OPS.lineTo || t === pdfjs.OPS.curveTo) k++;
        if (k >= 5) traces++;
      }
    }
    /* TROIS CONDITIONS, ET IL LES FAUT TOUTES : un tracé sans axe gradué ne se
       convertit pas en pour cent, et un axe sans durées ne se place pas. */
    etat = traces >= 1 && graduations >= 2 && durees >= 2 ? "vectoriel" : traces >= 1 ? "tracé sans repère" : "image";
    detail = `${traces} tracé(s) · ${graduations} graduation(s) · ${durees} durée(s)`;
    if (etat === "vectoriel") lisibles.push({ an, f, traces, graduations, durees });
  } catch (e) {
    etat = "illisible";
    detail = String(e.message).slice(0, 60);
  }
  etats.set(etat, (etats.get(etat) ?? 0) + 1);
  const m = parAn.get(an) ?? new Map();
  m.set(etat, (m.get(etat) ?? 0) + 1);
  parAn.set(an, m);
  if (etat !== "vectoriel") dire(`   ${etat.padEnd(18)} ${an}/${f.slice(0, 78)}  ${detail}`);
}

dire(`\n=== ${fichiers.length} PIÈCES ===`);
for (const [e, n] of [...etats].sort((a, b) => b[1] - a[1])) dire(`   ${e.padEnd(18)} ${n}`);
dire(`\n=== PAR ANNÉE ===`);
for (const [an, m] of [...parAn].sort()) {
  dire(`   ${an}  ${[...m].map(([e, n]) => `${n} ${e}`).join(" · ")}`);
}
fs.mkdirSync("C:/dev/guichet/.sorties", { recursive: true });
fs.writeFileSync("C:/dev/guichet/.sorties/courbes-lisibles.json", JSON.stringify(lisibles, null, 1), "utf8");
dire(`\n${lisibles.length} pièce(s) lisibles, listées dans .sorties/courbes-lisibles.json`);
