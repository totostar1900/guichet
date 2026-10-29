/**
 * CE QUE LE LOT 5 DIT A QUI DOIT PROPOSER UN TAUX OU UN PRIX.
 *
 * Mon test precedent demandait : « la tension d hier annonce-t-elle le taux
 * de demain ? » C etait la MAUVAISE QUESTION. Le desk ne cherche pas a
 * prevoir une moyenne, il cherche OU PLACER UNE SOUMISSION, et cela se lit
 * dans la seance passee sans rien prevoir du tout.
 *
 * LA MECANIQUE D UNE ADJUDICATION. Le Tresor sert du meilleur prix pour lui
 * jusqu a sa limite :
 *
 *   BTA, exprime en TAUX : il accepte du taux le plus BAS en montant, et le
 *   taux limite est le PLUS HAUT servi. Soumettre au-dessus, c est n etre
 *   pas servi.
 *
 *   OTA, exprime en PRIX : il accepte du prix le plus HAUT en descendant, et
 *   le prix limite est le PLUS BAS servi. Soumettre en dessous, c est n etre
 *   pas servi.
 *
 * DONC L ECART MARGINAL EST LA MARGE DE MANOEUVRE, en clair : de combien on
 * peut s ecarter du moyen pondere dans le sens qui nous arrange tout en
 * restant servi, d apres la derniere seance comparable. Ce n est pas une
 * prevision, c est la profondeur du carnet d hier.
 *
 * Et l etendue dit si le moyen pondere est un point de repere FRANC ou
 * VAGUE : large, les soumissions etaient dispersees et la moyenne ne resume
 * pas grand chose.
 *
 *   npx tsx --conditions=react-server scripts/tension-pour-proposer.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { ecartMarginal, etendue } = await import("../src/lib/market/tension-adjudication.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = await repo().listAuctionResults({ limit: 2000 });

/* LE CONTROLE D ABORD : la mecanique annoncee se verifie-t-elle dans les
   chiffres ? Si le limite n est pas du bon cote du moyen, tout ce qui suit
   s effondre. */
let bonSens = 0, mauvaisSens = 0;
for (const r of toutes) {
  if (r.instrument === "BTA" && r.rateAvg != null && r.rateLimit != null) {
    if (r.rateLimit >= r.rateAvg) bonSens++;
    else mauvaisSens++;
  }
  if (r.instrument === "OTA" && r.priceAvg != null && r.priceLimit != null) {
    if (r.priceLimit <= r.priceAvg) bonSens++;
    else mauvaisSens++;
  }
}
dire(`controle de la mecanique : ${bonSens} seances dans le bon sens, ${mauvaisSens} a contresens\n`);

const med = (xs) => { const t = xs.filter((v) => v != null).sort((a, b) => a - b); return t.length ? (t.length % 2 ? t[(t.length - 1) / 2] : Math.round((t[t.length / 2 - 1] + t[t.length / 2]) / 2)) : null; };
const q = (xs, p) => { const t = xs.filter((v) => v != null).sort((a, b) => a - b); return t.length ? t[Math.min(t.length - 1, Math.floor(t.length * p))] : null; };

/* LA TABLE QUE LE DESK CONSULTERAIT : par instrument et par duree, puisque
   c est ainsi qu une seance s annonce. */
const clefs = [...new Set(toutes.map((r) => `${r.instrument}|${r.tenor}`))].sort();
dire(`=== LA MARGE DE MANOEUVRE, PAR INSTRUMENT ET PAR DUREE ===`);
dire(`   ${"ligne".padEnd(20)} ${"n".padStart(4)}  ${"marge mediane".padStart(14)}  ${"9 fois sur 10".padStart(14)}  ${"etendue mediane".padStart(16)}`);
for (const c of clefs) {
  const [inst, tenor] = c.split("|");
  const d = toutes.filter((r) => r.instrument === inst && r.tenor === tenor);
  const marges = d.map((r) => ecartMarginal(r)).filter((v) => v != null);
  if (marges.length < 4) continue;
  const etendues = d.map((r) => etendue(r)).filter((v) => v != null);
  dire(
    `   ${(inst + " " + tenor).padEnd(20)} ${String(marges.length).padStart(4)}  ${String(med(marges)).padStart(11)} pb  ${String(q(marges, 0.9)).padStart(11)} pb  ${String(med(etendues) ?? "—").padStart(13)} pb`,
  );
}

dire(`\n=== CE QUE CELA DONNE EN CLAIR ===`);
const bta = toutes.filter((r) => r.instrument === "BTA").map((r) => ecartMarginal(r)).filter((v) => v != null);
const ota = toutes.filter((r) => r.instrument === "OTA").map((r) => ecartMarginal(r)).filter((v) => v != null);
dire(`   BTA : en soumettant ${med(bta)} pb au-dessus du taux moyen de la derniere seance comparable,`);
dire(`         on serait reste servi une fois sur deux ; ${q(bta, 0.9)} pb neuf fois sur dix.`);
dire(`   OTA : meme lecture en prix, ${med(ota)} pb de rendement sous le moyen, soit un prix plus bas.`);
dire(`\n   Aucune prevision la-dedans : c est la profondeur du carnet de la seance passee.`);
