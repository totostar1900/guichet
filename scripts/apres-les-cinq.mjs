/** CE QUE LES CINQ GABONAISES ONT CHANGE. */
import fs from "node:fs";
const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const { repo } = await import("../src/lib/data/index.ts");
const { vieRestante, auctionYield } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const t = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const sansVie = t.filter((r) => vieRestante(r) == null);
const sansTaux = t.filter((r) => auctionYield(r) == null);
dire(`${t.length} seances retenues`);
dire(`   hors de la courbe faute de duree : ${sansVie.length}`);
for (const r of sansVie) dire(`      ${r.sessionOn} ${r.country} ${r.instrument}`);
dire(`   sans rendement : ${sansTaux.length} · AVEC un rendement : ${t.length - sansTaux.length}`);
dire(`\n   LES CINQ :`);
for (const r of t.filter((x) => x.country === "Gabon" && x.sessionOn >= "2019-06-01" && x.sessionOn <= "2019-08-31")) {
  const y = auctionYield(r);
  dire(`      ${r.sessionOn} ${r.instrument} ${String(r.tenor).padEnd(12)} ${r.codeEmission} · vie ${vieRestante(r)?.years?.toFixed(2) ?? "—"} an(s) · rendement ${y ? `${y.pct.toFixed(4)} % (${y.origin})` : "aucun"}`);
}
