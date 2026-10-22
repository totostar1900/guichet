/**
 * LES DEUX LECTEURS D'OPCVM SUR LE MÊME TEXTE, DANS LE MÊME PROCESSUS.
 *
 * La discipline des obligations, appliquée aux fonds : on ne compare pas un
 * lecteur à la base, qui mêlerait les générations. La version HEAD est
 * importée depuis une copie posée à côté (boc-parse.head.ts, hors du dépôt,
 * effacée après la mesure) : rien n'est réimplémenté.
 *
 * TROIS VERDICTS PAR SÉANCE :
 *   gagnés    un fonds que la nouvelle version lit et l'ancienne non
 *   perdus    un fonds que l'ancienne lisait et la nouvelle non  ← DOIT VALOIR 0
 *   changés   un fonds lu par les deux, avec une valeur différente
 *
 *   npx tsx --conditions=react-server scripts/avant-apres-opcvm.mjs [--toutes]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const neuf = await import("../src/lib/market/boc-parse.ts");
const vieux = await import("../src/lib/market/boc-parse.head.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const M = /^OPCVM : ligne ignorée/;
const toutes = process.argv.includes("--toutes");

const bulletins = await r.listBulletins(2000);
const lot = (toutes ? bulletins : bulletins.filter((b) => (b.warnings ?? []).some((w) => M.test(w)))).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
console.log(`${lot.length} séances${toutes ? "" : " portant la remarque M"}\n`);

const signature = (f) => [f.name, f.nav, f.navDate, f.previousNav, f.previousDate, f.inceptionDate].join(";");

let totalG = 0;
let totalP = 0;
let totalC = 0;
let mAvant = 0;
let mApres = 0;
let vues = 0;

for (const b of lot) {
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
  const a = new Map(A.funds.map((f) => [f.name, signature(f)]));
  const bb = new Map(B.funds.map((f) => [f.name, signature(f)]));

  mAvant += A.warnings.filter((w) => M.test(w)).length;
  mApres += B.warnings.filter((w) => M.test(w)).length;

  const gagnes = [...bb.keys()].filter((k) => !a.has(k));
  const perdus = [...a.keys()].filter((k) => !bb.has(k));
  const changes = [...a.keys()].filter((k) => bb.has(k) && a.get(k) !== bb.get(k));
  totalG += gagnes.length;
  totalP += perdus.length;
  totalC += changes.length;

  if (gagnes.length || perdus.length || changes.length) {
    console.log(`${b.sessionDate}  +${gagnes.length}  -${perdus.length}  ~${changes.length}`);
    for (const k of gagnes.slice(0, 3)) console.log(`   GAGNÉ   ${k} · ${bb.get(k)}`);
    for (const k of perdus) console.log(`   PERDU   ${k} · ${a.get(k)}`);
    for (const k of changes) console.log(`   CHANGÉ  ${k}\n      avant ${a.get(k)}\n      après ${bb.get(k)}`);
  }
}

console.log(`\n=== ${vues} séances lues ===\n`);
console.log(`   +${totalG} fonds gagnés`);
console.log(`   -${totalP} perdus   ${totalP === 0 ? "(aucune régression)" : "<<< À REGARDER"}`);
console.log(`   ~${totalC} changés  ${totalC === 0 ? "(aucun)" : "<<< À REGARDER"}`);
console.log(`\n   remarques « ligne ignorée » : ${mAvant} → ${mApres}  (${mApres - mAvant >= 0 ? "+" : ""}${mApres - mAvant})`);
