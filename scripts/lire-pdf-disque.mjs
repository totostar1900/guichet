/** Le texte d'un PDF du disque, par les abscisses. */
import fs from "node:fs";
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
for (const p of process.argv.slice(2)) {
  dire(`\n=== ${p.split("/").pop()} ===`);
  try {
    const r = await rangeesDuPdf(new Uint8Array(fs.readFileSync(p)));
    const t = r.map((x) => `p${x.page} ` + x.cellules.map((c) => c.texte).join(" | "));
    dire(t.length ? t.slice(0, 70).map((x) => "   " + x.slice(0, 200)).join("\n") : "   SCAN SANS COUCHE TEXTE");
    if (t.length > 70) dire(`   … ${t.length - 70} rangée(s) de plus`);
  } catch (e) { dire(`   illisible : ${e.message}`); }
}
