/**
 * POURQUOI UNE LIGNE SE LIT ET PAS SA VOISINE, DANS LE MÊME TABLEAU ?
 *
 * Question de Georges, le 12 octobre 2026. Elle vaut mieux qu'une réponse de
 * principe : si, dans une table où deux lignes échouent, trente réussissent,
 * alors les trente disent où sont les colonnes, et le robot n'a besoin de
 * personne pour le savoir.
 *
 * Ce script compte, sur les séances qui perdent des obligations : combien de
 * lignes la table porte, combien se lisent, combien échouent, et surtout si
 * les réussies sont assez nombreuses pour enseigner la forme aux autres.
 *
 *   npx tsx scripts/voisines-du-tableau.mjs [combien]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { enAttente } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const combien = Number(process.argv[2]) || 8;
const PERDUE = /^Obligation ([A-Z]{2}\d{10}) : (ligne de cours non reconnue|prix \/ nominal ambigus)/;

const lot = (await r.listBulletins(2000))
  .filter(enAttente)
  .filter((b) => (b.warnings ?? []).some((w) => PERDUE.test(w)))
  .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  .slice(0, combien);

console.log(`${lot.length} séances où des obligations se perdent\n`);
console.log(`${"séance".padEnd(12)}${"lues".padStart(6)}${"perdues".padStart(9)}${"part lue".padStart(10)}   les voisines suffisent-elles à enseigner la forme ?`);

let totalLues = 0;
let totalPerdues = 0;
for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;
  const refs = await r.nominauxDeReference(b.sessionDate);
  const p = parseBoc(await pdfText(bytes), refs);
  const perdues = new Set((p.warnings ?? []).map((w) => w.match(PERDUE)?.[1]).filter(Boolean));
  const lues = p.bonds.length;
  totalLues += lues;
  totalPerdues += perdues.size;
  /* La règle du lecteur géométrique veut quatre rangées pour attester un bord
     de colonne. Si les lignes lues sont au moins quatre, la forme est
     enseignable par le tableau lui-même. */
  const verdict = lues >= 4 ? `OUI : ${lues} lignes lues attestent la forme` : `non : ${lues} ligne(s) seulement`;
  console.log(`${b.sessionDate.padEnd(12)}${String(lues).padStart(6)}${String(perdues.size).padStart(9)}${`${Math.round((lues / (lues + perdues.size)) * 100)} %`.padStart(10)}   ${verdict}`);
}
console.log(`\n   ${totalLues} lignes lues contre ${totalPerdues} perdues, soit ${Math.round((totalLues / (totalLues + totalPerdues)) * 100)} % de lues dans les tables abîmées.`);
