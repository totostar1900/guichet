/**
 * L ECART MARGINAL ANNONCE-T-IL LA SEANCE SUIVANTE ?
 *
 * « A quoi sert le lot 5, quel est son message ? » La seule reponse
 * honnete est une mesure. Le desk se sert de la table des adjudications
 * comme d une MEMOIRE, pour dire a un client ou se placer avant une
 * seance. Une mesure n y sert que si elle apprend quelque chose sur la
 * SUITE.
 *
 * L hypothese a tester : quand le Tresor a du racler le fond du carnet,
 * c est que la demande manquait a ce prix, et la seance comparable
 * suivante devrait couter plus cher.
 *
 * Elle peut tres bien etre fausse. Si elle l est, ce script le dira, et le
 * lot 5 perdra sa planche centrale plutot que de la garder par politesse.
 *
 *   npx tsx --conditions=react-server scripts/tension-sert-elle.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { ecartMarginal, etendue, rendementAu } = await import("../src/lib/market/tension-adjudication.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = (await repo().listAuctionResults({ limit: 2000 })).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

/* On apparie chaque seance a la SUIVANTE du meme Tresor et de la meme duree,
   dans les six mois : au-dela, trop de choses ont bouge pour attribuer quoi
   que ce soit a la tension d hier. */
const couples = [];
for (const [i, a] of toutes.entries()) {
  const ya = rendementAu(a, "moyen");
  const m = ecartMarginal(a);
  const e = etendue(a);
  if (!ya || m == null) continue;
  const b = toutes.slice(i + 1).find((x) => x.country === a.country && x.tenor === a.tenor && x.sessionOn > a.sessionOn);
  if (!b) continue;
  const jours = Math.round((Date.parse(b.sessionOn) - Date.parse(a.sessionOn)) / 86400000);
  if (jours > 185) continue;
  const yb = rendementAu(b, "moyen");
  if (!yb) continue;
  couples.push({ pays: a.country, tenor: a.tenor, de: a.sessionOn, a: b.sessionOn, jours, marge: m, etendue: e, bouge: Math.round((yb.pct - ya.pct) * 100) });
}

dire(`${couples.length} couples (seance, seance comparable suivante sous six mois)\n`);

const med = (xs) => { const t = [...xs].sort((x, y) => x - y); return t.length ? (t.length % 2 ? t[(t.length - 1) / 2] : Math.round((t[t.length / 2 - 1] + t[t.length / 2]) / 2)) : null; };
const moy = (xs) => (xs.length ? Math.round(xs.reduce((a, x) => a + x, 0) / xs.length) : null);

const medM = med(couples.map((c) => c.marge));
const serres = couples.filter((c) => c.marge <= medM);
const larges = couples.filter((c) => c.marge > medM);

dire(`=== LE MOUVEMENT DU RENDEMENT VERS LA SEANCE SUIVANTE, EN POINTS DE BASE ===`);
dire(`   apres un marginal SERRE (<= ${medM} pb) : ${serres.length} couples · mediane ${med(serres.map((c) => c.bouge))} · moyenne ${moy(serres.map((c) => c.bouge))}`);
dire(`   apres un marginal LARGE  (>  ${medM} pb) : ${larges.length} couples · mediane ${med(larges.map((c) => c.bouge))} · moyenne ${moy(larges.map((c) => c.bouge))}`);

/* La correlation de rang, qui ne suppose aucune forme. */
const rangs = (xs) => {
  const ordre = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = new Array(xs.length);
  ordre.forEach((o, k) => (r[o.i] = k + 1));
  return r;
};
const rm = rangs(couples.map((c) => c.marge));
const rb = rangs(couples.map((c) => c.bouge));
const n = couples.length;
const d2 = rm.reduce((a, _, i) => a + (rm[i] - rb[i]) ** 2, 0);
const rho = 1 - (6 * d2) / (n * (n * n - 1));
dire(`\n   correlation de rang entre marginal et mouvement suivant : ${rho.toFixed(3)}`);

/* Et le meme test pour l etendue, pour ne pas conclure sur une seule. */
const avecE = couples.filter((c) => c.etendue != null);
const medE = med(avecE.map((c) => c.etendue));
dire(`\n   apres une etendue SERREE (<= ${medE} pb) : mediane ${med(avecE.filter((c) => c.etendue <= medE).map((c) => c.bouge))}`);
dire(`   apres une etendue LARGE  (>  ${medE} pb) : mediane ${med(avecE.filter((c) => c.etendue > medE).map((c) => c.bouge))}`);

dire(`\n=== CE QUE CELA VEUT DIRE ===`);
const ecart = (med(larges.map((c) => c.bouge)) ?? 0) - (med(serres.map((c) => c.bouge)) ?? 0);
dire(`   ecart des medianes : ${ecart} pb. Une difference de quelques points de base sur des`);
dire(`   echantillons de cette taille ne prouve rien ; il faut qu elle se voie.`);
