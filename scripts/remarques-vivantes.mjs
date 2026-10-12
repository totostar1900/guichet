/**
 * LES REMARQUES D'UNE SÉANCE SONT-ELLES ENCORE VIVANTES ?
 *
 * Le rapport n'offre le bouton « Juger » qu'aux remarques que le lecteur
 * D'AUJOURD'HUI dit encore : les autres se rangent sous le repli, avec la
 * phrase « le lecteur ne dit plus cela », et sans bouton. C'est voulu, et
 * c'est aussi un piège : si la relecture rend une phrase LÉGÈREMENT
 * différente, la remarque se range et devient injugeable.
 *
 * Ce script compare, pour une séance, ce que la base garde et ce que le
 * lecteur d'aujourd'hui dit.
 *
 *   npx tsx --conditions=react-server scripts/remarques-vivantes.mjs 2023-08-02
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { completerObligations } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const seance = process.argv[2] ?? "2023-08-02";
const b = (await r.listBulletins(2000)).find((x) => x.sessionDate === seance);
if (!b) throw new Error(`pas de séance ${seance}`);

const enBase = [...(b.anomalies ?? []), ...(b.warnings ?? [])];
console.log(`${seance} · ${enBase.length} remarques en base :\n`);
for (const p of enBase) console.log(`   « ${p} »`);

let bytes;
try {
  bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(seance))?.bytes;
} catch (e) {
  console.log(`\nLE DOCUMENT EST INJOIGNABLE : ${e.message}`);
  console.log(`Dans ce cas le rapport ne sait pas ce que le lecteur dirait, et il garde TOUTES les remarques vivantes.`);
  process.exit(0);
}
if (!bytes) {
  console.log(`\nLE DOCUMENT EST INTROUVABLE. Le rapport garde alors toutes les remarques vivantes.`);
  process.exit(0);
}

const refs = await r.nominauxDeReference(seance).catch(() => undefined);
const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)), refs);
await completerObligations(parsed, Uint8Array.from(bytes), refs);
const fraiches = new Set([...parsed.warnings, ...parsed.notes.map((n) => n.message)]);

console.log(`\nCe que le lecteur d'aujourd'hui dit (${fraiches.size}) :\n`);
for (const p of fraiches) console.log(`   « ${p} »`);

const perimees = enBase.filter((p) => !fraiches.has(p));
console.log(`\n=== VERDICT ===\n`);
console.log(`   ${enBase.length - perimees.length} remarque(s) VIVANTE(S) : le bouton « Juger » s'affiche.`);
console.log(`   ${perimees.length} remarque(s) rangée(s) sous le repli, SANS bouton :`);
for (const p of perimees) console.log(`      « ${p} »`);
