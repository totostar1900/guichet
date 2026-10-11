/**
 * LES DEUX LECTEURS SUR LE MÊME TEXTE, SÉANCE PAR SÉANCE.
 *
 * 2b assouplit les expressions régulières du lecteur aplati : décimales
 * facultatives sur les pourcentages, et la rangée se décolle de la tête de
 * l'obligation suivante. Un assouplissement peut casser une ligne qui
 * marchait, et ces lignes-là sont dans les 600 séances qui VONT BIEN, pas
 * dans les 212 en attente. La mesure doit donc porter sur les 812.
 *
 * COMPARER LES DEUX LECTEURS, ET NON CHACUN À LA BASE. Un essai à blanc
 * ordinaire compare le lecteur d'aujourd'hui à ce qui est enregistré ; il
 * mêlerait donc l'effet de 2b à tout ce qui a changé depuis la lecture
 * d'origine. Ici on télécharge le PDF UNE fois, on le passe aux deux
 * lecteurs, et l'écart est exactement 2b. Deux fois moins de téléchargements,
 * et une réponse qui ne demande aucune interprétation.
 *
 * Le critère est un REFUS : 2b doit gagner des lignes et n'en perdre aucune.
 *
 *   npx tsx scripts/avant-apres-2b.mjs [combien]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc: apres } = await import("../src/lib/market/boc-parse.ts");
const { parseBoc: avant } = await import("../src/lib/market/boc-parse.avant2b.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const combien = Number(process.argv[2]) || 1e9;
const tous = (await r.listBulletins(2000)).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)).slice(0, combien);

/* Les nominaux de référence, comme l'ingestion les fournit : les deux
   lecteurs les reçoivent, sinon on mesurerait aussi l'étape 1. */
const cacheHist = new Map();
async function refs(avantDate) {
  const out = new Map();
  for (const q of await r.latestQuotes().catch(() => [])) {
    if (q.instrument !== "obligation") continue;
    if (q.sessionDate < avantDate && q.nominalRemaining > 0) {
      out.set(q.isin, q.nominalRemaining);
      continue;
    }
    if (!cacheHist.has(q.isin)) cacheHist.set(q.isin, await r.listQuotes(q.isin, 2000).catch(() => []));
    const ref = cacheHist.get(q.isin).filter((x) => x.sessionDate < avantDate && x.nominalRemaining > 0).sort((x, y) => y.sessionDate.localeCompare(x.sessionDate))[0];
    if (ref) out.set(q.isin, ref.nominalRemaining);
  }
  return out;
}

console.log(`${tous.length} séances · les deux lecteurs sur le même texte\n`);

const gagne = [];
const perd = [];
let egal = 0;
let injoignable = 0;
let fait = 0;

for (const b of tous) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) {
    injoignable += 1;
    continue;
  }
  let a, p;
  try {
    const texte = await pdfText(bytes);
    const ref = await refs(b.sessionDate);
    a = avant(texte, ref);
    p = apres(texte, ref);
  } catch (e) {
    console.log(`${b.sessionDate} : ${e.message}`);
    continue;
  }
  fait += 1;
  process.stdout.write(`\r${fait}/${tous.length}   `);

  const d = { act: p.equities.length - a.equities.length, obl: p.bonds.length - a.bonds.length, opc: p.funds.length - a.funds.length };
  const ligne = `${b.sessionDate} actions ${a.equities.length}→${p.equities.length} · obligations ${a.bonds.length}→${p.bonds.length} · OPCVM ${a.funds.length}→${p.funds.length}`;
  if (d.act < 0 || d.obl < 0 || d.opc < 0) perd.push(ligne);
  else if (d.act > 0 || d.obl > 0 || d.opc > 0) gagne.push(ligne);
  else egal += 1;
}

console.log(`\n\n=== CE QUE 2B CHANGE (${fait} séances lues deux fois) ===\n`);
console.log(`   ${String(gagne.length).padStart(4)} séances gagnent des lignes`);
console.log(`   ${String(perd.length).padStart(4)} séances EN PERDENT  ← le critère de refus`);
console.log(`   ${String(egal).padStart(4)} séances identiques`);
console.log(`   ${String(injoignable).padStart(4)} documents injoignables`);
if (perd.length) console.log(`\ncelles qui perdent :\n${perd.map((l) => `   ${l}`).join("\n")}`);
if (gagne.length) console.log(`\ncelles qui gagnent :\n${gagne.map((l) => `   ${l}`).join("\n")}`);
