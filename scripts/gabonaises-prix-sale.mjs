/**
 * LES ONZE GABONAISES : LE PRIX MOYEN EST-IL COUPON COMPRIS ?
 *
 * Onze seances gabonaises portent un PRIX MOYEN PONDERE SUPERIEUR a leur
 * propre prix maximum propose, ce qui est impossible si les deux mesurent
 * la meme chose. La piece du 23 avril 2025 imprime noir sur blanc :
 *
 *   Prix minimum propose   89,0000 %
 *   Prix maximum propose   91,0000 %
 *   Prix limite            90,0000 %
 *   Prix Moyen Pondere     96,6752 %
 *
 * Notre lecture est donc fidele : c est le bulletin qui se contredit.
 *
 * L HYPOTHESE. 96,6752 moins 91,00 vaut environ 5,68, et le coupon couru de
 * cette ligne a cette date vaut a peu pres cela. Le Tresor gabonais
 * imprimerait son prix moyen COUPON COMPRIS, prix sale, pendant que les
 * bornes des soumissions sont PIED DE COUPON, prix propre. Deux conventions
 * dans la meme colonne de la meme page.
 *
 * LE TEST. Pour chacune des onze, on retranche le coupon couru du prix
 * moyen et on regarde s il retombe DANS la fourchette des soumissions. Si
 * oui sur les onze, l hypothese tient ; si elle ne tient que sur quelques
 * unes, elle ne tient pas du tout et il faudra chercher ailleurs.
 *
 * L anniversaire de coupon se deduit de l echeance : une obligation paie
 * au meme jour de l annee que son remboursement.
 *
 *   npx tsx --conditions=react-server scripts/gabonaises-prix-sale.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = await repo().listAuctionResults({ limit: 2000 });
const suspectes = toutes.filter(
  (r) => r.instrument === "OTA" && r.priceMin != null && r.priceMax != null && r.priceAvg != null && r.priceAvg > r.priceMax,
);

/** Le dernier anniversaire de coupon avant la séance, deduit de l echeance. */
function dernierCoupon(seance, echeance) {
  if (!echeance) return null;
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

dire(`${suspectes.length} seance(s) dont le prix moyen depasse le maximum propose\n`);
dire(`   ${"seance".padEnd(11)} ${"code".padEnd(14)} ${"coupon".padStart(6)} ${"moyen".padStart(8)} ${"couru".padStart(7)} ${"pied".padStart(8)}  ${"fourchette".padEnd(16)} verdict`);

let dedans = 0, dehors = 0, sansEcheance = 0;
for (const r of suspectes.sort((a, b) => b.sessionOn.localeCompare(a.sessionOn))) {
  const dc = dernierCoupon(r.sessionOn, r.maturityOn);
  if (!dc || r.couponRate == null) { sansEcheance += 1; dire(`   ${r.sessionOn}  ${String(r.codeEmission ?? "—").padEnd(14)} echeance ou coupon manquant`); continue; }
  const j = Math.round((Date.parse(r.sessionOn) - Date.parse(dc)) / 86400000);
  const couru = (Number(r.couponRate) * j) / 365;
  const pied = Number(r.priceAvg) - couru;
  const ok = pied >= Number(r.priceMin) - 0.05 && pied <= Number(r.priceMax) + 0.05;
  if (ok) dedans++;
  else dehors++;
  dire(
    `   ${r.sessionOn}  ${String(r.codeEmission ?? "—").padEnd(14)} ${String(r.couponRate).padStart(6)} ${Number(r.priceAvg).toFixed(3).padStart(8)} ${couru.toFixed(3).padStart(7)} ${pied.toFixed(3).padStart(8)}  ${(r.priceMin + " a " + r.priceMax).padEnd(16)} ${ok ? "DANS" : "dehors"}`,
  );
}

dire(`\n=== ${dedans} retombe(nt) dans la fourchette · ${dehors} dehors · ${sansEcheance} indecidable(s) ===`);
if (dedans && !dehors) dire(`   L hypothese tient sur toutes : le prix moyen gabonais est COUPON COMPRIS.`);
else if (dedans > dehors) dire(`   Elle tient sur la plupart, pas sur toutes : insuffisant pour en faire une regle.`);
else dire(`   Elle ne tient pas. Chercher ailleurs.`);
