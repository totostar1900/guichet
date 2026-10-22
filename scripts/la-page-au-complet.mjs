/**
 * TOUTES LES RANGÉES D'UNE PAGE, LUES OU NON, CÔTE À CÔTE.
 *
 * La question : la queue qui manque (variation et référence absentes) est-elle
 * propre aux deux lignes perdues, ou toute la page est-elle imprimée ainsi ?
 * Si c'est toute la page, alors les voisines ne peuvent pas enseigner une
 * queue qu'elles n'ont pas non plus, et le remède n'est pas le gabarit : c'est
 * d'accepter la queue courte et de taire ce qui n'est pas imprimé.
 *
 *   npx tsx --conditions=react-server scripts/la-page-au-complet.mjs <séance> <page>
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { rangeesDuPdf, colonnes, rangeeSeparee } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const seance = process.argv[2] ?? "2023-09-25";
const page = Number(process.argv[3]) || 3;
const ISIN_DANS = /[A-Z]{2}\d{10}/;

const b = (await r.listBulletins(2000)).find((x) => x.sessionDate === seance);
const bytes = b?.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance))?.bytes;
if (!bytes) throw new Error(`pas de fichier pour ${seance}`);

const rangees = await rangeesDuPdf(Uint8Array.from(bytes));
const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)), await r.nominauxDeReference(seance));
const lus = new Set(parsed.bonds.map((o) => o.isin));

const mêmePage = rangees.filter((x) => x.page === page);
const grille = colonnes(mêmePage);
console.log(`${seance} page ${page} · ${mêmePage.length} rangées · grille de ${grille.length} colonnes\n`);

for (const x of mêmePage) {
  const cells = rangeeSeparee(x, grille).map((c) => c.texte);
  const isin = cells.find((c) => ISIN_DANS.test(c));
  if (!isin) continue;
  const marque = lus.has(isin.match(ISIN_DANS)[0]) ? "LUE  " : "PERDUE";
  /* La queue se compte après le statut : c'est elle qui décide. */
  const iStatut = cells.findIndex((c) => /^[A-Z]{1,3}[a-z]?$/.test(c) && !ISIN_DANS.test(c) && cells.indexOf(c) > 4);
  const queue = iStatut >= 0 ? cells.slice(iStatut + 1) : [];
  console.log(`${marque} ${isin.slice(0, 12)} · ${cells.length} cellules · queue de ${queue.length} : ${queue.join(" | ")}`);
}
