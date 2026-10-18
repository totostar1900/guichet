/**
 * QUE VAUT UNE MARGE, ET POUR QUI ?
 *
 * Trois questions de Georges, et seule la mesure y repond.
 *
 *   La marge se compte-t-elle en POINTS DE BASE DE RENDEMENT ou en
 *   POINTS DE PRIX ? Les deux ne disent pas la meme chose, et l ecart
 *   entre eux depend entierement de la duree.
 *
 *   Pour QUI se compte-t-elle ? Le client la paie, l emetteur ne la voit
 *   pas : il recoit le prix de l adjudication, quoi que nous fassions.
 *
 *   A QUOI sert-elle ? A payer ce que la maison fait. Reste a savoir si
 *   c est un travail ponctuel ou un risque porte dans le temps, parce que
 *   les deux ne se facturent pas dans la meme unite.
 *
 * ON CALCULE AVEC LES FONCTIONS DE L APPLICATION, bondCalc et btaCalc,
 * celles-la memes qui affichent le rendement au client. Un exemple
 * calcule a la main a cote du code ne prouve rien sur le code.
 *
 *   npx tsx --conditions=react-server scripts/que-vaut-une-marge.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { bondCalc, btaCalc, daysBetween } = await import("../src/lib/finance.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));
const fcfa = (v) => Math.round(v).toLocaleString("fr-FR") + " F";

const MISE = 10_000_000; /* dix millions, une souscription ordinaire */
const offres = await repo().listOffers();
const ouvertes = offres.filter((o) => ["BTA", "OTA", "APE"].includes(o.kind) && !["closed", "archived"].includes(o.status) && o.maturityOn);

dire(`=== CE QUE VINGT-CINQ POINTS DE BASE DE RENDEMENT COUTENT AU CLIENT ===`);
dire(`    sur une mise de ${fcfa(MISE)}, lignes reellement ouvertes aujourd hui\n`);
dire(`   ${"ligne".padEnd(26)} ${"duree".padStart(7)} ${"rdt".padStart(8)} ${"prix".padStart(8)} ${"prix a -25 pb".padStart(14)} ${"en points".padStart(10)} ${"en francs".padStart(14)}`);

const lignes = [];
for (const o of ouvertes) {
  const annees = daysBetween(o.settleOn, o.maturityOn) / 365;
  let r0 = null;
  let prix0 = null;
  let prix1 = null;

  if (o.kind === "BTA" && o.precountRate != null) {
    /* UN BON SE COTE EN TAUX PRECOMPTE. Son « prix » est le decaissement
       par titre, et 25 pb de rendement se traduisent par un escompte plus
       faible. On cherche le taux precompte qui donne le rendement vise. */
    const y = (tp) => btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, MISE, tp).yieldPct;
    const p = (tp) => btaCalc({ nominal: o.nominal, settleOn: o.settleOn, maturityOn: o.maturityOn }, MISE, tp).pricePerBond;
    r0 = y(o.precountRate);
    prix0 = (p(o.precountRate) / o.nominal) * 100;
    let bas = 0.01,
      haut = 60;
    for (let i = 0; i < 80; i++) {
      const m = (bas + haut) / 2;
      if (y(m) > r0 - 0.25) haut = m;
      else bas = m;
    }
    prix1 = (p((bas + haut) / 2) / o.nominal) * 100;
  } else if (o.pricePct != null && o.couponRate != null) {
    const b = { nominal: o.nominal, couponRate: o.couponRate, settleOn: o.settleOn, maturityOn: o.maturityOn, lastCouponOn: o.lastCouponOn };
    const y = (px) => bondCalc(b, MISE, px).irr;
    r0 = y(o.pricePct);
    prix0 = o.pricePct;
    /* Le prix qui donne vingt-cinq points de base de MOINS au client : il
       est plus haut, puisqu un prix plus eleve rend moins. */
    let bas = 1,
      haut = 300;
    for (let i = 0; i < 90; i++) {
      const m = (bas + haut) / 2;
      if (y(m) > r0 - 0.25) bas = m;
      else haut = m;
    }
    prix1 = (bas + haut) / 2;
  }
  if (r0 == null || prix0 == null || prix1 == null || !Number.isFinite(r0)) continue;

  const points = prix1 - prix0;
  const francs = (points / 100) * MISE;
  lignes.push({ o, annees, r0, prix0, prix1, points, francs });
  dire(
    `   ${`${o.kind} ${o.country} ${o.maturityOn}`.padEnd(26)} ${fr(annees).padStart(7)} ${(fr(r0) + " %").padStart(8)} ${fr(prix0, 3).padStart(8)} ${fr(prix1, 3).padStart(14)} ${fr(points, 3).padStart(10)} ${fcfa(francs).padStart(14)}`,
  );
}

dire(`\n=== ET L INVERSE : CE QUE VAUT UN DEMI-POINT DE PRIX, EN RENDEMENT ===\n`);
dire(`   ${"ligne".padEnd(26)} ${"duree".padStart(7)} ${"0,50 point vaut".padStart(16)}`);
for (const l of lignes) {
  /* La regle est la meme dans les deux sens : 25 pb coutent « points »,
     donc un demi-point vaut 25 × 0,5 / points points de base. */
  const pbParDemiPoint = Math.abs(l.points) < 1e-9 ? null : (25 * 0.5) / Math.abs(l.points);
  dire(`   ${`${l.o.kind} ${l.o.country} ${l.o.maturityOn}`.padEnd(26)} ${fr(l.annees).padStart(7)} ${(pbParDemiPoint == null ? "—" : Math.round(pbParDemiPoint) + " pb").padStart(16)}`);
}

dire(`\n=== LE RAPPORT ENTRE LES DEUX UNITES ===`);
const tries = lignes.filter((l) => Math.abs(l.points) > 1e-9).sort((a, b) => a.annees - b.annees);
if (tries.length >= 2) {
  const court = tries[0];
  const longue = tries.at(-1);
  dire(`   La plus courte, ${court.o.kind} ${court.o.country} a ${fr(court.annees)} ans : 25 pb coutent ${fr(court.points, 3)} point, soit ${fcfa(court.francs)}.`);
  dire(`   La plus longue, ${longue.o.kind} ${longue.o.country} a ${fr(longue.annees)} ans : 25 pb coutent ${fr(longue.points, 3)} point, soit ${fcfa(longue.francs)}.`);
  dire(`   Rapport : ${fr(Math.abs(longue.points / court.points), 1)} fois plus cher sur la longue, POUR LA MEME MARGE EN POINTS DE BASE.`);
}

dire(`\n=== CE QUE LA MAISON FACTURE AUJOURD HUI ===`);
const avecCommission = offres.filter((o) => o.commissionPct > 0).length;
dire(`   ${avecCommission} offre(s) sur ${offres.length} portent une commission non nulle.`);
const sansMention = ouvertes.filter((o) => !o.priceNote && !o.rateNote).length;
dire(`   ${sansMention} ligne(s) ouverte(s) sur ${ouvertes.length} affichent leur prix SANS mention « indicatif ».`);
