/**
 * UN SEUL SOUMISSIONNAIRE EXPLIQUE-T-IL LA CONTRARIETE ?
 *
 * Georges a ouvert la piece du 4 septembre 2019 : les quatre cases portent
 * bien 98, et il n y avait QU UN SEUL SVT soumissionnaire. Notre lecture
 * est donc fidele, et la contrariete est reelle : une ligne abondee depuis
 * douze jours imprime exactement son prix limite, sans le coupon couru.
 *
 * NOUVELLE HYPOTHESE, nee de son observation. Avec un seul soumissionnaire
 * il n y a qu un prix, et le Tresor RECOPIE ce prix dans la case du prix
 * moyen au lieu d y porter un prix de reglement. Avec plusieurs, il calcule
 * vraiment, et le calcul sort coupon compris.
 *
 * ELLE SE TESTE, et c est tout l interet : si elle tient, AUCUNE des onze
 * seances prouvees sales ne doit avoir un soumissionnaire unique. Une seule
 * qui en aurait un la tue.
 *
 * ET ELLE TRANCHE LES NEUF. Celles a plusieurs soumissionnaires se
 * corrigent ; celles a un seul restent telles quelles.
 *
 *   npx tsx --conditions=react-server scripts/un-seul-soumissionnaire.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 3) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function anneesDe(tenor) {
  const m = String(tenor ?? "").match(/(\d+)/);
  if (!m || /semaine|mois/i.test(String(tenor))) return null;
  return Number(m[1]);
}
function emissionDe(echeance, annees) {
  if (!echeance || annees == null) return null;
  const d = new Date(echeance + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() - annees);
  return d.toISOString().slice(0, 10);
}
function departDuCouru(seance, echeance, emission) {
  const s = new Date(seance + "T00:00:00Z");
  const e = new Date(echeance + "T00:00:00Z");
  const d = new Date(Date.UTC(s.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
  if (d > s) d.setUTCFullYear(d.getUTCFullYear() - 1);
  const anniversaire = d.toISOString().slice(0, 10);
  return emission && anniversaire < emission ? emission : anniversaire;
}

const toutes = await repo().listAuctionResults({ limit: 2000 });
const gabon = toutes
  .filter((r) => r.instrument === "OTA" && r.country === "Gabon" && r.priceLimit != null && r.priceAvg != null && r.maturityOn && r.couponRate != null)
  .sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

const lignes = gabon.map((r) => {
  const annees = anneesDe(r.tenor);
  const emission = emissionDe(r.maturityOn, annees);
  const neuve = emission != null && Math.abs(jours(emission, r.sessionOn)) <= 7;
  const m = r.correction?.match(/COUPON COMPRIS, ([\d\s]+,[\d]+) %/);
  const imprime = m ? Number(m[1].replace(/\s/g, "").replace(",", ".")) : Number(r.priceAvg);
  const depart = departDuCouru(r.sessionOn, r.maturityOn, emission);
  const j = neuve ? 0 : jours(depart, r.sessionOn);
  const couru = (Number(r.couponRate) * j) / 365;
  const sale = Boolean(m);
  const propreProuvee = !sale && !neuve && imprime - couru < Number(r.priceLimit) - 0.05;
  return { r, neuve, imprime, couru, sale, propreProuvee };
});

dire(`${lignes.length} obligations gabonaises\n`);
dire(`   ${"seance".padEnd(11)} ${"code".padEnd(14)} ${"etat".padEnd(8)} ${"soum.".padStart(5)} ${"imprime".padStart(8)} ${"couru".padStart(6)} ${"limite".padStart(7)} ${"max".padStart(7)}  classement`);
for (const x of lignes) {
  const cl = x.sale ? "SALE prouvee" : x.neuve ? "neuve, muette" : x.propreProuvee ? "CONTRARIETE" : "indecise";
  dire(
    `   ${x.r.sessionOn}  ${String(x.r.codeEmission).padEnd(14)} ${(x.neuve ? "NEUVE" : "abondee").padEnd(8)} ${String(x.r.bidders ?? "—").padStart(5)} ${fr(x.imprime).padStart(8)} ${fr(x.couru, 2).padStart(6)} ${fr(x.r.priceLimit, 2).padStart(7)} ${fr(x.r.priceMax, 2).padStart(7)}  ${cl}`,
  );
}

const sales = lignes.filter((x) => x.sale);
const salesSeules = sales.filter((x) => x.r.bidders === 1);
dire(`\n=== CE QUI TUERAIT L HYPOTHESE DU SOUMISSIONNAIRE UNIQUE ===`);
dire(`   ${sales.length} seance(s) prouvee(s) sale(s), dont ${salesSeules.length} a UN SEUL soumissionnaire.`);
for (const x of salesSeules) dire(`      ${x.r.sessionOn} ${x.r.codeEmission}`);
if (!salesSeules.length) dire(`   Aucune. Un prix moyen coupon compris n est jamais sorti d une seance a un seul soumissionnaire.`);

const inconnus = sales.filter((x) => x.r.bidders == null);
dire(`   ${inconnus.length} prouvee(s) sale(s) dont le nombre de soumissionnaires n est pas lu : le test est muet sur elles.`);

dire(`\n=== CE QUE L HYPOTHESE TRANCHERAIT PARMI LES INDECISES ===`);
for (const x of lignes.filter((x) => !x.sale && !x.neuve && !x.propreProuvee)) {
  const n = x.r.bidders;
  const verdict = n == null ? "soumissionnaires inconnus, rien a dire" : n === 1 ? "UN SEUL, on n y touche pas" : `${n} soumissionnaires, a corriger vers ${fr(x.imprime - x.couru)}`;
  dire(`   ${x.r.sessionOn} ${String(x.r.codeEmission).padEnd(14)} ${verdict}`);
}
