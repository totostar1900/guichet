/**
 * LES DEUX VERSIONS DU LECTEUR GÉOMÉTRIQUE, SUR LE MÊME TEXTE, EN UNE PASSE.
 *
 * La discipline du 11 octobre, enfin outillée proprement : on ne compare pas
 * un lecteur à la base, qui mêlerait les générations et a déjà fait annoncer
 * 365 lignes pour 12 et inventer 7 pertes. On compare DEUX LECTEURS SUR LE
 * MÊME TEXTE, et ici dans le même processus, donc sur les mêmes octets.
 *
 * La version HEAD est importée depuis une copie posée à côté
 * (boc-geometrie.head.ts, hors du dépôt, effacée après la mesure) : rien
 * n'est réimplémenté, et c'est le point. Réimplémenter l'ancien comportement
 * dans le script est exactement ce qui m'a trompé deux jours de suite.
 *
 * TROIS COLONNES DE VERDICT PAR SÉANCE :
 *   gagnées   un ISIN que la nouvelle version lit et l'ancienne non
 *   perdues   un ISIN que l'ancienne lisait et la nouvelle non  ← LE CHIFFRE
 *             QUI DÉCIDE : il doit valoir zéro
 *   changées  un ISIN lu par les deux, avec une valeur différente
 *
 *   npx tsx --conditions=react-server scripts/avant-apres-queue.mjs [--de AAAA-MM-JJ] [--a AAAA-MM-JJ] [combien]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const neuf = await import("../src/lib/market/boc-geometrie.ts");
const vieux = await import("../src/lib/market/boc-geometrie.head.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const arg = (nom, def) => (process.argv.includes(nom) ? process.argv[process.argv.indexOf(nom) + 1] : def);
const de = arg("--de", "0000");
const a = arg("--a", "9999");
const combien = Number(process.argv.find((x, i) => i > 1 && /^\d+$/.test(x))) || 1e9;

const r = repo();
const lot = (await r.listBulletins(2000))
  .filter((b) => b.sessionDate >= de && b.sessionDate <= a)
  .sort((x, y) => y.sessionDate.localeCompare(x.sessionDate))
  .slice(0, combien);

/** La signature d'une obligation : tout ce qui part en base. */
const signature = (o) => [o.previousPct, o.previousFcfa, o.nominalRemaining, o.accruedCoupon, o.open, o.close, o.thresholdHigh, o.thresholdLow, Number.isFinite(o.variationPct) ? o.variationPct : "-", Number.isFinite(o.referenceNextFcfa) ? o.referenceNextFcfa : "-", o.status].join(";");

const lire = async (mod, bytes, refs) => {
  const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)), refs);
  await mod.completerObligations(parsed, Uint8Array.from(bytes), refs);
  return new Map(parsed.bonds.map((o) => [o.isin, signature(o)]));
};

console.log(`${lot.length} séances du ${lot.at(-1)?.sessionDate} au ${lot[0]?.sessionDate}\n`);

let totalG = 0;
let totalP = 0;
let totalC = 0;
let seancesVues = 0;
const gagnants = new Map();

for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;
  let refs;
  try {
    refs = await r.nominauxDeReference(b.sessionDate);
  } catch {
    try {
      refs = await r.nominauxDeReference(b.sessionDate);
    } catch (e) {
      console.error(`   ${b.sessionDate} sautée : ${e.message}`);
      continue;
    }
  }
  seancesVues++;

  const A = await lire(vieux, bytes, refs);
  const B = await lire(neuf, bytes, refs);

  const gagnees = [...B.keys()].filter((k) => !A.has(k));
  const perdues = [...A.keys()].filter((k) => !B.has(k));
  const changees = [...A.keys()].filter((k) => B.has(k) && A.get(k) !== B.get(k));
  totalG += gagnees.length;
  totalP += perdues.length;
  totalC += changees.length;
  for (const k of gagnees) gagnants.set(k, (gagnants.get(k) ?? 0) + 1);

  if (gagnees.length || perdues.length || changees.length) {
    console.log(`${b.sessionDate}  +${gagnees.length}  -${perdues.length}  ~${changees.length}`);
    for (const k of perdues) console.log(`   PERDUE  ${k} : ${A.get(k)}`);
    for (const k of changees) console.log(`   CHANGÉE ${k}\n      avant ${A.get(k)}\n      après ${B.get(k)}`);
  }
}

console.log(`\n=== ${seancesVues} séances lues ===\n`);
console.log(`   +${totalG} obligations gagnées`);
console.log(`   -${totalP} perdues   ${totalP === 0 ? "(aucune régression)" : "<<< À REGARDER"}`);
console.log(`   ~${totalC} changées de valeur   ${totalC === 0 ? "(aucune)" : "<<< À REGARDER"}`);
if (gagnants.size) {
  console.log(`\n   les lignes gagnées, par nombre de séances :`);
  for (const [k, n] of [...gagnants].sort((x, y) => y[1] - x[1])) console.log(`      ${k} : ${n}`);
}
