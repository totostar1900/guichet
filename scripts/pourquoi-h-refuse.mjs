/**
 * ÉTAPE 2 : CE QUE LA FAMILLE H REFUSE ENCORE, ET POURQUOI.
 *
 * La seconde identité (étape 1) sert la famille I : là, l'expression
 * régulière avait reconnu la ligne et seule la découpe manquait. Pour H la
 * ligne n'est pas reconnue du tout, donc un prix de référence n'y peut rien
 * par lui-même : il faut savoir OÙ la reconnaissance casse.
 *
 * Trois questions par ligne refusée, et le script y répond séparément :
 *
 *   1. DENSE échoue-t-elle, DENSE_OLD aussi, et sur quel morceau ?
 *   2. le lecteur géométrique voit-il la rangée de cette ligne ?
 *   3. s'il la voit, que refuse-t-il (le carnet garde sa raison) ?
 *
 * Rien n'est écrit. C'est la mesure qui dira ce que le desk doit enseigner,
 * et ce qui se répare sans lui.
 *
 *   npx tsx scripts/pourquoi-h-refuse.mjs [combien]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc, Carnet } = await import("../src/lib/market/boc-parse.ts");
const { rangeesDuPdf, obligationsGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { enAttente } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const combien = Number(process.argv[2]) || 10;
const NON_RECONNUE = /^Obligation ([A-Z]{2}\d{10}) : ligne de cours non reconnue/;

const tous = await r.listBulletins(2000);
const lot = tous
  .filter(enAttente)
  .filter((b) => [...(b.warnings ?? [])].some((w) => NON_RECONNUE.test(w)))
  .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  .slice(0, combien);

console.log(`${lot.length} séances portant au moins une ligne « non reconnue »\n`);

const bilan = { vueParLaGeometrie: 0, invisible: 0, refusees: {}, formes: {} };

for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;

  let parsed, rangees;
  try {
    const texte = await pdfText(bytes);
    parsed = parseBoc(texte);
    /* pdfjs prend la propriété du tampon et le détache : une copie, sinon la
       seconde lecture rend du vide en silence. */
    rangees = await rangeesDuPdf(bytes.slice());
  } catch (e) {
    console.log(`${b.sessionDate} : ${e.message}`);
    continue;
  }

  const carnet = new Carnet();
  const geo = obligationsGeometriques(rangees, carnet);
  const vues = new Set(geo.map((x) => x.isin));

  for (const n of parsed.notes) {
    const m = n.message.match(NON_RECONNUE);
    if (!m || !n.brut) continue;
    const isin = m[1];
    const brut = n.brut.replace(/\u202f|\u00a0/g, " ");

    /* La forme de la ligne, chiffres effacés : c'est elle qui dit si une
       mise en page se répète ou si chaque cas est unique. */
    const forme = brut.replace(/\d/g, "9").replace(/9+/g, "9").slice(0, 90);
    bilan.formes[forme] = (bilan.formes[forme] ?? 0) + 1;

    const parLaGeometrie = vues.has(isin);
    if (parLaGeometrie) bilan.vueParLaGeometrie += 1;
    else bilan.invisible += 1;
    const refus = carnet.notes.filter((x) => x.message.includes(isin)).map((x) => x.message.replace(`Obligation ${isin} : `, ""));
    for (const x of refus) bilan.refusees[x.slice(0, 60)] = (bilan.refusees[x.slice(0, 60)] ?? 0) + 1;

    console.log(`${b.sessionDate} ${isin} ${parLaGeometrie ? "LUE par la géométrie" : "invisible même à la géométrie"}`);
    console.log(`    brut  : ${brut.slice(0, 150)}`);
    if (refus.length) console.log(`    refus : ${refus[0].slice(0, 120)}`);
  }
}

console.log(`\n${bilan.vueParLaGeometrie} lignes que la géométrie lit · ${bilan.invisible} qu'elle ne voit pas\n`);
console.log("ce que la géométrie refuse :");
for (const [k, v] of Object.entries(bilan.refusees).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(3)} ${k}`);
console.log(`\nles formes de ligne, chiffres effacés (${Object.keys(bilan.formes).length} distinctes) :`);
for (const [k, v] of Object.entries(bilan.formes).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   ${String(v).padStart(3)} ${k}`);
