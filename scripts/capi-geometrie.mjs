/**
 * Ce que la lecture géométrique voit dans la table de capitalisation.
 *
 * Le lecteur aplati s'y casse les dents : la couche texte colle les cellules
 * (« 397,40202229/07/20230,00--10 365 000 000115 872 408 000 »). On regarde
 * si les abscisses les séparent, avant d'écrire une ligne de lecteur.
 *
 *   npx tsx --conditions=react-server scripts/capi-geometrie.mjs 2025-06-02
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
const { rangeesDuPdf, colonnes, rangeeSeparee } = await import("../src/lib/market/boc-geometrie.ts");

const jour = process.argv[2] ?? "2025-06-02";
const b = (await repo().listBulletins(2000)).find((x) => x.sessionDate === jour);
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;

const rangees = await rangeesDuPdf(Uint8Array.from(bytes));
const titre = (r, motif) => r.cellules.some((c) => motif.test(c.texte));
const debut = rangees.findIndex((r) => titre(r, /CAPITALISATION BOURSIERE/i));
if (debut < 0) {
  console.log("section introuvable dans les rangées");
  process.exit(0);
}
const fin = rangees.findIndex((r, i) => i > debut + 2 && titre(r, /^(MARCHE DES|SYNTHESE|PHYSIONOMIE|BULLETIN OFFICIEL)/i));
const section = rangees.slice(debut, debut + 60);

console.log(`section : rangées ${debut} à ${fin > debut ? fin : debut + 60}, pages ${[...new Set(section.map((r) => r.page))].join(", ")}\n`);

const parPage = new Map();
for (const p of new Set(section.map((r) => r.page))) parPage.set(p, colonnes(section.filter((r) => r.page === p)));
for (const [p, g] of parPage) console.log(`grille page ${p} : ${g.length} colonnes · ${g.map((x) => Math.round(x)).join(" ")}`);
console.log();

for (const r of section.slice(13, 46)) {
  const cells = rangeeSeparee(r, parPage.get(r.page) ?? []).map((c) => c.texte.trim()).filter(Boolean);
  if (!cells.length) continue;
  console.log(`p${r.page} y${Math.round(r.y)} [${cells.length}]  ${cells.join(" | ").slice(0, 190)}`);
}
