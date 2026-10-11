/**
 * UNE RANGÉE D'ACTION SE TRANCHE-T-ELLE PAR L'ARITHMÉTIQUE ?
 *
 * Georges, le 12 octobre 2026 : répondre « oui, c'est cette rangée » suffit-il
 * pour que le lecteur sache que l'ouverture et la clôture valent 42 500 ?
 *
 * Pour les obligations, la réponse est non et la maison le sait depuis le
 * 6 octobre : la position seule ne détermine pas les valeurs, ce sont DEUX
 * IDENTITÉS qui tranchent la découpe (le prix vaut le pourcentage du nominal,
 * les seuils encadrent le cours précédent de six pour cent).
 *
 * Les actions ont-elles la leur ? Le soupçon vient du document lui-même :
 *
 *   CM0000010009   45 950  →  haut 50 545  bas 41 355
 *   CM0000010041   42 500  →  haut 46 750  bas 38 250
 *
 * 45 950 × 1,10 = 50 545 et × 0,90 = 41 355. Si la bande des actions est de
 * DIX pour cent et qu'elle tient sur toute la cote, alors le cours précédent
 * suffit à pinceler les seuils, donc à fixer les frontières de la rangée, donc
 * à lire l'ouverture et la clôture sans que personne ne les tape.
 *
 * Ce script le vérifie sur toutes les cotations d'actions de la base. Il
 * n'écrit rien.
 *
 *   npx tsx scripts/identite-des-actions.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { repo } = await import("../src/lib/data/index.ts");
const r = repo();

/* Toutes les actions de la cote, sur toute la profondeur disponible. */
const isins = [...new Set((await r.latestQuotes()).filter((q) => q.instrument === "action").map((q) => q.isin))];
console.log(`${isins.length} actions à la cote\n`);

const BANDES = [0.1, 0.06, 0.05, 0.03];
const bilan = {};
let total = 0;
let sansSeuil = 0;
const contre = [];

for (const isin of isins) {
  const hist = await r.listQuotes(isin, 2000);
  for (const q of hist) {
    if (q.previousClose == null || q.thresholdHigh == null || q.thresholdLow == null) continue;
    if (!(q.previousClose > 0)) continue;
    total += 1;
    if (!(q.thresholdHigh > 0) || !(q.thresholdLow > 0)) {
      sansSeuil += 1;
      continue;
    }
    /* On cherche la bande qui explique les DEUX seuils au franc près. Un seul
       des deux ne prouverait rien : la moitié des bandes se ressemblent. */
    const b = BANDES.find((x) => Math.abs(q.thresholdHigh - q.previousClose * (1 + x)) < 1 && Math.abs(q.thresholdLow - q.previousClose * (1 - x)) < 1);
    const clef = b ? `${(b * 100).toFixed(0)} %` : "aucune bande connue";
    bilan[clef] = (bilan[clef] ?? 0) + 1;
    if (!b && contre.length < 8) contre.push(`${isin} ${q.sessionDate} précédent ${q.previousClose} · haut ${q.thresholdHigh} (×${(q.thresholdHigh / q.previousClose).toFixed(4)}) · bas ${q.thresholdLow} (×${(q.thresholdLow / q.previousClose).toFixed(4)})`);
  }
}

console.log(`${total} cotations examinées · ${sansSeuil} sans seuil imprimé\n`);
for (const [k, v] of Object.entries(bilan).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(5)}  ${k}  (${((v / (total - sansSeuil)) * 100).toFixed(2)} %)`);
if (contre.length) console.log(`\nles contre-exemples :\n${contre.map((l) => `   ${l}`).join("\n")}`);

/* LA SECONDE IDENTITÉ : la variation annoncée doit valoir celle que la
   clôture et le cours précédent donnent. La bande pince les deux seuils ;
   celle-ci pince la CLÔTURE, donc la frontière des champs qui la précèdent.
   Deux identités indépendantes, comme pour les obligations. */
const v = { tient: 0, non: 0, exemples: [] };
for (const isin of isins) {
  for (const q of await r.listQuotes(isin, 2000)) {
    if (q.previousClose == null || q.close == null || q.variationPct == null || !(q.previousClose > 0)) continue;
    const attendue = ((q.close - q.previousClose) / q.previousClose) * 100;
    if (Math.abs(attendue - q.variationPct) < 0.02) v.tient += 1;
    else {
      v.non += 1;
      if (v.exemples.length < 5) v.exemples.push(`${isin} ${q.sessionDate} précédent ${q.previousClose} · clôture ${q.close} · annoncée ${q.variationPct} % · calculée ${attendue.toFixed(2)} %`);
    }
  }
}
console.log(`\nla variation annoncée contre la variation calculée :`);
console.log(`   ${v.tient} tiennent · ${v.non} non (${((v.tient / (v.tient + v.non)) * 100).toFixed(2)} %)`);
for (const e of v.exemples) console.log(`   ${e}`);
