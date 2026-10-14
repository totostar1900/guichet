/** L encours officiel de la BEAC, tel que la statistique mensuelle l imprime. */
import fs from "node:fs";
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const buf = fs.readFileSync("C:/dev/guichet/.sorties/stat-mensuelle.pdf");
const r = await rangeesDuPdf(new Uint8Array(buf));
const lignes = r.map((x) => ({ p: x.page, t: x.cellules.map((c) => c.texte).join(" | ") }));
for (const p of [2, 3, 4]) {
  dire(`\n=== PAGE ${p} ===`);
  for (const l of lignes.filter((x) => x.p === p)) dire(`   ${l.t.slice(0, 200)}`);
}
