/**
 * Ce que la lecture géométrique des actions rend, sur des rangées fraîches.
 *
 * L'ordre compte : pdfjs prend la propriété du tampon et le détache, donc
 * cette lecture doit venir AVANT tout autre passage sur les mêmes octets.
 *
 *   npx tsx scripts/geo-actions.mjs [AAAA-MM-JJ]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { Carnet } = await import("../src/lib/market/boc-parse.ts");
const { actionsGeometriques, rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const seance = process.argv[2] ?? "2023-12-22";
const b = await repo().getBulletin(seance);
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance)).bytes;

const carnet = new Carnet();
const geo = actionsGeometriques(await rangeesDuPdf(bytes), carnet);
console.log(`${seance} · la géométrie lit ${geo.length} action(s)\n`);
for (const e of geo) console.log(`   ${e.isin}  ouverture ${e.open} · clôture ${e.close} · précédent ${e.previousClose} · haut ${e.thresholdHigh} · bas ${e.thresholdLow} · variation ${e.variationPct} %`);
if (carnet.notes.length) console.log(`\n   ce qu'elle refuse, et pourquoi :`);
for (const n of carnet.notes) {
  console.log(`   ${n.message}`);
  if (n.brut) console.log(`      ${n.brut.slice(0, 160)}`);
}

/* Les cellules de la section des actions, telles que la grille les rend. */
const { colonnes, rangeeSeparee } = await import("../src/lib/market/boc-geometrie.ts");
const bytes2 = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance)).bytes;
const rangees = await rangeesDuPdf(bytes2);
const titre = (r, m) => r.cellules.some((c) => m.test(c.texte));
const debut = rangees.findIndex((r) => titre(r, /^MARCHE DES ACTIONS/));
const fin = rangees.findIndex((r, i) => i > debut && titre(r, /^(MARCHE DES OBLIGATIONS|CAPITALISATION BOURSIERE|MARCHE DES OPCVM)/i));
console.log(`\n   section des actions : rangées ${debut} à ${fin > debut ? fin : "fin"}`);
const section = rangees.slice(debut, fin > debut ? fin : undefined);
const grille = colonnes(section.filter((r) => r.page === section[0]?.page));
console.log(`   grille de ${grille.length} bords sur la page ${section[0]?.page}\n`);
for (const r of section.slice(0, 12)) {
  const cells = rangeeSeparee(r, grille).map((c) => c.texte);
  console.log(`   page ${r.page} y${Math.round(r.y)} [${cells.length}] ${cells.map((c) => JSON.stringify(c)).join(" ")}`.slice(0, 230));
}
