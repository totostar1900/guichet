/**
 * POURQUOI LE CONSTRUCTEUR GÉOMÉTRIQUE REFUSE UNE RANGÉE.
 *
 * L'avertissement en base, « ligne de cours non reconnue », vient du lecteur
 * APLATI. Le lecteur géométrique est consulté ensuite, échoue aussi, et ses
 * propres mots ne sont nulle part : c'est une panne muette à l'intérieur du
 * rattrapage. Ce script lui tend un carnet et écoute.
 *
 *   npx tsx --conditions=react-server scripts/pourquoi-refusee.mjs 2023-03-03
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { rangeesDuPdf, obligationsGeometriques } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);
const jour = process.argv[2] ?? "2023-03-03";

const b = (await repo().listBulletins(3000)).find((x) => x.sessionDate === jour);
if (!b?.fileKey) {
  dire(`séance ${jour} sans pièce gardée`);
  process.exit(1);
}

/* Un carnet qui garde tout, au lieu de le laisser tomber. */
const notes = [];
const carnet = {
  push: (m) => notes.push({ m }),
  sur: (m, brut, attendu) => notes.push({ m, brut, attendu }),
};

const rangees = await rangeesDuPdf(await readSource(b.fileKey));
const lues = obligationsGeometriques(rangees, carnet);

dire(`${jour}  ·  BOC n° ${b.number}`);
dire(`   ${lues.length} obligation(s) construite(s) par la géométrie : ${lues.map((o) => o.isin).join(", ") || "aucune"}\n`);
dire(`   ${notes.length} refus :`);
for (const n of notes) {
  dire(`      ${n.m}`);
  if (n.brut) dire(`         brut    ${String(n.brut).slice(0, 260)}`);
  if (n.attendu) dire(`         attendu ${n.attendu}`);
}
