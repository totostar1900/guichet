/**
 * LA SECTION D ENCOURS D UNE SEANCE, TELLE QUE LE PDF LA REND.
 *
 * Le carnet de refus montre les cellules APRES la geometrie. Quand une
 * rangee n est pas refusee mais simplement absente, c est qu elle n est
 * jamais devenue une rangee : le carnet ne peut rien en dire, et il faut
 * remonter d un cran, au texte que pdfjs rend.
 *
 * Le 2025-09-30 : 8 lignes acceptees, 1 refusee, et 20 manquantes. Une
 * refusee se voit, dix-neuf invisibles ne se voient pas.
 *
 *   npx tsx --conditions=react-server scripts/encours-brut.mjs <seance> [motif]
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
const motif = process.argv[3] ? new RegExp(process.argv[3], "i") : /[A-Z]{2}\d{10}/;

const b = (await repo().listBulletins(3000)).find((x) => x.sessionDate === jour);
if (!b) { dire(`seance ${jour} introuvable`); process.exit(1); }
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(jour))?.bytes;
const rangees = await rangeesDuPdf(Uint8Array.from(bytes));

let n = 0;
for (const r of rangees) {
  const texte = typeof r === "string" ? r : (r.texte ?? (r.cellules ?? []).map((c) => c.texte ?? c).join(" | "));
  if (!motif.test(String(texte))) continue;
  n += 1;
  const page = typeof r === "object" && r.page != null ? ` p${r.page}` : "";
  dire(`${String(n).padStart(3)}${page}  ${String(texte).slice(0, 190)}`);
}
dire(`\n${n} rangee(s) du PDF portent le motif, sur ${rangees.length} rangees lues.`);
