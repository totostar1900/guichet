/**
 * TOUTES LES OBLIGATIONS QUE LE PIPELINE REND, UNE PAR LIGNE, POUR DIFF.
 *
 * C'est l'outil de non-régression, et il répond à UNE question : entre deux
 * versions du lecteur, qu'est-ce qui apparaît, qu'est-ce qui disparaît, et
 * qu'est-ce qui change de valeur SUR LE MÊME TEXTE.
 *
 * La discipline est celle du 11 octobre : comparer deux lecteurs sur le même
 * texte, et jamais un lecteur à la base, qui mêlerait les générations. On
 * dumpe donc ici, on remise le code, on redumpe, et on diffe les deux
 * fichiers. Rien n'est écrit en base.
 *
 *   npx tsx --conditions=react-server scripts/dump-obligations.mjs <sortie> [combien]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { completerObligations } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const sortie = process.argv[2];
if (!sortie) throw new Error("usage : dump-obligations.mjs <sortie> [combien]");
const combien = Number(process.argv[3]) || 120;
/* UNE FENÊTRE DE DATES, PARCE QUE « LES N PLUS RÉCENTES » EST LE MAUVAIS
   ÉCHANTILLON ICI : les séances récentes sont toutes du millésime moderne,
   donc elles ne montrent ni le gain ni le risque. Il faut les deux époques,
   et séparément. */
const de = process.argv.includes("--de") ? process.argv[process.argv.indexOf("--de") + 1] : "0000";
const a = process.argv.includes("--a") ? process.argv[process.argv.indexOf("--a") + 1] : "9999";

const r = repo();
const lot = (await r.listBulletins(2000))
  .filter((b) => b.sessionDate >= de && b.sessionDate <= a)
  .sort((x, y) => y.sessionDate.localeCompare(x.sessionDate))
  .slice(0, combien);

const lignes = [];
let sansFichier = 0;
for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) {
    sansFichier++;
    continue;
  }
  /* UN APPEL RÉSEAU QUI LÂCHE NE DOIT PAS EMPORTER LA MESURE : la première
     tentative est morte au bout de onze minutes sur un refus transitoire,
     et dix minutes de machine sont parties avec elle. On réessaie une fois,
     puis on dit la séance sautée au lieu de mourir. */
  let refs;
  try {
    refs = await r.nominauxDeReference(b.sessionDate);
  } catch {
    try {
      refs = await r.nominauxDeReference(b.sessionDate);
    } catch (e) {
      console.error(`   ${b.sessionDate} sautée : ${(e).message}`);
      continue;
    }
  }
  const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)), refs);
  await completerObligations(parsed, Uint8Array.from(bytes), refs);
  const n = (v) => (v == null || !Number.isFinite(v) ? "" : String(v));
  for (const o of parsed.bonds.slice().sort((x, y) => x.isin.localeCompare(y.isin))) {
    lignes.push([b.sessionDate, o.isin, n(o.previousPct), n(o.previousFcfa), n(o.nominalRemaining), n(o.accruedCoupon), n(o.open), n(o.close), n(o.thresholdHigh), n(o.thresholdLow), n(o.variationPct), n(o.referenceNextFcfa), o.status].join(";"));
  }
}

fs.writeFileSync(sortie, lignes.join("\n") + "\n", "utf8");
console.log(`${lignes.length} obligations sur ${lot.length - sansFichier} séances lues (${sansFichier} sans fichier) → ${sortie}`);
