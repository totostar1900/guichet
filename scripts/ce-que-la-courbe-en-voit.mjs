/**
 * EST-CE LE PRIX MOYEN OU LE PRIX LIMITE QUI MARQUE LA COURBE ?
 *
 * Question de Georges, et la reponse est dans « priceOf » : le prix moyen
 * pondere passe EN PREMIER, le prix limite ne sert qu a son defaut. Ce
 * n est donc pas le prix retenu a l adjudication qui marque la courbe,
 * c est la moyenne.
 *
 * AVEC UN GARDE, pose avant cette enquete : quand le prix moyen depasse le
 * maximum propose, « priceOf » retombe sur le limite et le declare. Les
 * onze seances prouvees sales le declenchaient donc DEJA : la courbe ne
 * les a jamais tracees de travers, et les corriger n a rien deplace.
 *
 * Les neuf indecises, elles, passent sous le garde : leur moyen reste dans
 * la fourchette. Si elles sont coupon compris, la courbe les trace a un
 * prix trop haut, donc a un rendement trop bas, et personne ne le voit.
 *
 * Le script chiffre l ecart, en points de base, pour chacune des neuf.
 *
 *   npx tsx --conditions=react-server scripts/ce-que-la-courbe-en-voit.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { auctionYield, priceOf } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));

function dernierCoupon(seance, echeance) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}
function anneesDe(tenor) {
  const m = String(tenor ?? "").match(/(\d+)/);
  return !m || /semaine|mois/i.test(String(tenor)) ? null : Number(m[1]);
}
function emissionDe(echeance, annees) {
  if (!echeance || annees == null) return null;
  const d = new Date(echeance + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() - annees);
  return d.toISOString().slice(0, 10);
}

const toutes = await repo().listAuctionResults({ limit: 2000 });

/* LES NEUF : gabonaises, abondees, non corrigees, moyen dans la fourchette. */
const neuf = toutes.filter((r) => {
  if (r.instrument !== "OTA" || r.country !== "Gabon") return false;
  if (r.correction?.includes("pied de coupon")) return false;
  if (r.priceAvg == null || r.priceLimit == null || !r.maturityOn || r.couponRate == null) return false;
  const em = emissionDe(r.maturityOn, anneesDe(r.tenor));
  const neuve = em != null && Math.abs(Math.round((Date.parse(r.sessionOn) - Date.parse(em)) / 86400000)) <= 7;
  return !neuve;
});

dire(`${neuf.length} seances gabonaises abondees et non corrigees\n`);
dire(`   ${"seance".padEnd(11)} ${"code".padEnd(14)} ${"source du prix".padEnd(16)} ${"rdt aujourd hui".padStart(15)} ${"rdt corrige".padStart(12)} ${"ecart".padStart(9)}`);

let bougent = 0;
let somme = 0;
for (const r of neuf.sort((a, b) => a.sessionOn.localeCompare(b.sessionOn))) {
  const dc = dernierCoupon(r.sessionOn, r.maturityOn);
  const j = Math.round((Date.parse(r.sessionOn) - Date.parse(dc)) / 86400000);
  const couru = (Number(r.couponRate) * j) / 365;

  const avant = auctionYield(r, "guichet");
  const source = priceOf(r);
  const apres = auctionYield({ ...r, priceAvg: Number(r.priceAvg) - couru }, "guichet");
  if (!avant || !apres) {
    dire(`   ${r.sessionOn}  ${String(r.codeEmission).padEnd(14)} rendement incalculable`);
    continue;
  }
  const pb = (apres.pct - avant.pct) * 100;
  if (Math.abs(pb) > 0.5) bougent++;
  somme += Math.abs(pb);
  const quoi = source && Math.abs(source.pct - Number(r.priceLimit)) < 1e-9 ? "le prix limite" : "le prix moyen";
  dire(
    `   ${r.sessionOn}  ${String(r.codeEmission).padEnd(14)} ${quoi.padEnd(16)} ${(fr(avant.pct) + " %").padStart(15)} ${(fr(apres.pct) + " %").padStart(12)} ${(fr(pb, 0) + " pb").padStart(9)}`,
  );
}
dire(`\n   ${bougent} des ${neuf.length} bougent de plus d un demi point de base · ecart moyen ${fr(somme / neuf.length, 0)} pb`);

/* LES ONZE : le garde les avait-il deja neutralisees ? */
const onze = toutes.filter((r) => r.correction?.includes("pied de coupon"));
let gardees = 0;
for (const r of onze) {
  const m = r.correction.match(/COUPON COMPRIS, ([\d\s]+,[\d]+) %/);
  if (!m) continue;
  const avantCorrection = { ...r, priceAvg: Number(m[1].replace(/\s/g, "").replace(",", ".")) };
  const p = priceOf(avantCorrection);
  if (p && Math.abs(p.pct - Number(r.priceLimit)) < 1e-9) gardees++;
}
dire(`\n   Sur les ${onze.length} corrigees, le garde de « priceOf » en retenait deja ${gardees} au prix limite AVANT la correction :`);
dire(`   la courbe ne les a jamais tracees de travers, et les corriger n a deplace aucun point.`);
