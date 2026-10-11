/**
 * Ce que chaque gabarit du dépôt rend, avant et après 2b.
 *
 * Un cliquet exige que les gabarits exercent au moins neuf textes bruts et
 * les trois familles H, I et J. Si 2b répare des lignes, des familles
 * disparaissent des gabarits, et le cliquet tombe : il faut savoir
 * LESQUELLES avant de toucher à son chiffre, sinon on efface la couverture
 * qu'il existe pour tenir.
 *
 *   npx tsx scripts/gabarits-apres-2b.mjs
 */
import { readFileSync, readdirSync } from "node:fs";

const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { classer } = await import("../src/lib/market/remarques.ts");

const dir = "src/lib/market/__fixtures__/";
let total = 0;
const familles = new Set();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".txt"))) {
  const p = parseBoc(readFileSync(dir + f, "utf8"));
  const notes = p.notes.filter((n) => n.brut);
  total += notes.length;
  for (const n of notes) familles.add(classer(n.message));
  console.log(`${f.padEnd(22)} obligations ${String(p.bonds.length).padStart(3)} · actions ${p.equities.length} · OPCVM ${String(p.funds.length).padStart(2)} · ${notes.length} note(s) [${[...new Set(notes.map((n) => classer(n.message)))].sort().join(" ") || "aucune"}]`);
}
console.log(`\n${total} textes bruts · familles exercées : ${[...familles].sort().join(" ")}`);
