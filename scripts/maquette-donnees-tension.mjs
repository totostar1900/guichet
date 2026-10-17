/**
 * LES DONNEES DE LA MAQUETTE « TENSION D UNE SEANCE ».
 *
 * Chiffres REELS, calcules par src/lib/market/tension-adjudication.ts sur
 * les 260 seances de la table. Aucune collecte, que des jointures sur l
 * existant : c est la contrainte d acceptation du lot 5.
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
dire(`${toutes.length} seances`);

const lignes = toutes.map((r, i) => {
  const p = primeDeNouvelleEmission(r, toutes.slice(0, i));
  const rdt = rendementAu(r, "moyen");
  return {
    seance: r.sessionOn,
    pays: r.country,
    instrument: r.instrument,
    tenor: r.tenor,
    code: r.codeEmission ?? null,
    rendement: rdt ? Math.round(rdt.pct * 100) / 100 : null,
    marge: ecartMarginal(r) ?? null,
    etendue: etendue(r) ?? null,
    prime: p ? p.pb : null,
    primeJours: p ? p.jours : null,
    primeRef: p ? p.reference.sessionOn : null,
    couverture: r.coverage != null ? Math.round(Number(r.coverage)) : null,
    servi: r.served != null ? Number(r.served) : null,
  };
});

/* La distribution : ce qui est NORMAL, sans quoi un chiffre seul ne se lit
   pas. Les quartiles disent ou se place une seance. */
const quartiles = (xs) => {
  const t = xs.filter((v) => v != null).sort((a, b) => a - b);
  if (!t.length) return null;
  const q = (p) => t[Math.min(t.length - 1, Math.floor(t.length * p))];
  return { n: t.length, min: t[0], q1: q(0.25), med: q(0.5), q3: q(0.75), q9: q(0.9), max: t[t.length - 1] };
};

const mesures = {
  marge: quartiles(lignes.map((l) => l.marge)),
  etendue: quartiles(lignes.map((l) => l.etendue)),
  prime: quartiles(lignes.map((l) => l.prime)),
};

/* Par pays : la mediane de chaque mesure, pour voir qui emprunte dans la
   tension et qui emprunte au calme. */
const pays = [...new Set(lignes.map((l) => l.pays))].sort();
const parPays = pays.map((p) => {
  const d = lignes.filter((l) => l.pays === p);
  return {
    pays: p,
    seances: d.length,
    marge: quartiles(d.map((x) => x.marge))?.med ?? null,
    etendue: quartiles(d.map((x) => x.etendue))?.med ?? null,
    prime: quartiles(d.map((x) => x.prime))?.med ?? null,
  };
});

/* Par annee : la tension monte-t-elle ? */
const annees = [...new Set(lignes.map((l) => l.seance.slice(0, 4)))].sort();
const parAnnee = annees.map((a) => {
  const d = lignes.filter((l) => l.seance.startsWith(a));
  return {
    annee: a,
    seances: d.length,
    marge: quartiles(d.map((x) => x.marge))?.med ?? null,
    etendue: quartiles(d.map((x) => x.etendue))?.med ?? null,
  };
});

/* LES QUATRE CAS DE LECTURE, croisant etendue et marge autour de leur
   mediane. C est la seule facon de montrer que les deux mesures ensemble
   disent autre chose que chacune seule. */
const medE = mesures.etendue.med, medM = mesures.marge.med;
const cas = [
  { clef: "calme", titre: "Étendue serrée, marginal serré", dit: "le marché s'accorde sur le prix, et le Trésor n'a pas eu à descendre dans le carnet." },
  { clef: "refus", titre: "Étendue large, marginal serré", dit: "le marché se divise, mais le Trésor a REFUSÉ la queue : il n'a servi que le haut du carnet." },
  { clef: "subie", titre: "Étendue large, marginal large", dit: "le marché se divise et le Trésor a dû prendre la queue : la séance suivante partira de ce niveau." },
  { clef: "etroite", titre: "Étendue serrée, marginal large", dit: "rare, et digne d'un regard : peu de désaccord affiché, mais la dernière soumission servie coûte cher." },
].map((c) => {
  const [largeE, largeM] = [c.clef === "refus" || c.clef === "subie", c.clef === "subie" || c.clef === "etroite"];
  const d = lignes.filter((l) => l.etendue != null && l.marge != null && (l.etendue > medE) === largeE && (l.marge > medM) === largeM);
  return { ...c, seances: d.length, exemple: d.sort((a, b) => b.servi - a.servi)[0] ?? null };
});

/* Un echantillon vrai pour la table : les seances les plus tendues. */
const tendues = lignes
  .filter((l) => l.marge != null && l.etendue != null)
  .sort((a, b) => b.marge + b.etendue - (a.marge + a.etendue))
  .slice(0, 12);

const donnees = {
  mesureLe: new Date().toISOString().slice(0, 10),
  total: lignes.length,
  mesures,
  parPays,
  parAnnee,
  cas,
  tendues,
  /* Les primes adossees a une reference lointaine : la mesure se defie d
     elle-meme plutot que d attendre qu on la prenne en defaut. */
  primesLoin: lignes.filter((l) => l.prime != null && l.primeJours > 180).length,
  primesAnPlus: lignes.filter((l) => l.prime != null && l.primeJours > 365).length,
  primesTotal: lignes.filter((l) => l.prime != null).length,
};

fs.writeFileSync("C:/dev/guichet/public/maquette/tension-donnees.js", `window.DONNEES = ${JSON.stringify(donnees, null, 1)};\n`, "utf8");
dire(`ecrit · marge ${mesures.marge.n} mesurables, mediane ${mesures.marge.med} pb`);
dire(`        etendue ${mesures.etendue.n}, mediane ${mesures.etendue.med} pb`);
dire(`        prime ${mesures.prime.n}, mediane ${mesures.prime.med} pb, dont ${donnees.primesLoin} a plus de six mois`);
dire(`cas : ${cas.map((c) => `${c.clef} ${c.seances}`).join(" · ")}`);
