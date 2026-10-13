/**
 * LES DEUX LECTEURS SUR LE MÊME TEXTE, pour la table de capitalisation.
 *
 * La discipline habituelle : on ne compare pas un lecteur à la base, qui
 * mêlerait les générations. La version HEAD est importée depuis une copie
 * posée à côté (boc-parse.head.ts, hors du dépôt).
 *
 *   npx tsx --conditions=react-server scripts/avant-apres-capi.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const neuf = await import("../src/lib/market/boc-parse.ts");
const vieux = await import("../src/lib/market/boc-parse.head.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const CAPI = /^Capitalisation .* cellules incomplètes|^Section « Capitalisation/;
const bulletins = (await repo().listBulletins(2000)).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
const signature = (c) => [c.isin, c.mnemo, c.close, c.sharesFloat, c.sharesTotal, c.marketCapFloat, c.marketCapTotal].join(";");

let vues = 0;
let gagnees = 0;
let perdues = 0;
let changees = 0;
let mAvant = 0;
let mApres = 0;
const t0 = Date.now();

for (const [i, b] of bulletins.entries()) {
  if (i % 50 === 0) fs.writeSync(1, `  … ${i}/${bulletins.length}  ${b.sessionDate}  ${Math.round((Date.now() - t0) / 1000)}s\n`);
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;
  const texte = await pdfText(Uint8Array.from(bytes));
  vues++;

  const A = vieux.parseBoc(texte);
  const B = neuf.parseBoc(texte);
  mAvant += A.warnings.filter((w) => CAPI.test(w)).length;
  mApres += B.warnings.filter((w) => CAPI.test(w)).length;

  const a = new Map((A.capitalisation ?? []).map((c) => [c.isin, signature(c)]));
  const bb = new Map((B.capitalisation ?? []).map((c) => [c.isin, signature(c)]));
  const g = [...bb.keys()].filter((k) => !a.has(k));
  const p = [...a.keys()].filter((k) => !bb.has(k));
  const c = [...a.keys()].filter((k) => bb.has(k) && a.get(k) !== bb.get(k));
  gagnees += g.length;
  perdues += p.length;
  changees += c.length;
  if (g.length || p.length || c.length) {
    console.log(`${b.sessionDate}  +${g.length}  -${p.length}  ~${c.length}`);
    for (const k of p) console.log(`   PERDUE  ${k} · ${a.get(k)}`);
    for (const k of c) {
      console.log(`   CHANGÉ  ${k}`);
      console.log(`      avant ${a.get(k)}`);
      console.log(`      après ${bb.get(k)}`);
    }
  }
}

console.log(`\n=== ${vues} séances lues ===\n`);
console.log(`   +${gagnees} lignes de capitalisation gagnées`);
console.log(`   -${perdues} perdues   ${perdues === 0 ? "(aucune régression)" : "<<< À REGARDER"}`);
console.log(`   ~${changees} changées  ${changees === 0 ? "(aucune)" : "<<< À REGARDER"}`);
console.log(`\n   remarques de capitalisation : ${mAvant} → ${mApres}  (${mApres - mAvant})`);
