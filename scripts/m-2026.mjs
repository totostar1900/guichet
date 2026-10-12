/**
 * LA FAMILLE M SUR 2026, SÉANCE PAR SÉANCE.
 *
 * Ce que la base porte est ce qu'un lecteur ANCIEN a écrit. On repasse le
 * lecteur COURANT sur le même texte et on regarde ce qui reste : ce qui tombe
 * tout seul par la relecture, et ce qui résiste, avec le débris exact.
 *
 *   npx tsx --conditions=react-server scripts/m-2026.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const M = /^OPCVM : ligne ignorée/;
const bulletins = (await repo().listBulletins(2000))
  .filter((b) => b.sessionDate >= "2026-01-01" && (b.warnings ?? []).some((w) => M.test(w)))
  .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

console.log(`${bulletins.length} séances de 2026 portant la remarque M\n`);

let tombent = 0;
const restent = [];

for (const b of bulletins) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) {
    console.log(`${b.sessionDate}  PDF introuvable`);
    continue;
  }
  const texte = await pdfText(Uint8Array.from(bytes));
  const r = parseBoc(texte);
  const m = r.warnings.filter((w) => M.test(w));
  const avant = (b.warnings ?? []).filter((w) => M.test(w)).length;

  if (m.length === 0) {
    tombent++;
    console.log(`${b.sessionDate}  ${avant} → 0   fonds lus ${r.funds.length}`);
  } else {
    restent.push({ date: b.sessionDate, m, fonds: r.funds.length });
    console.log(`${b.sessionDate}  ${avant} → ${m.length}  RESTE   fonds lus ${r.funds.length}`);
    for (const w of m) console.log(`      ${w}`);
  }
}

console.log(`\n=== ${tombent} séances tombent par la seule relecture, ${restent.length} résistent ===`);
if (restent.length) {
  const parDebris = new Map();
  for (const r of restent) for (const w of r.m) parDebris.set(w, (parDebris.get(w) ?? 0) + 1);
  console.log(`\n${parDebris.size} débris distincts :`);
  for (const [w, n] of [...parDebris].sort((a, b) => b[1] - a[1])) console.log(`  ×${n}  ${w}`);
}
