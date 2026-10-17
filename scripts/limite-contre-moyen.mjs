/**
 * LIMITE CONTRE MOYEN : LEQUEL DOIT MARQUER LA COURBE ?
 *
 * Deux lectures d une meme seance.
 *
 *   LE MOYEN PONDERE, ce a quoi le marche a paye en moyenne. C est le choix
 *   actuel, et il a sa raison : une moyenne informe sur l ensemble servi, la
 *   borne seulement sur son bord.
 *
 *   LE LIMITE, le prix auquel le Tresor a arrete l adjudication. C est le
 *   prix marginal, celui qui dit ou le marche a cesse de suivre. Il est sans
 *   ambiguite, pied de coupon chez tous les Tresors, et il ne depend pas
 *   d une case dont le sens varie d un Tresor a l autre.
 *
 * ON NE TRANCHE PAS AU GOUT. La BEAC publie sa propre courbe de rendements,
 * et nous la gardons en base, lue sur ses graphiques. Elle est le seul
 * arbitre exterieur disponible : celle de nos deux lectures qui s en
 * approche le plus est celle que la place emploie.
 *
 * DEUX MESURES, dans cet ordre.
 *
 *   L ECART ENTRE LES DEUX LECTURES, par pays et par instrument : de quoi
 *   parle-t-on, en points de base. Un choix qui ne deplace rien ne vaut pas
 *   un debat.
 *
 *   L ACCORD AVEC LA BEAC, pour chaque lecture. C est le juge.
 *
 *   npx tsx --conditions=react-server scripts/limite-contre-moyen.mjs
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
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const mediane = (xs) => {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const i = Math.floor(t.length / 2);
  return t.length % 2 ? t[i] : (t[i - 1] + t[i]) / 2;
};

/** La lecture « limite » : on retire au calcul la case du moyen, rien d autre. */
const auLimite = (r) => ({ ...r, priceAvg: undefined, priceAvgFcfa: undefined, rateAvg: undefined, yieldAvg: undefined });

const toutes = await repo().listAuctionResults({ limit: 2000 });
const utiles = toutes.filter((r) => !r.setAsideAt);

dire(`${utiles.length} seances retenues (hors ecartees)\n`);
dire(`=== 1. DE QUOI PARLE-T-ON ===\n`);
dire(`   ${"pays".padEnd(13)} ${"instr".padEnd(5)} ${"n".padStart(4)} ${"les deux".padStart(9)} ${"mediane".padStart(9)} ${"90e cent.".padStart(10)} ${"max".padStart(8)}`);

const parGroupe = new Map();
for (const r of utiles) {
  const a = auctionYield(r, "guichet");
  const b = auctionYield(auLimite(r), "guichet");
  const k = `${r.country}|${r.instrument}`;
  const g = parGroupe.get(k) ?? { n: 0, ecarts: [] };
  g.n += 1;
  if (a && b) g.ecarts.push((b.pct - a.pct) * 100);
  parGroupe.set(k, g);
}
for (const [k, g] of [...parGroupe].sort()) {
  const [pays, instr] = k.split("|");
  const abs = g.ecarts.map(Math.abs).sort((x, y) => x - y);
  const p90 = abs.length ? abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.9))] : null;
  dire(
    `   ${pays.padEnd(13)} ${instr.padEnd(5)} ${String(g.n).padStart(4)} ${String(g.ecarts.length).padStart(9)} ${(fr(mediane(abs), 0) + " pb").padStart(9)} ${(fr(p90, 0) + " pb").padStart(10)} ${(fr(abs.at(-1), 0) + " pb").padStart(8)}`,
  );
}

dire(`\n=== 2. L ARBITRE : LA COURBE QUE LA BEAC PUBLIE ===\n`);
const beac = await repo().courbesBeac();
dire(`   ${beac.length} points publies par la BEAC`);

/* APPARIER, ET UNE SEULE FOIS PAR SEANCE.
   Premiere version fausse : une fenetre de six mois sur la duree appariait une
   meme adjudication camerounaise de treize semaines aux points 3 mois, 6 mois
   ET 1 an de la BEAC, et gonflait l ecart jusqu a soixante-quinze points de
   base qui n etaient que du mauvais appariement. On ne garde donc que le point
   publie LE PLUS PROCHE, avec une tolerance qui suit la duree : un quart
   d annee, plus un dixieme de la duree. */
const paires = [];
for (const r of utiles) {
  const v = vieRestante(r);
  if (v == null) continue;
  const mois = String(r.sessionOn).slice(0, 7);
  let meilleur = null;
  for (const p of beac) {
    if (p.pays !== r.country) continue;
    if (String(p.mois).slice(0, 7) !== mois) continue;
    const d = Math.abs(v.years - p.annees);
    if (meilleur == null || d < meilleur.d) meilleur = { p, d };
  }
  if (!meilleur || meilleur.d > 0.25 + 0.1 * v.years) continue;
  const a = auctionYield(r, "guichet");
  const b = auctionYield(auLimite(r), "guichet");
  if (!a || !b) continue;
  paires.push({ p: meilleur.p, r, moyen: a.pct, limite: b.pct, ecartDuree: meilleur.d });
}
dire(`   ${paires.length} appariement(s) seance / point publie\n`);

if (!paires.length) {
  const mois = [...new Set(beac.map((p) => String(p.mois).slice(0, 7)))].sort();
  const moisAdj = [...new Set(utiles.map((r) => String(r.sessionOn).slice(0, 7)))].sort();
  dire(`   La BEAC couvre ${mois.length} mois, de ${mois[0]} a ${mois.at(-1)}.`);
  dire(`   Nos adjudications couvrent ${moisAdj.length} mois, de ${moisAdj[0]} a ${moisAdj.at(-1)}.`);
  const communs = mois.filter((m) => moisAdj.includes(m));
  dire(`   ${communs.length} mois en commun. Sans recouvrement, l arbitre ne peut pas trancher.`);
} else {
  dire(`   ${"pays".padEnd(13)} ${"n".padStart(4)} ${"ecart au moyen".padStart(16)} ${"ecart au limite".padStart(16)}  lequel colle`);
  const parPays = new Map();
  for (const x of paires) {
    const c = parPays.get(x.p.pays) ?? { m: [], l: [] };
    c.m.push(Math.abs((x.moyen - x.p.taux) * 100));
    c.l.push(Math.abs((x.limite - x.p.taux) * 100));
    parPays.set(x.p.pays, c);
  }
  for (const [pays, c] of [...parPays].sort()) {
    const dm = mediane(c.m);
    const dl = mediane(c.l);
    dire(`   ${pays.padEnd(13)} ${String(c.m.length).padStart(4)} ${(fr(dm, 0) + " pb").padStart(16)} ${(fr(dl, 0) + " pb").padStart(16)}  ${dl < dm ? "LE LIMITE" : dl > dm ? "le moyen" : "egalite"}`);
  }
  const tm = mediane(paires.map((x) => Math.abs((x.moyen - x.p.taux) * 100)));
  const tl = mediane(paires.map((x) => Math.abs((x.limite - x.p.taux) * 100)));
  dire(`\n   Ensemble : moyen ${fr(tm, 0)} pb d ecart median, limite ${fr(tl, 0)} pb.`);
}
