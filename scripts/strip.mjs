/**
 * LE DÉMEMBREMENT D'UNE LIGNE COTÉE, CALCULÉ SUR SES PARAMÈTRES PUBLIÉS.
 *
 * Entrée : un ISIN de la table d'encours du BOC, et rien d'autre. Le taux, le
 * nominal résiduel, l'amortissement, la périodicité, le prochain coupon et
 * l'échéance y sont tous imprimés à chaque séance.
 *
 * Sortie : la liste des flux restants, chacun devenant un zéro-coupon, et le
 * remembrement qui vérifie que la somme des morceaux fait bien le tout.
 *
 * CE QU'IL NE FAIT PAS, et il faut le dire : il ne connaît pas le DIFFÉRÉ
 * d'amortissement, qui n'est pas publié. Quand le nominal résiduel égale le
 * nominal d'origine alors que la ligne a déjà vécu, c'est qu'un différé court
 * encore, et la répartition ci-dessous est une HYPOTHÈSE, signalée comme
 * telle. Pour une vraie offre, ce calendrier vient de la note d'information.
 *
 *   npx tsx --conditions=react-server scripts/strip.mjs CM0000020628 [séance]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");
const { rangeesDuPdf, encoursGeometriques } = await import("../src/lib/market/boc-geometrie.ts");

const isin = process.argv[2] ?? "CM0000020628";
const jour = process.argv[3] ?? "2026-10-12";

const b = (await repo().listBulletins(2000)).find((x) => x.sessionDate === jour);
const bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
const ligne = encoursGeometriques(await rangeesDuPdf(Uint8Array.from(bytes))).find((l) => l.isin === isin);
if (!ligne) {
  console.log(`${isin} absente de la table d'encours du ${jour}`);
  process.exit(0);
}

const PAR_AN = { AN: 1, SEM: 2, TRIM: 4, MENS: 12 };
const n = PAR_AN[ligne.periodicity.toUpperCase()] ?? 1;
/** L'échéance finale se lit dans la désignation : « … 2025-2030 ». */
const finale = Number((ligne.designation.match(/(\d{4})\s*$/) ?? ligne.designation.match(/-(\d{4})/) ?? [])[1]);
const prochain = new Date(`${ligne.nextCouponOn}T12:00:00Z`);

/** Les dates de flux restantes, du prochain coupon à l'échéance finale. */
const dates = [];
for (let d = new Date(prochain); d.getUTCFullYear() <= finale; d.setUTCMonth(d.getUTCMonth() + 12 / n)) {
  dates.push(new Date(d).toISOString().slice(0, 10));
  if (dates.length > 80) break;
}

const enFine = /IN ?FINE/i.test(ligne.amortisation);
const tranche = enFine ? 0 : ligne.nominalRemaining / dates.length;

console.log(`\n${ligne.issuer} · ${ligne.designation}`);
console.log(`${ligne.isin} ${ligne.mnemo} · séance du ${jour}`);
console.log(`taux ${ligne.couponRate} % · ${ligne.amortisation} · ${ligne.periodicity} · nominal résiduel ${ligne.nominalRemaining.toLocaleString("fr-FR")} · ${ligne.units.toLocaleString("fr-FR")} titres`);
console.log(`encours ${ligne.outstanding.toLocaleString("fr-FR")} FCFA · cours ${ligne.pricePct} %\n`);

console.log(`${dates.length} flux restants, pour UN titre :\n`);
console.log("  échéance     nominal avant     coupon   amortissement      flux");
let reste = ligne.nominalRemaining;
let sommeCoupons = 0;
let sommeAmort = 0;
const flux = [];
for (const [i, d] of dates.entries()) {
  const coupon = (reste * ligne.couponRate) / 100 / n;
  const amort = enFine ? (i === dates.length - 1 ? reste : 0) : Math.min(tranche, reste);
  const total = coupon + amort;
  flux.push({ d, coupon, amort, total });
  sommeCoupons += coupon;
  sommeAmort += amort;
  console.log(`  ${d}  ${reste.toFixed(2).padStart(14)}  ${coupon.toFixed(2).padStart(9)}  ${amort.toFixed(2).padStart(14)}  ${total.toFixed(2).padStart(9)}`);
  reste -= amort;
}

console.log(`\n  somme des coupons      ${sommeCoupons.toFixed(2).padStart(12)}`);
console.log(`  somme des amortissements ${sommeAmort.toFixed(2).padStart(10)}`);
console.log(`  nominal résiduel         ${ligne.nominalRemaining.toFixed(2).padStart(10)}   ${Math.abs(sommeAmort - ligne.nominalRemaining) < 0.01 ? "le remembrement tombe juste" : "<<< ÉCART"}`);

/* LE REMEMBREMENT, et c'est lui qui garantit qu'un démembrement ne crée pas
   de valeur : la somme des zéros actualisés doit rendre le prix du titre
   entier. On actualise au taux facial faute de courbe ici ; en production
   c'est la courbe de rendements qui sert. */
const r = ligne.couponRate / 100;
const t0 = Date.parse(`${jour}T12:00:00Z`);
/* On actualise à la MÊME convention que le titre : le taux périodique r/n sur
   le nombre de périodes. Actualiser au taux annuel effectif un titre qui paie
   par trimestre déplace le total de 1,6 %, et ce déplacement se lirait à tort
   comme un gain du démembrement. */
const periodes = (d) => ((Date.parse(`${d}T12:00:00Z`) - t0) / (365.25 * 86400000)) * n;
const vap = flux.reduce((a, f) => a + f.total / Math.pow(1 + r / n, periodes(f.d)), 0);
console.log(`\n  valeur actuelle des ${dates.length} zéros, au taux facial périodique : ${vap.toFixed(2)}`);
const pied = (ligne.nominalRemaining * ligne.pricePct) / 100;
console.log(`  prix du titre entier au cours publié (pied de coupon) : ${pied.toFixed(2)}`);

/* ET VOICI LE CONTRÔLE QUI FERME LE RAISONNEMENT. L'écart entre la somme des
   zéros et le cours publié n'est pas un gain : c'est le COUPON COURU. Le cours
   est coté au pied de coupon, la somme des flux actualisés est un prix pleine
   coupon. Si les deux ne se rejoignent pas au franc près, le découpage est
   faux, et c'est la seule façon de le savoir sans sortir du document. */
const t1 = Date.parse(`${ligne.previousCouponOn}T12:00:00Z`);
const t2 = Date.parse(`${ligne.nextCouponOn}T12:00:00Z`);
const couru = ((ligne.nominalRemaining * ligne.couponRate) / 100 / n) * ((t0 - t1) / (t2 - t1));
console.log(`  coupon couru du ${ligne.previousCouponOn} au ${jour}            : ${couru.toFixed(2)}`);
console.log(`  prix pleine coupon visé                               : ${(pied + couru).toFixed(2)}`);

/* MON PREMIER VERDICT ÉTAIT GROSSIER : il refusait ECM10 parce qu'elle cote 99
   et non 100. Actualiser au taux FACIAL ne peut rendre le cours que d'une
   ligne au pair ; ailleurs l'écart est le rendement du marché, et non une
   faute de découpage. Le bon instrument est donc le rendement IMPLICITE du
   cours publié, cherché par bissection. C'est lui, et lui seul, qui prix les
   dix-sept zéros de façon à ce que leur somme rende le tout. */
const valeurA = (taux) => flux.reduce((a, f) => a + f.total / Math.pow(1 + taux / n, periodes(f.d)), 0);
let bas = -0.5;
let haut = 2;
for (let k = 0; k < 200; k += 1) {
  const milieu = (bas + haut) / 2;
  if (valeurA(milieu) > pied + couru) bas = milieu;
  else haut = milieu;
}
const implicite = (bas + haut) / 2;
console.log(`  rendement implicite du cours ${ligne.pricePct} %                      : ${(implicite * 100).toFixed(3)} % (facial ${ligne.couponRate} %)`);
console.log(`  somme des zéros à ce rendement                        : ${valeurA(implicite).toFixed(2)}`);
console.log(`  reste : ${(valeurA(implicite) - pied - couru).toFixed(2)} FCFA par titre   ${Math.abs(valeurA(implicite) - pied - couru) < 1 ? "le démembrement ne crée aucune valeur" : "<<< INEXPLIQUÉ"}`);

console.log(`\nPour l'encours entier (${ligne.units.toLocaleString("fr-FR")} titres), chaque flux donnerait un zéro-coupon de :`);
for (const f of flux.slice(0, 4)) console.log(`  ${f.d}  ${(f.total * ligne.units).toLocaleString("fr-FR", { maximumFractionDigits: 0 }).padStart(18)} FCFA`);
if (flux.length > 4) console.log(`  … et ${flux.length - 4} autres`);
