/**
 * POURQUOI SOMMES-NOUS A SOIXANTE-QUINZE POINTS DE BASE DE LA BEAC ?
 *
 * L arbitre qu on voulait employer, la courbe que la BEAC publie, est a
 * 75 points de base de nos rendements d adjudication, QUELLE QUE SOIT la
 * lecture. Il ne peut donc pas departager un choix qui en vaut cinq.
 *
 * Mais 75 points de base ne sont pas du bruit, et deux causes tres
 * differentes les expliqueraient.
 *
 *   UN BIAIS. Si l ecart va toujours dans le meme sens, les deux courbes ne
 *   mesurent pas la meme chose : la BEAC publierait un marche secondaire la
 *   ou nous lisons le marche primaire, ou une courbe zero-coupon la ou nous
 *   calculons un rendement actuariel. Alors l arbitre n est pas grossier, il
 *   repond a une autre question, et il ne faut pas s en servir du tout.
 *
 *   DU BRUIT. Si l ecart se partage de part et d autre, l appariement est
 *   trop lache, ou l une des deux series est fragile.
 *
 * Le signe tranche entre les deux, et il se lit en une mesure.
 *
 *   npx tsx --conditions=react-server scripts/ecart-a-la-courbe-beac.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { auctionYield, vieRestante } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 0) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const mediane = (xs) => {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const i = Math.floor(t.length / 2);
  return t.length % 2 ? t[i] : (t[i - 1] + t[i]) / 2;
};

const toutes = await repo().listAuctionResults({ limit: 2000 });
const utiles = toutes.filter((r) => !r.setAsideAt);
const beac = await repo().courbesBeac();

const paires = [];
for (const p of beac) {
  for (const r of utiles) {
    if (r.country !== p.pays) continue;
    if (String(r.sessionOn).slice(0, 7) !== String(p.mois).slice(0, 7)) continue;
    const v = vieRestante(r);
    if (v == null || Math.abs(v.years - p.annees) > 0.5) continue;
    const y = auctionYield(r, "guichet");
    if (!y) continue;
    paires.push({ pays: p.pays, instrument: r.instrument, annees: p.annees, publie: p.taux, notre: y.pct, ecart: (y.pct - p.taux) * 100 });
  }
}
dire(`${paires.length} appariements\n`);

dire(`=== LE SIGNE DE L ECART ===\n`);
dire(`   ${"groupe".padEnd(22)} ${"n".padStart(4)} ${"au-dessus".padStart(10)} ${"en-dessous".padStart(11)} ${"ecart median signe".padStart(19)}`);
const groupes = new Map();
for (const x of paires) {
  for (const k of [`${x.pays} ${x.instrument}`, `TOUS ${x.instrument}`, "TOUS"]) {
    const g = groupes.get(k) ?? [];
    g.push(x.ecart);
    groupes.set(k, g);
  }
}
for (const [k, g] of [...groupes].sort()) {
  const haut = g.filter((e) => e > 0).length;
  dire(`   ${k.padEnd(22)} ${String(g.length).padStart(4)} ${String(haut).padStart(10)} ${String(g.length - haut).padStart(11)} ${(fr(mediane(g)) + " pb").padStart(19)}`);
}

dire(`\n=== L ECART SUIT-IL LA DUREE ? ===\n`);
dire(`   Une courbe zero-coupon s ecarte d un rendement actuariel d autant plus`);
dire(`   que la duree est longue. Si l ecart grandit avec les annees, les deux`);
dire(`   series ne mesurent pas la meme grandeur.\n`);
dire(`   ${"duree".padEnd(14)} ${"n".padStart(4)} ${"ecart median signe".padStart(19)}`);
for (const [nom, bas, haut] of [
  ["moins d un an", 0, 1],
  ["1 a 3 ans", 1, 3],
  ["3 a 5 ans", 3, 5],
  ["5 ans et plus", 5, 99],
]) {
  const g = paires.filter((x) => x.annees >= bas && x.annees < haut).map((x) => x.ecart);
  if (!g.length) continue;
  dire(`   ${nom.padEnd(14)} ${String(g.length).padStart(4)} ${(fr(mediane(g)) + " pb").padStart(19)}`);
}

dire(`\n=== UN ECHANTILLON, POUR REGARDER DES NOMBRES ENTIERS ===\n`);
for (const x of paires.slice(0, 12)) {
  dire(`   ${x.pays.padEnd(12)} ${x.instrument} ${fr(x.annees, 2).padStart(5)} ans   publie ${fr(x.publie, 2)} %   nous ${fr(x.notre, 2)} %   ${fr(x.ecart)} pb`);
}
