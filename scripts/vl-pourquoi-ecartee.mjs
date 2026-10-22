/**
 * LAQUELLE DES QUATRE RÈGLES A ÉCARTÉ LA VL ?
 *
 * Le message dit « date ou valeur invraisemblable » sans dire laquelle des
 * quatre conditions a échoué, et la catégorie qu'on ne peut pas déduire de
 * l'extérieur pèse 59 remarques sur 92. Ce script rouvre les séances
 * concernées et pose la question au lecteur lui-même.
 *
 * Les quatre règles, telles que boc.ts les écrit :
 *   1. la VL n'est pas postérieure de plus de 7 jours à la séance
 *   2. ni antérieure de plus de 400 jours
 *   3. la valeur est strictement positive
 *   4. la VL ne précède pas la date de création du fonds
 *
 *   npx tsx --conditions=react-server scripts/vl-pourquoi-ecartee.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText, fundNav } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const VL = /^OPCVM (.+) : VL du (\d{4}-\d{2}-\d{2}) ignorée/;
const jour = 86_400_000;
const parse = (s) => new Date(`${s}T12:00:00`).getTime();

const lot = (await r.listBulletins(2000)).filter((b) => (b.warnings ?? []).some((w) => VL.test(w))).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
console.log(`${lot.length} séances portent au moins une VL écartée\n`);

const causes = { future: 0, vieille: 0, valeurNulle: 0, avantCreation: 0, plusieurs: 0, introuvable: 0 };
const exemples = { valeurNulle: [], avantCreation: [] };
let vues = 0;

for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;
  const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)));
  const vises = new Set((b.warnings ?? []).map((w) => w.match(VL)?.[1]).filter(Boolean));

  for (const f of parsed.funds) {
    const n = fundNav(f, parsed);
    if (!vises.has(n.name)) continue;
    vues++;
    const ecart = Math.round((parse(n.navDate) - parse(b.sessionDate)) / jour);
    const fautes = [];
    if (ecart > 7) fautes.push("future");
    if (ecart < -400) fautes.push("vieille");
    if (!(n.nav > 0)) fautes.push("valeurNulle");
    if (n.inceptionDate && n.navDate < n.inceptionDate) fautes.push("avantCreation");
    if (fautes.length === 0) causes.introuvable++;
    else if (fautes.length > 1) causes.plusieurs++;
    else causes[fautes[0]]++;
    if (fautes.includes("valeurNulle") && exemples.valeurNulle.length < 6) exemples.valeurNulle.push(`${b.sessionDate} · ${n.name.slice(0, 30)} · VL ${n.nav} du ${n.navDate}`);
    if (fautes.includes("avantCreation") && exemples.avantCreation.length < 6) exemples.avantCreation.push(`${b.sessionDate} · ${n.name.slice(0, 30)} · VL du ${n.navDate}, création annoncée ${n.inceptionDate}`);
  }
}

console.log(`${vues} VL écartées retrouvées dans les documents\n`);
console.log(`   postérieure de plus de 7 jours   ${causes.future}`);
console.log(`   antérieure de plus de 400 jours  ${causes.vieille}`);
console.log(`   valeur nulle ou négative         ${causes.valeurNulle}`);
console.log(`   VL avant la création du fonds    ${causes.avantCreation}`);
console.log(`   plusieurs règles à la fois        ${causes.plusieurs}`);
console.log(`   aucune règle ne fait faute aujourd'hui (le lecteur a changé) : ${causes.introuvable}`);
if (exemples.valeurNulle.length) {
  console.log(`\n   valeur nulle, exemples :`);
  for (const e of exemples.valeurNulle) console.log(`      ${e}`);
}
if (exemples.avantCreation.length) {
  console.log(`\n   VL avant création, exemples :`);
  for (const e of exemples.avantCreation) console.log(`      ${e}`);
}
