/** Ce que les nouvelles colonnes rendent, sur les 249 seances reelles. */
import fs from "node:fs";
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { repo } = await import("../src/lib/data/index.ts");
const { toRow, estUnPoint } = await import("../src/lib/market/auction-table.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const rows = (await repo().listAuctionResults({ limit: 1000 })).map(toRow).filter((x) => !x.r.setAsideReason);
const pc = (b) => (b ? (estUnPoint(b) ? b.lo.toFixed(2) : `${b.lo.toFixed(2)}–${b.hi.toFixed(2)}`) : "—");

for (const i of ["BTA", "OTA"]) {
  const l = rows.filter((x) => x.r.instrument === i);
  dire(`=== ${i} · ${l.length} seance(s) ===`);
  dire(`   avec un prix        ${l.filter((x) => x.prix).length}  dont calcule ${l.filter((x) => x.prix?.calcule).length}  dont fourchette ${l.filter((x) => x.prix && !estUnPoint(x.prix)).length}`);
  dire(`   avec un taux        ${l.filter((x) => x.taux).length}`);
  dire(`   avec un coupon      ${l.filter((x) => x.r.couponRate != null).length}`);
  dire(`   avec un rendement   ${l.filter((x) => x.rendement).length}`);
  dire(`   avec une fourchette ${l.filter((x) => x.plage).length}`);
  const p = l.filter((x) => x.prix).map((x) => x.prix.lo);
  if (p.length) dire(`   prix de ${Math.min(...p).toFixed(2)} a ${Math.max(...p).toFixed(2)}`);
  for (const x of l.slice(0, 3)) dire(`      ${x.r.sessionOn} ${x.r.country} ${String(x.r.tenor).padEnd(12)} prix ${pc(x.prix).padStart(13)} · taux ${pc(x.taux).padStart(12)} · coupon ${x.r.couponRate ?? "s.o."} · rdt ${x.rendement ? x.rendement.pct.toFixed(2) : "—"}`);
  dire(``);
}
/* LE CONTROLE QUI COMPTE : le prix d un bon ne vaut jamais cent. */
const cent = rows.filter((x) => x.r.instrument === "BTA" && x.prix && x.prix.hi >= 99.999);
dire(`bons dont le prix calcule atteint 100 : ${cent.length}   (doit etre zero)`);
