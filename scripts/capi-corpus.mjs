/**
 * Ce que la lecture géométrique rend à la table de capitalisation, sur tout
 * le corpus. Elle écrit une trace toutes les 25 séances.
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { rangeesDuPdf, capitalisationsGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const bulletins = (await repo().listBulletins(2000)).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
let vues = 0;
let seancesVides = 0;
let seancesRendues = 0;
let lignesRendues = 0;
let regressions = 0;
let produitsFaux = 0;
const t0 = Date.now();

for (const [i, b] of bulletins.entries()) {
  if (i % 25 === 0) fs.writeSync(1, `  … ${i}/${bulletins.length}  ${b.sessionDate}  ${Math.round((Date.now() - t0) / 1000)}s  (+${lignesRendues} lignes)\n`);
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;
  vues++;
  const aplati = parseBoc(await pdfText(Uint8Array.from(bytes))).capitalisation;
  let geo = [];
  try {
    geo = capitalisationsGeometriques(await rangeesDuPdf(Uint8Array.from(bytes)));
  } catch {
    geo = [];
  }

  for (const c of geo) {
    if (Math.abs(c.marketCapFloat - c.close * c.sharesFloat) > 1 || Math.abs(c.marketCapTotal - c.close * c.sharesTotal) > 1) {
      produitsFaux++;
      console.log(`${b.sessionDate}  PRODUIT FAUX  ${c.isin} ${c.close} × ${c.sharesFloat} ≠ ${c.marketCapFloat}`);
    }
  }

  if (aplati.length === 0) {
    seancesVides++;
    if (geo.length > 0) {
      seancesRendues++;
      lignesRendues += geo.length;
    }
  } else if (geo.length > 0 && geo.length < aplati.length) {
    /* La géométrie n'est consultée que si l'aplatie n'a rien : on vérifie tout
       de même qu'elle ne ferait pas moins bien là où l'aplatie réussit. */
    regressions++;
    console.log(`${b.sessionDate}  aplati ${aplati.length} > géométrie ${geo.length}`);
  }
}

console.log(`\n=== ${vues} séances lues ===\n`);
console.log(`   ${seancesVides} séances où la lecture aplatie ne rend RIEN`);
console.log(`   ${seancesRendues} d'entre elles rendues par la géométrie`);
console.log(`   +${lignesRendues} lignes de capitalisation`);
console.log(`   ${produitsFaux} produits faux   ${produitsFaux === 0 ? "(le contrôle arithmétique tient)" : "<<< À REGARDER"}`);
console.log(`   ${regressions} séances où la géométrie ferait moins bien`);
