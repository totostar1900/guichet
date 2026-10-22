/**
 * JUSQU OU LE TRESOR DESCEND-IL DANS LE CARNET ?
 *
 * Le carnet publie a deux bouts, et ils ne se valent pas.
 *
 *   LE BON BOUT est toujours servi : en prix le maximum, puisque le Tresor
 *   sert du plus haut en descendant, et en taux le minimum, puisqu il sert
 *   du plus bas en remontant. Un Tresor ne refuse pas celui qui paie plus.
 *
 *   LE MAUVAIS BOUT n est servi que si le limite lui est egal, c est-a-dire
 *   si le Tresor a pris TOUT le carnet.
 *
 * Entre les deux, le limite dit exactement ou il s est arrete. On mesure sa
 * position en part du carnet :
 *
 *   0 %   il n a pris que la meilleure offre ;
 *   100 % il a tout pris, y compris la pire.
 *
 * Et on compte les seances ou il a tout pris, qui sont celles ou le mauvais
 * bout a ete servi lui aussi.
 *
 *   npx tsx --conditions=react-server scripts/jusqu-ou-dans-le-carnet.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 0) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const mediane = (xs) => {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const i = Math.floor(t.length / 2);
  return t.length % 2 ? t[i] : (t[i - 1] + t[i]) / 2;
};
const EPS = 0.001;

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const groupes = new Map();

for (const r of toutes) {
  const enPrix = r.priceLimit != null && r.priceMin != null && r.priceMax != null;
  const enTaux = r.rateLimit != null && r.rateMin != null && r.rateMax != null;
  if (!enPrix && !enTaux) continue;

  const [limite, a, b] = enPrix
    ? [Number(r.priceLimit), Number(r.priceMin), Number(r.priceMax)]
    : [Number(r.rateLimit), Number(r.rateMin), Number(r.rateMax)];
  const bas = Math.min(a, b);
  const haut = Math.max(a, b);
  const largeur = haut - bas;
  if (largeur < EPS) continue; /* carnet plat : une seule offre, rien a mesurer */

  /* LE BON BOUT est le haut en prix, le bas en taux. La part parcourue se
     compte TOUJOURS depuis le bon bout, pour que les deux instruments se
     lisent sur la meme echelle. */
  const parcourue = enPrix ? (haut - limite) / largeur : (limite - bas) / largeur;
  const toutPris = enPrix ? limite <= bas + EPS : limite >= haut - EPS;

  const k = `${r.country}|${r.instrument}`;
  const g = groupes.get(k) ?? { parts: [], tout: 0, larg: [] };
  g.parts.push(parcourue * 100);
  g.larg.push(largeur);
  if (toutPris) g.tout += 1;
  groupes.set(k, g);
}

dire(`=== OU LE LIMITE SE POSE DANS LE CARNET ===`);
dire(`   0 % : le Tresor n a pris que la meilleure offre. 100 % : il a tout pris.\n`);
dire(`   ${"pays".padEnd(13)} ${"instr".padEnd(5)} ${"n".padStart(4)} ${"part mediane".padStart(13)} ${"carnet median".padStart(14)} ${"tout pris".padStart(11)}`);
let totalTout = 0;
let totalN = 0;
for (const [k, g] of [...groupes].sort()) {
  const [pays, instr] = k.split("|");
  totalTout += g.tout;
  totalN += g.parts.length;
  dire(
    `   ${pays.padEnd(13)} ${instr.padEnd(5)} ${String(g.parts.length).padStart(4)} ${(fr(mediane(g.parts)) + " %").padStart(13)} ${(fr(mediane(g.larg), 2) + " pts").padStart(14)} ${(g.tout + " / " + g.parts.length).padStart(11)}`,
  );
}
dire(`\n   ${totalTout} seance(s) sur ${totalN} ou le Tresor a pris tout le carnet : la, et la seulement,`);
dire(`   le mauvais bout publie a ete servi lui aussi.`);
