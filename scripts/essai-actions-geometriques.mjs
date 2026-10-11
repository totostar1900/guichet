/**
 * La ligne que Georges a relevée, rendue par la géométrie ?
 *
 * Le 22 décembre 2023, CM0000010041 (LA REGIONALE) est en page 2, lisible,
 * et le lecteur aplati n'en tient que seize caractères : « 42 50021/12/2023 ».
 * La rangée, elle, porte tout. Deux identités doivent la trancher : les
 * seuils à ± 10 % du cours précédent, et la variation annoncée.
 *
 *   npx tsx scripts/essai-actions-geometriques.mjs [AAAA-MM-JJ]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { completerObligations, actionsGeometriques, rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { Carnet } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const seance = process.argv[2] ?? "2023-12-22";
const r = repo();
const b = await r.getBulletin(seance);
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance)).bytes;
const refs = await r.nominauxDeReference(seance);

const p = parseBoc(await pdfText(bytes), refs);
console.log(`${seance}\n`);
console.log(`   lecture aplatie   : ${p.equities.length} actions`);
await completerObligations(p, bytes, refs);
console.log(`   après rattrapage  : ${p.equities.length} actions\n`);
for (const e of p.equities) {
  console.log(`   ${e.isin}  ouverture ${e.open} · clôture ${e.close} · précédent ${e.previousClose} · haut ${e.thresholdHigh} · bas ${e.thresholdLow} · variation ${e.variationPct} %`);
}
for (const n of p.notes) console.log(`   note : ${n.message}`);

/* Ce que la géométrie seule voit, et ce qu'elle refuse en le disant. */
const carnet = new Carnet();
const geo = actionsGeometriques(await rangeesDuPdf(bytes.slice()), carnet);
console.log(`\n   la géométrie seule lit ${geo.length} action(s) : ${geo.map((e) => e.isin).join(" ")}`);
for (const n of carnet.notes) console.log(`   refus : ${n.message}`);

console.log(`\n   les titres de section, tels que les rangées les portent :`);
for (const rg of await rangeesDuPdf(bytes.slice())) {
  for (const c of rg.cellules) {
    if (/MARCH|ACTION|CAPITALIS|OPCVM/i.test(c.texte)) console.log(`      page ${rg.page}  ${JSON.stringify(c.texte)}`);
  }
}
