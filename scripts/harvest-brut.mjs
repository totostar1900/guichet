/**
 * Le texte brut de la rangée « HARVEST ACTIONS CEMAC » : c'est lui qui tranche
 * entre les deux lectures de la seconde passe.
 *
 *   npx tsx --conditions=react-server scripts/harvest-brut.mjs 2024-12-30
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const jour = process.argv[2] ?? "2024-12-30";
const cible = process.argv[3] ?? "HARVEST ACTIONS CEMAC";

const bulletins = await repo().listBulletins(2000);
const b = bulletins.find((x) => String(x.sessionDate).slice(0, 10) === jour);
if (!b) {
  console.log("pas de bulletin pour", jour);
  process.exit(0);
}
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
const texte = await pdfText(Uint8Array.from(bytes));

const i = texte.indexOf(cible);
if (i < 0) {
  console.log("rangée absente du texte");
  process.exit(0);
}
console.log(JSON.stringify(texte.slice(Math.max(0, i - 300), i + 360)));
