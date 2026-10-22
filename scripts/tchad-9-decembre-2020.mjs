/**
 * LA SEULE COUVERTURE QUI NE TOMBE NULLE PART : TCHAD, 9 DECEMBRE 2020.
 *
 * Annonce 6 035, soumissions 8 400, servi 6 035, et un taux de couverture
 * imprime a 137,19 %. Or 8 400 / 6 035 fait 139,19 %, et 6 035 / 6 035 fait
 * cent. Le rapport ne tombe sur aucun des deux.
 *
 * EN RETOURNANT LE CALCUL : pour que 137,19 % sorte d un numerateur de
 * 8 400, il faudrait diviser par 6 123 et non par 6 035. Pour qu il sorte
 * d un diviseur de 6 035, il faudrait un numerateur de 8 280 et non 8 400.
 * L un des deux nombres est donc a cent vingt millions pres de ce que nous
 * avons lu, et le taux imprime dit lequel.
 *
 * Cette piece porte une couche de texte : on n a pas besoin d un oeil.
 *
 *   npx tsx --conditions=react-server scripts/tchad-9-decembre-2020.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function texteDe(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    out += (await page.getTextContent()).items.map((i) => i.str).join(" ") + "\n";
  }
  await doc.destroy();
  return out;
}

const r = (await repo().listAuctionResults({ limit: 2000 })).find((x) => x.country === "Tchad" && x.sessionOn === "2020-12-09" && x.instrument === "BTA");
if (!r) {
  dire("seance introuvable");
  process.exit(1);
}
dire(`=== CE QUE NOUS AVONS LU ===`);
dire(`   annonce ${Number(r.announced) / 1e6} M · soumissions ${Number(r.bid) / 1e6} M · servi ${Number(r.served) / 1e6} M · couverture ${r.coverage} %`);
dire(`   par le carnet ${(((Number(r.bid) / Number(r.announced)) * 100)).toFixed(2)} % · par le servi ${(((Number(r.served) / Number(r.announced)) * 100)).toFixed(2)} %`);
dire(`\n   pour que 137,19 % tienne :`);
dire(`      avec 8 400 au numerateur, il faudrait diviser par ${((Number(r.bid) / Number(r.coverage)) * 100 / 1e6).toFixed(0)} M`);
dire(`      avec 6 035 au denominateur, il faudrait ${((Number(r.announced) * Number(r.coverage)) / 100 / 1e6).toFixed(0)} M au numerateur`);

dire(`\n=== CE QUE LA PIECE IMPRIME ===`);
if (!r.fileKey) {
  dire("   pas de piece rangee");
  process.exit(0);
}
try {
  const t = await texteDe(await readSource(r.fileKey));
  const n = t.replace(/\s+/g, "").length;
  if (n < 200) dire(`   scan muet (${n} caracteres) : seul un oeil peut lire les montants`);
  else dire(`   ${t.replace(/[ \t]+/g, " ").replace(/\n/g, " ").trim()}`);
} catch (e) {
  dire(`   illisible : ${String(e.message).slice(0, 80)}`);
}
dire(`\n   ${r.sourceUrl}`);
