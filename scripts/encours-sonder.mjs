/**
 * La table « ENCOURS DES TITRES DE DETTE », telle que les abscisses la rendent.
 *
 * Elle suit la capitalisation boursière dans la même section du BOC, avec ses
 * propres colonnes : montant levé, nombre de titres, nominal, maturité,
 * amortissement, périodicité, dernier et prochain coupon, encours. Personne ne
 * la lit aujourd'hui, et c'est le stock de la dette cotée, publié à chaque
 * séance.
 *
 *   npx tsx --conditions=react-server scripts/encours-sonder.mjs 2026-10-12
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const { rangeesDuPdf, colonnes, rangeeSeparee } = await import("../src/lib/market/boc-geometrie.ts");

const jour = process.argv[2] ?? "2026-10-12";
const b = (await repo().listBulletins(2000)).find((x) => x.sessionDate === jour);
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
const rangees = await rangeesDuPdf(Uint8Array.from(bytes));

const dit = (r, motif) => r.cellules.some((c) => motif.test(c.texte.trim()));
/* La table de dette se reconnaît à son en-tête propre, « Montant levé », qui
   n'existe nulle part ailleurs dans le bulletin. */
const debut = rangees.findIndex((r) => dit(r, /Montant lev/i));
if (debut < 0) {
  console.log("en-tête « Montant levé » introuvable");
  process.exit(0);
}
const fin = rangees.findIndex((r, i) => i > debut + 2 && dit(r, /^(MARCHE DES|SYNTHESE|PHYSIONOMIE|CAPITALISATION)/i));
const section = rangees.slice(Math.max(0, debut - 3), fin > debut ? fin : debut + 45);

const parPage = new Map();
for (const p of new Set(section.map((r) => r.page))) parPage.set(p, colonnes(section.filter((r) => r.page === p)));
for (const [p, g] of parPage) console.log(`grille page ${p} : ${g.length} colonnes`);
console.log();

for (const r of section) {
  const cells = rangeeSeparee(r, parPage.get(r.page) ?? []).map((c) => c.texte.trim()).filter(Boolean);
  if (!cells.length) continue;
  console.log(`p${r.page} [${String(cells.length).padStart(2)}]  ${cells.join(" | ")}`);
}
