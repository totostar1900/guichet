/**
 * Y A-T-IL ASSEZ DE SEANCES POUR FAIRE UNE BOUGIE ?
 *
 * Une bougie par periode et par echeance resume les marges servies. Elle
 * suppose donc qu il y ait des marges a resumer. Avec deux cent vingt-cinq
 * rendements repartis sur six Tresors, sept echeances et plusieurs annees,
 * la plupart des cases risquent de tenir en une seance, et une bougie sur
 * une seance n est plus un resume : c est la seance elle-meme, deguisee en
 * statistique.
 *
 * Ce n est pas une objection, c est un reglage : la granularite de la
 * periode et le regroupement des echeances se choisissent sur cette
 * mesure, pas sur une intuition.
 *
 * ON MESURE TROIS DECOUPAGES de la periode, par pays, et on compte combien
 * de cases tiennent en une seule seance.
 *
 *   npx tsx --conditions=react-server scripts/densite-des-bougies.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { auctionYield, vieRestante } = await import("../src/lib/market/yield.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

/* LES PANIERS D ECHEANCE. Ils suivent les points que la BEAC elle-meme
   publie sur sa courbe, pour qu une bougie se compare a quelque chose. */
const PANIERS = [
  { nom: "≤ 6 mois", bas: 0, haut: 0.6 },
  { nom: "1 an", bas: 0.6, haut: 1.5 },
  { nom: "2 ans", bas: 1.5, haut: 2.5 },
  { nom: "3 ans", bas: 2.5, haut: 3.5 },
  { nom: "4-5 ans", bas: 3.5, haut: 5.5 },
  { nom: "7 ans et plus", bas: 5.5, haut: 99 },
];
const panierDe = (a) => PANIERS.find((p) => a > p.bas && a <= p.haut)?.nom ?? null;

const periodes = {
  trimestre: (d) => `${d.slice(0, 4)}-T${Math.floor(Number(d.slice(5, 7)) / 3.01) + 1}`,
  semestre: (d) => `${d.slice(0, 4)}-S${Number(d.slice(5, 7)) <= 6 ? 1 : 2}`,
  annee: (d) => d.slice(0, 4),
};

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const pts = [];
for (const r of toutes) {
  const v = vieRestante(r);
  const y = auctionYield(r, "guichet");
  if (v == null || !y) continue;
  const panier = panierDe(v.years);
  if (!panier) continue;
  pts.push({ r, annees: v.years, panier, pct: y.pct });
}
dire(`${pts.length} seances avec un rendement et une duree, sur ${toutes.length}\n`);

for (const [nom, clef] of Object.entries(periodes)) {
  const cases = new Map();
  for (const p of pts) {
    const k = `${p.r.country}|${clef(p.r.sessionOn)}|${p.panier}`;
    cases.set(k, (cases.get(k) ?? 0) + 1);
  }
  const tailles = [...cases.values()];
  const seules = tailles.filter((n) => n === 1).length;
  const trois = tailles.filter((n) => n >= 3).length;
  dire(
    `   par ${nom.padEnd(10)} ${String(cases.size).padStart(4)} cases · ${String(seules).padStart(3)} a une seule seance (${Math.round((seules / cases.size) * 100)} %) · ${String(trois).padStart(3)} a trois seances ou plus (${Math.round((trois / cases.size) * 100)} %)`,
  );
}

dire(`\n=== SI L ON LAISSE TOMBER LA SEPARATION PAR PAYS ===`);
for (const [nom, clef] of Object.entries(periodes)) {
  const cases = new Map();
  for (const p of pts) {
    const k = `${clef(p.r.sessionOn)}|${p.panier}`;
    cases.set(k, (cases.get(k) ?? 0) + 1);
  }
  const tailles = [...cases.values()];
  const seules = tailles.filter((n) => n === 1).length;
  const trois = tailles.filter((n) => n >= 3).length;
  dire(
    `   par ${nom.padEnd(10)} ${String(cases.size).padStart(4)} cases · ${String(seules).padStart(3)} a une seule (${Math.round((seules / cases.size) * 100)} %) · ${String(trois).padStart(3)} a trois ou plus (${Math.round((trois / cases.size) * 100)} %)`,
  );
}
dire(`\n   Mais une bougie qui melange six Tresors ne sert a rien pour tarifer :`);
dire(`   le Gabon et le Cameroun n empruntent pas au meme prix. C est une mesure`);
dire(`   de ce que coute la separation, pas une proposition.`);

dire(`\n=== LA DERNIERE ANNEE, PAYS PAR PAYS ET PANIER PAR PANIER ===`);
const recents = pts.filter((p) => p.r.sessionOn >= "2025-10-01");
const grille = new Map();
for (const p of recents) {
  const k = `${p.r.country}|${p.panier}`;
  grille.set(k, [...(grille.get(k) ?? []), p]);
}
dire(`   ${recents.length} seances depuis le 1er octobre 2025\n`);
dire(`   ${"pays".padEnd(13)} ${PANIERS.map((p) => p.nom.padStart(13)).join("")}`);
for (const pays of [...new Set(pts.map((p) => p.r.country))].sort()) {
  const cells = PANIERS.map((pa) => {
    const l = grille.get(`${pays}|${pa.nom}`) ?? [];
    if (!l.length) return "—".padStart(13);
    const taux = l.map((x) => x.pct);
    return `${l.length}, ${Math.min(...taux).toFixed(1)}-${Math.max(...taux).toFixed(1)}`.padStart(13);
  });
  dire(`   ${pays.padEnd(13)}${cells.join("")}`);
}
dire(`\n   Chaque case porte le nombre de seances puis l etendue des rendements.`);
dire(`   Une case vide est une echeance sur laquelle nous n avons RIEN a proposer.`);
