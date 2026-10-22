/**
 * LES ABSCISSES DES CELLULES D UNE RANGEE.
 *
 * Quand deux rangees voisines portent chacune la valeur de l autre, une
 * seule question tranche : les deux valeurs sont-elles dans LA MEME COLONNE
 * de la page ? Si oui, le bulletin les a imprimees ainsi et l echange est a
 * la source. Sinon, c est notre geometrie qui a mal attribue une cellule, et
 * le defaut est chez nous.
 *
 * Le rendu en image ne repond pas : les polices de ce PDF ne s incorporent
 * pas, et la page sort en grille vide.
 *
 *   npx tsx --conditions=react-server scripts/encours-colonnes.mjs <seance> <isin...>
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const jour = process.argv[2];
const isins = process.argv.slice(3);

const b = (await repo().listBulletins(3000)).find((x) => x.sessionDate === jour);
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(jour))?.bytes;
const rangees = await rangeesDuPdf(Uint8Array.from(bytes));

for (const r of rangees) {
  const cellules = r.cellules ?? r.cells ?? null;
  const texte = typeof r === "string" ? r : (r.texte ?? (cellules ?? []).map((c) => c.texte ?? c).join(" | "));
  if (!isins.some((i) => String(texte).includes(i))) continue;

  dire(`\n=== ${isins.find((i) => String(texte).includes(i))}  (page ${r.page ?? "?"})`);
  if (!cellules) { dire(`   pas de cellules exposees ; cles de la rangee : ${Object.keys(r).join(", ")}`); continue; }
  for (const [k, c] of cellules.entries()) {
    const t = String(c.texte ?? c).trim();
    const x = c.x != null ? c.x.toFixed(1) : c.de != null ? String(c.de) : "?";
    const fin = c.x2 != null ? c.x2.toFixed(1) : c.a != null ? String(c.a) : "?";
    dire(`   ${String(k).padStart(2)}  x ${String(x).padStart(7)} → ${String(fin).padStart(7)}  ${c.coupee ? "coupee " : "       "}${t.slice(0, 40)}`);
  }
}
