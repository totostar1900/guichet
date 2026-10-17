/**
 * LES DONNEES DE LA MAQUETTE « OU PLACER SA SOUMISSION ».
 *
 * Deuxieme passage. Le premier mettait au centre un croisement etendue x
 * marge, quatre cases bien remplies ; la mesure du 17 octobre l a
 * disqualifie comme outil de placement, et on ne garde pas une planche
 * parce qu elle est jolie. Au centre vient ce qu un desk consulte avant de
 * conseiller : LA MARGE, par instrument et par duree.
 *
 * Chiffres REELS, calcules par src/lib/market/tension-adjudication.ts.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-tension.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { ecartMarginal, etendue, primeDeNouvelleEmission, rendementAu } = await import("../src/lib/market/tension-adjudication.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = (await repo().listAuctionResults({ limit: 2000 })).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));

const med = (xs) => { const t = xs.filter((v) => v != null).sort((a, b) => a - b); return t.length ? (t.length % 2 ? t[(t.length - 1) / 2] : Math.round((t[t.length / 2 - 1] + t[t.length / 2]) / 2)) : null; };
const q = (xs, p) => { const t = xs.filter((v) => v != null).sort((a, b) => a - b); return t.length ? t[Math.min(t.length - 1, Math.floor(t.length * p))] : null; };

/**
 * LA TABLE DE PLACEMENT, rangee comme une seance s annonce : un instrument
 * et une duree. Le NOMBRE DE SEANCES est de la colonne, pas une note en
 * bas : cinq seances et cinquante-six ne se lisent pas pareil, et c est la
 * seule facon d empecher une fausse precision sur le cote OTA.
 */
const clefs = [...new Set(toutes.map((r) => `${r.instrument}|${r.tenor}`))];
const placement = clefs
  .map((c) => {
    const [instrument, tenor] = c.split("|");
    const d = toutes.filter((r) => r.instrument === instrument && r.tenor === tenor);
    const marges = d.map((r) => ecartMarginal(r)).filter((v) => v != null);
    const etendues = d.map((r) => etendue(r)).filter((v) => v != null);
    return {
      instrument, tenor,
      seances: marges.length,
      marge: med(marges),
      marge9: q(marges, 0.9),
      etendue: med(etendues),
      /* L ordre des durees doit etre celui du temps, pas de l alphabet. */
      rang: (tenor.match(/(\d+)/) ? Number(tenor.match(/(\d+)/)[1]) : 0) * (/semaine/i.test(tenor) ? 1 : 52),
    };
  })
  .filter((x) => x.seances >= 3)
  .sort((a, b) => a.instrument.localeCompare(b.instrument) || a.rang - b.rang);

/**
 * UNE SEANCE LUE A VOIX HAUTE. Un tableau de medianes ne se comprend qu une
 * fois qu on a vu UNE ligne vraie se derouler : voici la plus recente des
 * seances completes, avec ses trois nombres et la phrase qu ils font.
 */
/* ON CHOISIT UNE SEANCE TYPIQUE, PAS LA PLUS RECENTE. Le premier jet prenait
   la derniere, qui se trouvait avoir une marge de ZERO : moyen et limite
   confondus. Un exemple degenere n enseigne rien de la notion qu il illustre,
   et pire, il laisse croire qu il n y a jamais de marge. On prend donc celle
   dont la marge est la plus proche de la mediane des bons, et la plus recente
   a egalite. */
const candidats = toutes.filter(
  (r) => r.instrument === "BTA" && ecartMarginal(r) > 0 && etendue(r) != null && rendementAu(r, "moyen") && rendementAu(r, "limite"),
);
const medianeBta = med(candidats.map((r) => ecartMarginal(r)));
const lisible = [...candidats].sort(
  (a, b) => Math.abs(ecartMarginal(a) - medianeBta) - Math.abs(ecartMarginal(b) - medianeBta) || b.sessionOn.localeCompare(a.sessionOn),
)[0];
const exemple = lisible
  ? {
      seance: lisible.sessionOn,
      pays: lisible.country,
      instrument: lisible.instrument,
      tenor: lisible.tenor,
      code: lisible.codeEmission ?? null,
      moyen: Math.round(rendementAu(lisible, "moyen").pct * 100) / 100,
      limite: Math.round(rendementAu(lisible, "limite").pct * 100) / 100,
      marge: ecartMarginal(lisible),
      etendue: etendue(lisible),
      couverture: lisible.coverage != null ? Math.round(Number(lisible.coverage)) : null,
      medianeBta,
    }
  : null;

/* L ancre est-elle franche : la distribution de l etendue, toutes seances. */
const toutesEtendues = toutes.map((r) => etendue(r)).filter((v) => v != null);
const ancre = { n: toutesEtendues.length, q1: q(toutesEtendues, 0.25), med: med(toutesEtendues), q3: q(toutesEtendues, 0.75), max: q(toutesEtendues, 1) };

/* La prime, retrogradee, avec sa reserve chiffree. */
const primes = toutes.map((r, i) => primeDeNouvelleEmission(r, toutes.slice(0, i))).filter(Boolean);
const prime = {
  n: primes.length,
  med: med(primes.map((p) => p.pb)),
  q1: q(primes.map((p) => p.pb), 0.25),
  q3: q(primes.map((p) => p.pb), 0.75),
  anPlus: primes.filter((p) => p.jours > 365).length,
};

const donnees = {
  mesureLe: new Date().toISOString().slice(0, 10),
  total: toutes.length,
  placement,
  exemple,
  ancre,
  prime,
  /* CE QUE LE LOT 5 NE DONNE PAS, mesure le 17 octobre en marche avant sur
     169 seances : le NIVEAU vient de la derniere seance comparable. */
  niveau: { bta: 14, ota: 118, dispoBta: "93 sur 118", dispoOta: "17 sur 51" },
};

fs.writeFileSync("C:/dev/guichet/public/maquette/tension-donnees.js", `window.DONNEES = ${JSON.stringify(donnees, null, 1)};\n`, "utf8");
dire(`ecrit · ${placement.length} lignes de placement · exemple ${exemple?.seance ?? "aucun"}`);
for (const p of placement) dire(`   ${p.instrument} ${p.tenor.padEnd(13)} ${String(p.seances).padStart(3)} seances · marge ${String(p.marge).padStart(4)} pb · 9/10 ${String(p.marge9).padStart(4)} pb`);
