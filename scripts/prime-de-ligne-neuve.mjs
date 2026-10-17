/**
 * LA PRIME DE LIGNE NEUVE SE MESURE-T-ELLE ?
 *
 * Deux facons de traiter les abondements quand on cherche a tarifer une
 * ligne NEUVE.
 *
 *   LES ECARTER. On ne garde que les lignes neuves. Simple, mais on jette
 *   trente-trois observations sur deux cent vingt-cinq, et sur un marche
 *   aussi mince cela vide des echeances entieres.
 *
 *   LES CORRIGER. On garde tout, et on ajoute aux abondements une PRIME
 *   mesuree qui les ramene au niveau d une ligne neuve. On garde la
 *   matiere, mais cela ne vaut que si la prime existe et reste stable.
 *
 * ON NE TRANCHE PAS AU GOUT. On apparie chaque abondement a la ligne
 * NEUVE la plus proche du MEME Tresor, dans le MEME panier d echeance, a
 * moins de six mois d ecart, et on regarde la distribution des ecarts.
 *
 *   Une prime existe si les ecarts se serrent autour d une valeur : alors
 *   on la nomme, on l ajoute, et on le declare.
 *
 *   Elle n existe pas si les ecarts partent dans tous les sens : alors
 *   « corriger » reviendrait a ajouter du bruit a du bruit, et ecarter
 *   est le seul geste honnete.
 *
 * ON S ATTEND A LA SECONDE REPONSE, parce que le prix d un abondement
 * CEMAC est conventionnel, ancre autour de 90, et que son rendement suit
 * l arithmetique du reliquat. Mais une attente n est pas une mesure.
 *
 *   npx tsx --conditions=react-server scripts/prime-de-ligne-neuve.mjs
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
const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const mediane = (xs) => {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const i = Math.floor(t.length / 2);
  return t.length % 2 ? t[i] : (t[i - 1] + t[i]) / 2;
};

const PANIERS = [
  { nom: "≤ 6 mois", bas: 0, haut: 0.6 },
  { nom: "1 an", bas: 0.6, haut: 1.5 },
  { nom: "2 ans", bas: 1.5, haut: 2.5 },
  { nom: "3 ans", bas: 2.5, haut: 3.5 },
  { nom: "4-5 ans", bas: 3.5, haut: 5.5 },
  { nom: "7 ans +", bas: 5.5, haut: 99 },
];

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const pts = [];
for (const r of toutes) {
  const v = vieRestante(r);
  const y = auctionYield(r, "guichet");
  if (v == null || !y) continue;
  const panier = PANIERS.find((p) => v.years > p.bas && v.years <= p.haut);
  if (!panier) continue;
  const m = String(r.tenor ?? "").match(/(\d+)/);
  const etiquette = !m ? null : /semaine/i.test(String(r.tenor)) ? Number(m[1]) / 52 : /mois/i.test(String(r.tenor)) ? Number(m[1]) / 12 : Number(m[1]);
  pts.push({
    pays: r.country, instrument: r.instrument, seance: r.sessionOn, tenor: r.tenor, code: r.codeEmission,
    panier: panier.nom, annees: v.years, etiquette, pct: y.pct,
    neuve: etiquette != null && Math.abs(v.years - etiquette) <= 0.06,
  });
}
const neuves = pts.filter((p) => p.neuve);
const abonds = pts.filter((p) => !p.neuve);
dire(`${pts.length} seances · ${neuves.length} lignes neuves · ${abonds.length} abondements\n`);

const paires = [];
for (const a of abonds) {
  const candidats = neuves.filter((n) => n.pays === a.pays && n.panier === a.panier && Math.abs(jours(n.seance, a.seance)) <= 183);
  if (!candidats.length) continue;
  const n = candidats.reduce((best, c) => (Math.abs(jours(c.seance, a.seance)) < Math.abs(jours(best.seance, a.seance)) ? c : best), candidats[0]);
  paires.push({ a, n, ecartPb: Math.round((a.pct - n.pct) * 100), jours: Math.abs(jours(n.seance, a.seance)) });
}

dire(`=== ${paires.length} ABONDEMENT(S) APPARIE(S) A UNE LIGNE NEUVE COMPARABLE ===`);
dire(`   meme Tresor, meme panier d echeance, moins de six mois d ecart\n`);
if (!paires.length) {
  dire(`   AUCUN appariement. La question est donc close par l absence de matiere :`);
  dire(`   on ne peut pas mesurer une prime qu aucune paire n eclaire, et « corriger »`);
  dire(`   consisterait a inventer un nombre. Ecarter reste le seul geste honnete.`);
  process.exit(0);
}

dire(`   ${"abondement".padEnd(12)} ${"pays".padEnd(12)} ${"panier".padEnd(10)} ${"ligne neuve".padEnd(12)} ${"jours".padStart(6)} ${"ecart".padStart(9)}`);
for (const p of paires.sort((x, y) => x.ecartPb - y.ecartPb)) {
  dire(`   ${p.a.seance.padEnd(12)} ${p.a.pays.padEnd(12)} ${p.a.panier.padEnd(10)} ${p.n.seance.padEnd(12)} ${String(p.jours).padStart(6)} ${(fr(p.ecartPb) + " pb").padStart(9)}`);
}

const e = paires.map((p) => p.ecartPb);
const med = mediane(e);
const moy = e.reduce((s, x) => s + x, 0) / e.length;
const ecartType = Math.sqrt(e.reduce((s, x) => s + (x - moy) ** 2, 0) / e.length);
const tries = [...e].sort((a, b) => a - b);
dire(`\n=== LA DISTRIBUTION DES ECARTS ===`);
dire(`   mediane ${fr(med)} pb · moyenne ${fr(moy)} pb · ecart-type ${fr(ecartType)} pb`);
dire(`   du plus bas ${fr(tries[0])} pb au plus haut ${fr(tries.at(-1))} pb`);
dire(`   ${e.filter((x) => x > 0).length} au-dessus de la ligne neuve, ${e.filter((x) => x < 0).length} en dessous`);

dire(`\n=== LE VERDICT ===`);
/* UNE PRIME EXISTE si le signe est constant ET si la dispersion est petite
   devant la valeur. Un ecart-type plus grand que la mediane veut dire que la
   prime est noyee dans son propre bruit, et l ajouter deplacerait les
   rendements sans les rapprocher de rien. */
const memeSigne = e.every((x) => x >= 0) || e.every((x) => x <= 0);
const nette = Math.abs(med) > ecartType;
if (memeSigne && nette) {
  dire(`   Une prime de ${fr(med)} pb se mesure : signe constant et dispersion plus petite que la valeur.`);
  dire(`   « Corriger » est donc possible, et il faut le declarer sur chaque point corrige.`);
} else {
  dire(`   PAS DE PRIME MESURABLE.`);
  if (!memeSigne) dire(`   Le signe change d une paire a l autre : l abondement est tantot plus cher, tantot moins.`);
  if (!nette) dire(`   L ecart-type (${fr(ecartType)} pb) depasse la mediane (${fr(med)} pb) : la valeur est noyee dans son bruit.`);
  dire(`   Ajouter une prime reviendrait a ajouter du bruit a du bruit. ECARTER les abondements`);
  dire(`   reste le seul geste honnete, et c est ce que fait la maquette.`);
}
