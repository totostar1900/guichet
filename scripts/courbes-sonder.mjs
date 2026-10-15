/**
 * QU'Y A-T-IL DANS UNE COURBE DE LA BEAC ?
 *
 * Georges signale « plusieurs courbes des taux » sur la page des statistiques
 * des titres publics : nous en avons 277 pièces sur le disque, de 2015 à
 * aujourd'hui, par pays puis par zone. Avant d'écrire un lecteur, on regarde ce
 * que la pièce porte vraiment : combien de pages, quels titres, et si les
 * chiffres sont écrits quelque part ou seulement tracés.
 *
 * ON NE SONDE PAS UNE PIÈCE, ON EN SONDE PLUSIEURS ÉPOQUES, parce que la BEAC
 * change la forme de ses documents sans prévenir et qu'un lecteur réglé sur
 * 2026 ne lirait pas 2016.
 *
 *   npx tsx scripts/courbes-sonder.mjs [motif]
 */
import fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const dire = (s) => fs.writeSync(1, `${s}\n`);
const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics/Courbes de rendement BEAC";

const ECHANTILLON = process.argv[2]
  ? fs.readdirSync(RACINE).flatMap((an) => fs.readdirSync(`${RACINE}/${an}`).filter((f) => f.includes(process.argv[2])).map((f) => `${RACINE}/${an}/${f}`))
  : [
      `${RACINE}/2015/Courbe des taux de rendement des titres publics camerounais pour le mois d'octobre 2015.pdf`,
      `${RACINE}/2017/CBT Aout 2017 Cameroun et Gabon.pdf`,
      `${RACINE}/2021/${fs.readdirSync(`${RACINE}/2021`)[0]}`,
      `${RACINE}/2025/Courbe de rendements des titres publics du Cameroun - juin 2025.pdf`,
      `${RACINE}/2026/Courbe des taux de rendement des titres publics de la CEMAC - juillet 2026.pdf`,
    ];

for (const f of ECHANTILLON) {
  if (!fs.existsSync(f)) {
    dire(`\n### ABSENT ${f}`);
    continue;
  }
  dire(`\n################ ${f.slice(RACINE.length + 1)}`);
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), disableFontFace: true }).promise;
  } catch (e) {
    dire(`   illisible : ${String(e.message).slice(0, 120)}`);
    continue;
  }
  dire(`   ${doc.numPages} page(s)`);
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const texte = await p.getTextContent();
    const mots = texte.items.filter((i) => "str" in i && i.str.trim());
    /* Combien de polylignes longues : une courbe tracée en laisse au moins une. */
    const ops = await p.getOperatorList();
    let longues = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] !== pdfjs.OPS.constructPath) continue;
      const [types] = ops.argsArray[i];
      let n2 = 0;
      for (const t of types) if (t === pdfjs.OPS.moveTo || t === pdfjs.OPS.lineTo || t === pdfjs.OPS.curveTo) n2++;
      if (n2 >= 5) longues++;
    }
    const tete = mots
      .slice(0, 14)
      .map((m) => m.str.trim())
      .join(" / ");
    dire(`   p${n} · ${String(mots.length).padStart(4)} mot(s) · ${String(longues).padStart(3)} tracé(s) long(s) · ${tete.slice(0, 150)}`);
  }
}
