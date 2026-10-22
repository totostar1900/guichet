/**
 * La table de capitalisation se ferme-t-elle vraiment sur une ligne « Total » ?
 *
 * Le lecteur aplati cherche /^Total$/ pour borner la section. Si la ligne est
 * collée à ses chiffres, la borne ne se trouve pas, et le lecteur avale les
 * deux cents lignes suivantes : la table de l'ENCOURS DES TITRES DE DETTE,
 * qui a d'autres colonnes. Les rangées BDEAC y sont alors lues avec la
 * grammaire des actions, d'où « cellules incomplètes ».
 *
 *   npx tsx --conditions=react-server scripts/fin-capi.mjs
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

const jours = process.argv.slice(2);
const bulletins = (await repo().listBulletins(2000)).filter((b) => jours.includes(b.sessionDate));

for (const b of bulletins) {
  const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  if (!bytes) {
    console.log(`${b.sessionDate}  pas de PDF`);
    continue;
  }
  const lignes = (await pdfText(Uint8Array.from(bytes))).split(/\r?\n/).map((l) => l.trim());
  const debut = lignes.findIndex((l) => /^CAPITALISATION BOURSIERE/.test(l));
  const totalNu = lignes.findIndex((l, i) => i > debut && /^Total$/.test(l));
  const totalColle = lignes.findIndex((l, i) => i > debut && /^Total\s*[\d-]/.test(l));
  const encours = lignes.findIndex((l, i) => i > debut && /Montant levé|ENCOURS DES TITRES/i.test(l));
  console.log(`${b.sessionDate}  début ${debut}  « Total » nu ${totalNu}  collé ${totalColle}  table de dette ${encours}`);
  if (totalColle > 0) console.log(`            « ${lignes[totalColle].slice(0, 70)} »`);
}
