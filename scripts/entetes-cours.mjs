/**
 * LES EN-TÊTES IMPRIMÉS DE LA TABLE DES COURS OBLIGATAIRES.
 *
 * Une feuille de saisie dont les colonnes ne portent pas les mots du bulletin
 * oblige celui qui tape à deviner la correspondance, et c'est là que les
 * erreurs entrent. On relève donc les en-têtes tels qu'ils sont imprimés sur
 * la séance concernée, et la feuille les reprendra à la lettre.
 *
 *   npx tsx --conditions=react-server scripts/entetes-cours.mjs 2023-03-03
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);
const jour = process.argv[2] ?? "2023-03-03";

const b = (await repo().listBulletins(3000)).find((x) => x.sessionDate === jour);
if (!b?.fileKey) {
  dire(`séance ${jour} sans pièce gardée`);
  process.exit(1);
}

const rangees = await rangeesDuPdf(await readSource(b.fileKey));
const debut = rangees.findIndex((r) => r.cellules.some((c) => /^MARCHE DES OBLIGATIONS/.test(c.texte)));
if (debut < 0) {
  dire("section « MARCHE DES OBLIGATIONS » introuvable");
  process.exit(1);
}

dire(`${jour}  ·  BOC n° ${b.number}  ·  les douze rangées qui suivent le titre de section\n`);
for (const r of rangees.slice(debut, debut + 12)) {
  dire(`page ${r.page}  y=${Math.round(r.y)}  ${r.cellules.length} cellule(s)`);
  dire(`   ${r.cellules.map((c) => `${Math.round(c.x)}:« ${c.texte} »`).join("  ")}`);
}
