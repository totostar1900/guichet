/**
 * CE QUE LES TROIS MESURES DU LOT 5 DISENT DE NOS SEANCES.
 *
 * Lecture seule, aucun appel modele, aucune ecriture. Avant de montrer un
 * chiffre au desk il faut savoir s il a une forme : une mesure dont la
 * mediane est nulle et les extremes absurdes n a pas sa place sur un ecran,
 * quelle que soit la qualite de son code.
 *
 * ET L ECART MARGINAL SE CONTROLE LUI-MEME. Il est positif par construction,
 * le marginal etant la derniere soumission servie. Un negatif n est donc pas
 * une information de marche mais une faute de releve : ce script les compte
 * et les nomme, ce qui fait de cette mesure un cliquet gratuit.
 *
 *   npx tsx --conditions=react-server scripts/tension-mesure.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { ecartMarginal, etendue, primeDeNouvelleEmission } = await import("../src/lib/market/tension-adjudication.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = (await repo().listAuctionResults({ limit: 2000 })).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
dire(`${toutes.length} seance(s) en table\n`);

const med = (xs) => {
  if (!xs.length) return undefined;
  const t = [...xs].sort((a, b) => a - b);
  const i = Math.floor(t.length / 2);
  return t.length % 2 ? t[i] : Math.round((t[i - 1] + t[i]) / 2);
};
const resume = (nom, xs, total) => {
  if (!xs.length) return dire(`${nom.padEnd(26)} aucune mesurable sur ${total}`);
  const t = [...xs].sort((a, b) => a - b);
  dire(
    `${nom.padEnd(26)} ${String(xs.length).padStart(4)} mesurable(s) sur ${total}` +
      ` · mediane ${String(med(xs)).padStart(5)} pb` +
      ` · q1 ${String(t[Math.floor(t.length * 0.25)]).padStart(5)}` +
      ` · q3 ${String(t[Math.floor(t.length * 0.75)]).padStart(5)}` +
      ` · min ${String(t[0]).padStart(6)} · max ${String(t[t.length - 1]).padStart(6)}`,
  );
};

const marges = [];
const etendues = [];
const primes = [];
const negatifs = [];
const primesLoin = [];

for (const [i, r] of toutes.entries()) {
  const em = ecartMarginal(r);
  if (em != null) {
    marges.push(em);
    if (em < 0) negatifs.push({ r, em });
  }
  const e = etendue(r);
  if (e != null) etendues.push(e);
  const p = primeDeNouvelleEmission(r, toutes.slice(0, i));
  if (p) {
    primes.push(p.pb);
    if (p.jours > 180) primesLoin.push({ r, p });
  }
}

dire("=== LES TROIS MESURES ===");
resume("ecart marginal", marges, toutes.length);
resume("etendue des taux", etendues, toutes.length);
resume("prime de nouvelle emission", primes, toutes.length);

dire(`\n=== LE CLIQUET : ${negatifs.length} ecart(s) marginal(aux) NEGATIF(S) ===`);
if (!negatifs.length) dire("   aucun : sur toutes les seances mesurables, le marginal coute bien plus que la moyenne.");
for (const { r, em } of negatifs.slice(0, 20)) {
  dire(
    `   ${r.sessionOn} ${String(r.country).padEnd(12)} ${r.instrument} ${String(r.codeEmission ?? "—").padEnd(14)} ${String(em).padStart(6)} pb` +
      `   moyen ${r.rateAvg ?? r.priceAvg ?? "—"}  limite ${r.rateLimit ?? r.priceLimit ?? "—"}`,
  );
}
if (negatifs.length > 20) dire(`   … et ${negatifs.length - 20} autres`);

dire(`\n=== ${primesLoin.length} prime(s) adossee(s) a une reference de plus de six mois ===`);
for (const { r, p } of primesLoin.slice(0, 10)) {
  dire(`   ${r.sessionOn} ${String(r.country).padEnd(12)} ${r.tenor.padEnd(13)} ${String(p.pb).padStart(5)} pb contre le ${p.reference.sessionOn}, ${p.jours} jours plus tot`);
}
