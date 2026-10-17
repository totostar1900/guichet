/**
 * LE RESIDU DES ONZE : CE QUI RESTE QUAND ON A RETIRE LE COUPON COURU.
 *
 * Objection de Georges, et elle porte : un prix moyen pondere est une
 * moyenne de PRIX, ponderee par les montants. Rien dans sa definition n y
 * met de coupon couru. Mon appel a « la mecanique du reglement » etait
 * faux.
 *
 * LA RECONCILIATION. Deux grandeurs meritent le nom de « moyenne ponderee
 * par les montants », et elles different d un coupon couru :
 *
 *   la moyenne des PRIX COTES, ponderee par les montants servis, qui est
 *   pied de coupon comme les cotations qui la composent ;
 *
 *   le rapport ESPECES PAYEES sur NOMINAL SERVI, qui est coupon compris
 *   parce que le SVT vire le coupon avec le principal.
 *
 * Savoir laquelle des deux occupe la case gabonaise ne se decide pas, ca
 * se mesure. ET LE RESIDU EST LE JUGE.
 *
 * Si la case porte le rapport especes sur nominal, alors
 *
 *   imprime − couru = la vraie moyenne des prix cotes,
 *
 * et cette moyenne doit etre LEGEREMENT AU-DESSUS du prix limite, puisque
 * le limite est le plus bas servi et qu une part a ete servie plus haut.
 * Le residu doit donc etre petit, POSITIF, et SANS RAPPORT avec le couru.
 *
 * Si au contraire le residu grandit avec le couru, l explication est une
 * convention de decompte des jours, et non la nature de la case.
 *
 * C est le test decisif, et il porte sur des nombres que je n ai pas
 * choisis : les onze ont ete retenues sur « moyen au-dessus du maximum »,
 * jamais sur la valeur du residu.
 *
 *   npx tsx --conditions=react-server scripts/residu-des-onze.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 3) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));

function dernierCoupon(seance, echeance) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const onze = toutes
  .filter((r) => r.correction?.includes("pied de coupon"))
  .sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

dire(`${onze.length} seances corrigees\n`);
dire(`   ${"seance".padEnd(11)} ${"code".padEnd(14)} ${"cp %".padStart(5)} ${"jours".padStart(5)} ${"couru".padStart(6)} ${"imprime".padStart(8)} ${"propre".padStart(8)} ${"limite".padStart(7)} ${"residu".padStart(7)}`);

const pts = [];
for (const r of onze) {
  const m = r.correction.match(/COUPON COMPRIS, ([\d\s]+,[\d]+) %/);
  if (!m) continue;
  const imprime = Number(m[1].replace(/\s/g, "").replace(",", "."));
  const dc = dernierCoupon(r.sessionOn, r.maturityOn);
  const j = Math.round((Date.parse(r.sessionOn) - Date.parse(dc)) / 86400000);
  const couru = (Number(r.couponRate) * j) / 365;
  const propre = imprime - couru;
  const residu = propre - Number(r.priceLimit);
  pts.push({ couru, residu, r });
  dire(
    `   ${r.sessionOn}  ${String(r.codeEmission).padEnd(14)} ${String(r.couponRate).padStart(5)} ${String(j).padStart(5)} ${fr(couru, 2).padStart(6)} ${fr(imprime).padStart(8)} ${fr(propre).padStart(8)} ${fr(r.priceLimit, 2).padStart(7)} ${fr(residu).padStart(7)}`,
  );
}

/* LE COURU VARIE DE UN A CINQ. SI LE RESIDU EN VENAIT, IL VARIERAIT AUTANT. */
const serres = pts.filter((p) => Math.abs(p.residu) < 0.2);
const n = serres.length;
const moyR = serres.reduce((s, p) => s + p.residu, 0) / n;
const moyC = serres.reduce((s, p) => s + p.couru, 0) / n;
const cov = serres.reduce((s, p) => s + (p.couru - moyC) * (p.residu - moyR), 0);
const varC = serres.reduce((s, p) => s + (p.couru - moyC) ** 2, 0);
const varR = serres.reduce((s, p) => s + (p.residu - moyR) ** 2, 0);
const correlation = cov / Math.sqrt(varC * varR);
const pente = cov / varC;

dire(`\n=== LE RESIDU, SUR LES ${n} SEANCES QUI TOMBENT A MOINS DE 0,2 POINT DU LIMITE ===`);
dire(`   couru        de ${fr(Math.min(...serres.map((p) => p.couru)), 2)} a ${fr(Math.max(...serres.map((p) => p.couru)), 2)} points, soit un facteur ${fr(Math.max(...serres.map((p) => p.couru)) / Math.min(...serres.map((p) => p.couru)), 1)}`);
dire(`   residu       de ${fr(Math.min(...serres.map((p) => p.residu)))} a ${fr(Math.max(...serres.map((p) => p.residu)))} points, moyenne ${fr(moyR)}`);
dire(`   correlation  ${fr(correlation, 2)}   pente ${fr(pente, 4)} point de residu par point de couru`);
dire(`\n   Un residu qui vient du decompte des jours grandit AVEC le couru : la pente`);
dire(`   serait de l ordre de quelques centiemes par point, et la correlation forte.`);
dire(`   Un residu qui est la vraie marge entre la moyenne servie et le prix limite`);
dire(`   ne doit rien au couru : petite valeur positive, correlation quelconque.`);

dire(`\n=== LES AUTRES ===`);
for (const p of pts.filter((p) => Math.abs(p.residu) >= 0.2)) {
  dire(`   ${p.r.sessionOn} ${String(p.r.codeEmission).padEnd(14)} residu ${fr(p.residu)} · limite ${p.r.priceLimit} · max ${p.r.priceMax} · ecart au max ${fr(Number(p.r.priceMax) - (Number(p.r.priceLimit) + p.residu))}`);
}
