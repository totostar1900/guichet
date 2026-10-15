/**
 * CE QUE PORTE UNE STATISTIQUE MENSUELLE DU MARCHÉ DES VALEURS DU TRÉSOR.
 *
 * C'est la pièce qui porte L'ENCOURS OFFICIEL par pays, celui que la BEAC
 * calcule et que nous avons passé deux jours à chercher ailleurs. Trente-deux
 * numéros, de septembre 2021 à juillet 2026.
 *
 * ON REGARDE AVANT D'ÉCRIRE UN LECTEUR : combien de pages, quelles tables, et
 * si la couche texte est là.
 *
 *   npx tsx --conditions=react-server scripts/mensuelle-sonder.mjs [motif]
 */
import fs from "node:fs";

const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const RACINE = "C:/Users/Nitch/PURPOSE CAPITAL/PurpCapSharedLib - Guichet/1. Donnees de marche/1. BEAC - Marche des titres publics/Statistiques mensuelles";

const motif = process.argv[2] ?? "N° 60";
const fichiers = fs
  .readdirSync(RACINE)
  .flatMap((an) => (fs.statSync(`${RACINE}/${an}`).isDirectory() ? fs.readdirSync(`${RACINE}/${an}`).map((f) => `${RACINE}/${an}/${f}`) : []))
  .filter((f) => f.includes(motif));

for (const f of fichiers.slice(0, 2)) {
  dire(`\n################ ${f.split("/").pop()}`);
  const r = await rangeesDuPdf(new Uint8Array(fs.readFileSync(f)));
  dire(`${r.length} rangée(s)`);
  if (!r.length) {
    dire("SCAN SANS COUCHE TEXTE");
    continue;
  }
  const pages = new Set(r.map((x) => x.page));
  dire(`${pages.size} page(s) portent du texte`);
  for (const x of r) {
    const l = x.cellules.map((c) => c.texte).join(" | ");
    dire(`p${String(x.page).padStart(2)} ${l.slice(0, 180)}`);
  }
}
