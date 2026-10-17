/**
 * LES DONNEES DE LA MAQUETTE « COURBE EN BOUGIES ».
 *
 * QUATRE NOMBRES PAR SEANCE, et ils se rangent dans un chandelier sans
 * qu on force :
 *
 *   la MECHE va du minimum au maximum proposes : tout ce que le marche a
 *   demande, servi ou non ;
 *   le CORPS va du limite au moyen pondere : la zone ou le Tresor a
 *   reellement traite. Le corps EST la queue.
 *
 * TOUT EST CONVERTI EN RENDEMENT, et c est ce qui permet a un bon et a une
 * obligation de tenir sur le meme axe. La conversion INVERSE l ordre des
 * obligations : le prix le plus haut donne le rendement le plus BAS. Une
 * bougie dont on oublierait cela aurait son corps a l envers.
 *
 * LA FRAICHEUR compte autant que le niveau. Proposer un taux sur une
 * echeance dont la derniere seance comparable a dix-huit mois n est pas la
 * meme chose que le proposer sur une seance du mois dernier, et c est au
 * desk de le savoir avant de decider, pas apres.
 *
 *   npx tsx --conditions=react-server scripts/maquette-donnees-bougies.mjs
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

const PANIERS = [
  { nom: "≤ 6 mois", bas: 0, haut: 0.6, axe: 0.5 },
  { nom: "1 an", bas: 0.6, haut: 1.5, axe: 1 },
  { nom: "2 ans", bas: 1.5, haut: 2.5, axe: 2 },
  { nom: "3 ans", bas: 2.5, haut: 3.5, axe: 3 },
  { nom: "4-5 ans", bas: 3.5, haut: 5.5, axe: 4.5 },
  { nom: "7 ans +", bas: 5.5, haut: 99, axe: 7.5 },
];

/** Le rendement que donnerait CE prix, ou CE taux, toutes choses egales. */
function rendementDe(r, valeur) {
  if (valeur == null) return null;
  const faux =
    r.instrument === "BTA"
      ? { ...r, yieldAvg: undefined, yieldLimit: undefined, rateAvg: valeur, rateLimit: undefined }
      : { ...r, yieldAvg: undefined, yieldLimit: undefined, priceAvg: valeur, priceAvgFcfa: undefined, priceLimit: undefined, priceMin: undefined, priceMax: undefined };
  const y = auctionYield(faux, "guichet");
  return y ? Math.round(y.pct * 1000) / 1000 : null;
}

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const seances = [];
for (const r of toutes) {
  const v = vieRestante(r);
  if (v == null) continue;
  const panier = PANIERS.find((p) => v.years > p.bas && v.years <= p.haut);
  if (!panier) continue;

  /* LIGNE NEUVE OU ABONDEMENT. Une ligne est neuve quand son echeance vaut
     la seance plus la duree annoncee, a quelques jours pres. La distinction
     commande tout l usage : un abondement sur un reliquat court se sert au
     prix conventionnel de la place, autour de 90, et son rendement est alors
     dicte par l arithmetique du reliquat, pas par l avis du marche. Le
     proposer comme reference pour une ligne NEUVE serait une faute. */
  const anneesEtiquette = (() => {
    const m = String(r.tenor ?? "").match(/(\d+)/);
    if (!m) return null;
    return /semaine/i.test(String(r.tenor)) ? Number(m[1]) / 52 : /mois/i.test(String(r.tenor)) ? Number(m[1]) / 12 : Number(m[1]);
  })();
  const neuve = anneesEtiquette != null && Math.abs(v.years - anneesEtiquette) <= 0.06;

  const [bas, haut, limite, moyen] =
    r.instrument === "BTA" ? [r.rateMin, r.rateMax, r.rateLimit, r.rateAvg] : [r.priceMin, r.priceMax, r.priceLimit, r.priceAvg];
  const y = auctionYield(r, "guichet");
  if (!y) continue;

  /* En taux, le plus haut taux propose donne le plus haut rendement.
     En prix, le plus haut prix propose donne le plus BAS. On nomme donc
     les bornes par ce qu elles valent EN RENDEMENT, jamais par leur place
     dans la piece : c est la seule facon de ne pas retourner la bougie. */
  const quatre = [rendementDe(r, bas), rendementDe(r, haut), rendementDe(r, limite), rendementDe(r, moyen)].filter((x) => x != null);
  const rLimite = rendementDe(r, limite);
  const rMoyen = rendementDe(r, moyen);

  seances.push({
    pays: r.country,
    instrument: r.instrument,
    seance: r.sessionOn,
    tenor: r.tenor,
    code: r.codeEmission ?? null,
    panier: panier.nom,
    axe: panier.axe,
    annees: Math.round(v.years * 1000) / 1000,
    anneesEtiquette,
    neuve,
    rendement: Math.round(y.pct * 1000) / 1000,
    mecheBas: quatre.length ? Math.min(...quatre) : null,
    mecheHaut: quatre.length ? Math.max(...quatre) : null,
    corpsBas: rLimite != null && rMoyen != null ? Math.min(rLimite, rMoyen) : null,
    corpsHaut: rLimite != null && rMoyen != null ? Math.max(rLimite, rMoyen) : null,
    rLimite,
    rMoyen,
    servi: r.served ?? null,
    soumis: r.bid ?? null,
    soumissionnaires: r.bidders ?? null,
    couverture: r.coverage ?? null,
    hypotheses: (y.assumptions ?? []).map((h) => h.key.replace(/\{(\w+)\}/g, (_, k) => String(h.params?.[k] ?? ""))),
  });
}

const sansRendement = toutes.length - seances.length;
const sortie = {
  produitLe: new Date().toISOString().slice(0, 10),
  aujourdhui: new Date().toISOString().slice(0, 10),
  total: toutes.length,
  sansRendement,
  paniers: PANIERS.map((p) => ({ nom: p.nom, axe: p.axe })),
  seances: seances.sort((a, b) => a.seance.localeCompare(b.seance)),
};
fs.writeFileSync("C:/dev/guichet/public/maquette/bougies-donnees.js", `window.BOUGIES = ${JSON.stringify(sortie)};\n`, "utf8");

dire(`${seances.length} seances retenues, ${sansRendement} sans rendement ou sans duree`);
dire(`de ${seances[0].seance} a ${seances.at(-1).seance}\n`);

/* UN CONTROLE AVANT DE LIVRER LES DONNEES : le corps doit tenir DANS la
   meche, sans quoi la bougie serait fausse et personne ne le verrait. */
const dehors = seances.filter((s) => s.corpsBas != null && (s.corpsBas < s.mecheBas - 0.001 || s.corpsHaut > s.mecheHaut + 0.001));
dire(`=== ${dehors.length} bougie(s) dont le corps sort de sa meche ===`);
for (const s of dehors.slice(0, 10)) dire(`   ${s.seance} ${s.pays} ${s.instrument} corps ${s.corpsBas}-${s.corpsHaut} meche ${s.mecheBas}-${s.mecheHaut}`);

const neuves = seances.filter((s) => s.neuve).length;
dire(`\n${neuves} ligne(s) neuve(s), ${seances.length - neuves} abondement(s) : seules les premieres servent de reference a une ligne neuve.`);

const hauteurs = seances.filter((s) => s.corpsBas != null).map((s) => s.corpsHaut - s.corpsBas).sort((a, b) => a - b);
dire(`\nHauteur du corps, en points de rendement : mediane ${hauteurs[Math.floor(hauteurs.length / 2)].toFixed(2)} · max ${hauteurs.at(-1).toFixed(2)}`);
const meches = seances.filter((s) => s.mecheBas != null).map((s) => s.mecheHaut - s.mecheBas).sort((a, b) => a - b);
dire(`Hauteur de la meche                      : mediane ${meches[Math.floor(meches.length / 2)].toFixed(2)} · max ${meches.at(-1).toFixed(2)}`);
