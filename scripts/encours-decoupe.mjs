/** La découpe réelle d'une rangée d'encours, perdue ou gardée, avec sa page.
 *    npx tsx --conditions=react-server scripts/encours-decoupe.mjs 2024-09-09 */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const g = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const ENTETE = /Montant lev/i, FIN = /^(MARCHE DES|SYNTHESE|PHYSIONOMIE|CAPITALISATION)/i;
const AMORTI = /\b(CONSTANT|IN\s*-?\s*FINE|DIFFERE|DIFFÉRÉ)\b/i, ISIN = /\b([A-Z]{2}\d{10})\b/;

const seance = process.argv[2];
const b = (await repo().listBulletins(3000)).find((x) => x.sessionDate === seance);
const rangees = await g.rangeesDuPdf(await readSource(b.fileKey));
const dit = (r, m) => r.cellules.some((c) => m.test(c.texte.trim()));
const debut = rangees.findIndex((r) => dit(r, ENTETE));
const fin = rangees.findIndex((r, i) => i > debut + 2 && dit(r, FIN));
const section = rangees.slice(debut, fin > debut ? fin : debut + 60);
const lus = new Set(g.encoursGeometriques(rangees).map((e) => e.isin));

/* Combien d en-têtes « Montant levé » la pièce porte-t-elle, et sur quelles pages ? */
dire(`en-têtes « Montant levé » :`);
rangees.forEach((r, i) => { if (dit(r, ENTETE)) dire(`   rangée ${i} page ${r.page}`); });

dire(`\nla grille, par page de la section :`);
for (const p of new Set(section.map((r) => r.page))) {
  const col = g.colonnes ? g.colonnes(section.filter((r) => r.page === p)) : null;
  dire(`   page ${p} : ${section.filter((r) => r.page === p).length} rangée(s)${col ? `, ${col.length} colonne(s)` : ""}`);
}

dire(`\nla découpe, rangée par rangée :`);
for (const r of section) {
  const t = r.cellules.map((c) => c.texte).join(" ");
  if (!AMORTI.test(t) || !ISIN.test(t)) continue;
  const isin = t.match(ISIN)[1];
  dire(`   ${lus.has(isin) ? "gardée" : "PERDUE"}  p${r.page}  ${isin}  ${r.cellules.length} cellule(s) brute(s) : ${r.cellules.map((c) => `${Math.round(c.x)}:${c.texte}`).join(" ¦ ").slice(0, 700)}`);
}
