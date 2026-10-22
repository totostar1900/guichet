/**
 * Produit le classeur et le PDF sur une plage, hors du navigateur.
 *
 * On ne livre pas un document qu'on n'a pas ouvert : le rendu passe par des
 * bibliothèques qui échouent tard, à l'écriture, et une route qui rend un
 * fichier corrompu se découvre chez celui qui l'ouvre.
 *
 *   npx tsx --conditions=react-server scripts/essai-rapport.mjs 2023-01-01 2026-10-12
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const du = process.argv[2] ?? "2023-01-01";
const au = process.argv[3] ?? "2026-12-31";

const { repo } = await import("../src/lib/data/index.ts");
const { construireRapport } = await import("../src/lib/market/rapport-fournisseur.ts");
const { classeurFournisseur } = await import("../src/lib/market/rapport-classeur.ts");

const r = construireRapport(await repo().listBulletins(3000), du, au);

console.log(`du ${r.du} au ${r.au} · ${r.seances} séances, dont ${r.seancesSansRemarque} sans remarque`);
console.log(`${r.remarques} remarques\n`);
console.log("par devenir de la donnée");
for (const s of r.parSort) console.log(`   ${String(s.remarques).padStart(4)}  ${s.libelle.padEnd(22)} ${s.seances} séances   ${s.ecrite ? "en base" : "absente"}`);
console.log(`\n   erreurs de publication : ${r.publication.length}`);
console.log(`   corrigées              : ${r.corrections.length}`);
console.log(`   écartées               : ${r.ecartees.length}`);
console.log(`   non lues               : ${r.perdues.length}`);

if (r.publication.length) {
  console.log(`\nles trois premières erreurs de publication :`);
  for (const l of r.publication.slice(0, 3)) console.log(`   ${l.seance}  ${l.objet.padEnd(32)} « ${l.imprime || "—"} »  ${l.diagnostic.slice(0, 80)}`);
}

fs.mkdirSync(new URL("../.mesure", import.meta.url), { recursive: true });
const xlsx = await classeurFournisseur(r);
fs.writeFileSync(new URL(`../.mesure/rapport-${du}-${au}.xlsx`, import.meta.url), xlsx);
console.log(`\nclasseur : ${Math.round(xlsx.length / 1024)} Ko`);

const { renderToBuffer } = await import("@react-pdf/renderer");
const { RapportFournisseurPdf } = await import("../src/lib/documents/pdf/fournisseur-templates.tsx");
const React = (await import("react")).default;
const pdf = await renderToBuffer(React.createElement(RapportFournisseurPdf, { r }));
fs.writeFileSync(new URL(`../.mesure/rapport-${du}-${au}.pdf`, import.meta.url), pdf);
console.log(`PDF      : ${Math.round(pdf.length / 1024)} Ko`);
console.log(`\n→ ${new URL("../.mesure/", import.meta.url).pathname}`);
