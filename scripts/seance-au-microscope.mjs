/**
 * UNE SÉANCE AU MICROSCOPE : ce que le lecteur lit, ce qu'il dit, et ce que
 * le document porte vraiment, page par page.
 *
 * Georges, le 12 octobre 2026, sur le BOC du 22 décembre 2023 : « Seulement 0
 * action(s) lue(s) » alors que les six lignes sont là, lisibles, en page 2. Et
 * aucun des cinq motifs de réponse ne permet de le dire : le plus proche
 * affirme que le document est illisible à cet endroit, ce qui est faux.
 *
 * Avant de toucher aux motifs, il faut savoir lequel des trois moments
 * échoue : la LECTURE de la rangée, l'ÉCRITURE en base, ou le compte rendu.
 *
 *   npx tsx scripts/seance-au-microscope.mjs 2023-12-22
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText, equityQuote } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const seance = process.argv[2] ?? "2023-12-22";
const r = repo();
const b = await r.getBulletin(seance);

console.log(`=== CE QUE LA BASE GARDE (${seance}) ===\n`);
console.log(`   statut ${b.status} · lecteur v${b.readerVersion ?? "—"} · lu le ${b.ingestedAt.slice(0, 16)}`);
console.log(`   comptes : ${b.counts.equities} actions · ${b.counts.bonds} obligations · ${b.counts.funds} OPCVM`);
for (const a of b.anomalies ?? []) console.log(`   anomalie : ${a}`);
for (const w of (b.warnings ?? []).slice(0, 6)) console.log(`   avertissement : ${w}`);

const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance)).bytes;
const texte = await pdfText(bytes);
const refs = await r.nominauxDeReference(seance);
const p = parseBoc(texte, refs);

console.log(`\n=== CE QUE LE LECTEUR LIT AUJOURD'HUI ===\n`);
console.log(`   ${p.equities.length} actions · ${p.bonds.length} obligations · ${p.funds.length} OPCVM · BOC n° ${p.bulletinNo || "EN-TÊTE NON RECONNU"}`);
const PLAFOND = 10 ** 16; // numeric(18,2) : seize chiffres devant la virgule
for (const e of p.equities) {
  const q = equityQuote(e, p);
  const trop = Object.entries(q).filter(([, v]) => typeof v === "number" && Math.abs(v) >= PLAFOND);
  console.log(`   ${e.isin}  ouverture ${e.open} · clôture ${e.close}${trop.length ? `   ← REFUSÉ PAR LA BASE : ${trop.map(([k, v]) => `${k}=${v}`).join(", ")}` : ""}`);
}
for (const n of p.notes) console.log(`   note : ${n.message}${n.page != null ? ` (page ${n.page})` : ""}`);

console.log(`\n=== CE QUE LE DOCUMENT PORTE, PAGE PAR PAGE ===\n`);
const rangees = await rangeesDuPdf(bytes.slice());
const cherches = process.argv.slice(3);
const ISIN = /[A-Z]{2}\d{10}/;
for (const rg of rangees) {
  const texteRangee = [...rg.cellules].sort((a, b) => a.x - b.x).map((c) => c.texte).join(" ");
  const m = texteRangee.replace(/\s/g, "").match(ISIN);
  if (!m) continue;
  if (cherches.length && !cherches.some((x) => texteRangee.replace(/\s/g, "").includes(x))) continue;
  const lue = p.equities.some((e) => e.isin === m[0]) || p.bonds.some((x) => x.isin === m[0]);
  console.log(`   page ${rg.page}  ${m[0]}  ${lue ? "LUE " : "RATÉE"}  ${texteRangee.slice(0, 120)}`);
}

console.log(`\n=== LE TEXTE BRUT DE CHAQUE NOTE, TEL QUEL ===\n`);
for (const n of p.notes) {
  console.log(`   ${n.message}${n.page != null ? ` (page ${n.page})` : ""}`);
  if (n.brut) console.log(`      brut   : ${JSON.stringify(n.brut)}`);
  if (n.attendu) console.log(`      attendu: ${n.attendu}`);
}
