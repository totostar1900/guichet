/**
 * ÉCRIRE L'ENCOURS DE LA DETTE POUR UNE SUITE DE SÉANCES.
 *
 * On relit le bulletin déjà gardé plutôt que de réingérer la séance entière :
 * une réingestion réécrirait cotations et VL, donc rejouerait tout le pipeline
 * pour une table qui n'en dépend pas. Ici on ne touche qu'à debt_outstandings.
 *
 * IL DIT OÙ IL EN EST, toutes les vingt séances et sur stdout sans tampon.
 * Deux mesures ont tourné une heure quarante sans une ligne de trace parce que
 * le tampon de sortie ne se vidait jamais : on ne recommence pas.
 *
 *   npx tsx --conditions=react-server scripts/encours-ingerer.mjs [--tout] [séance…]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { VERSION_DU_LECTEUR } = await import("../src/lib/market/lecteur-version.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);

const r = repo();
const tous = await repo().listBulletins(2000);
const demandees = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cibles = process.argv.includes("--tout") ? tous.map((b) => b.sessionDate).sort() : demandees;

dire(`${cibles.length} séance(s) à lire, lecteur v${VERSION_DU_LECTEUR}`);

let lues = 0;
let vides = 0;
let echecs = 0;
let lignes = 0;
const debut = Date.now();

for (const [i, jour] of cibles.entries()) {
  const b = tous.find((x) => x.sessionDate === jour);
  if (!b) {
    echecs += 1;
    continue;
  }
  try {
    const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(jour))?.bytes;
    if (!bytes) {
      echecs += 1;
      continue;
    }
    /* LA SECONDE IDENTITE : le dernier nominal non nul connu de chaque
       ligne AVANT cette seance. Elle ne sert que quand la rangee ne se
       comprend pas seule, et c est une requete par seance. */
    const refs = await r.nominauxDeReference(jour);
    const out = encoursGeometriques(await rangeesDuPdf(Uint8Array.from(bytes)), undefined, false, refs);
    if (out.length === 0) vides += 1;
    else {
      await r.upsertEncoursDette(out.map((e) => ({ ...e, sessionDate: jour, readerVersion: VERSION_DU_LECTEUR })));
      lues += 1;
      lignes += out.length;
    }
  } catch (e) {
    echecs += 1;
    dire(`  ${jour} : ${e.message}`);
  }
  if ((i + 1) % 20 === 0) {
    const parSeance = (Date.now() - debut) / (i + 1);
    dire(`  ${i + 1}/${cibles.length} · ${lues} servies, ${vides} sans table, ${echecs} en échec · ${lignes} lignes · reste ~${Math.round((parSeance * (cibles.length - i - 1)) / 60000)} min`);
  }
}

dire(`\nFINI : ${lues} séances servies, ${vides} sans table, ${echecs} en échec, ${lignes} lignes écrites.`);
