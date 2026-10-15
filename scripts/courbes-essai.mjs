/** Essai du lecteur de courbes sur une pièce.
 *    npx tsx scripts/courbes-essai.mjs <fichier.pdf> */
import fs from "node:fs";
import path from "node:path";

const f = process.argv[2];
const { courbesDuPdf } = await import("../src/lib/market/courbe-beac.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const r = await courbesDuPdf(new Uint8Array(fs.readFileSync(f)), path.basename(f, ".pdf"));
dire(`${path.basename(f)}\n   mois ${r.mois ?? "?"} · légende ${r.legende.join(", ") || "(aucune)"}`);
for (const x of r.reserves) dire(`   RÉSERVE  ${x}`);
let pays = "";
for (const p of r.points) {
  if (p.pays !== pays) {
    pays = p.pays;
    dire(`   --- ${pays}`);
  }
  dire(`       ${p.tenor.padEnd(9)} ${String(p.annees).padStart(5)} ans   ${p.taux.toFixed(2)} %`);
}
dire(`   ${r.points.length} point(s)`);
