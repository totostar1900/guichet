/**
 * CE QUI SE DEDUIT D UNE SEANCE TCHADIENNE, ET CE QUI NE SE DEDUIT PAS.
 *
 * Le Tresor du Tchad publie une forme a lui : « Taux maximum propose » et
 * « Taux minimum propose », le montant annonce, le total des soumissions,
 * le total servi, et le taux de couverture. NI TAUX LIMITE NI TAUX MOYEN
 * PONDERE. Le trou est dans la source, et il ne se comble pas.
 *
 * MAIS LA PIECE DIT UNE CHOSE QUI SE DEDUIT. Quand le montant servi egale
 * le total des soumissions, le Tresor a accepte TOUTES les offres. Alors la
 * derniere offre acceptee est la pire du carnet, et le taux limite est
 * connu avec certitude :
 *
 *   BTA, adjuge en taux   limite = taux MAXIMUM propose
 *   OTA, adjuge en prix   limite = prix MINIMUM propose
 *
 * Ce n est pas une estimation, c est une identite : si tout a ete servi, le
 * bout du carnet a ete servi. Le moyen pondere, lui, reste inconnu, parce
 * qu il faudrait la repartition des montants par offre, que la piece ne
 * donne pas. Il restera vide, et c est juste qu il reste vide.
 *
 * ET LE REPLI EXISTE DEJA : « auctionYield » prend le limite a defaut du
 * moyen, en le declarant. Le Tchad entrerait donc dans la courbe avec son
 * hypothese ecrite a cote.
 *
 * Le script compte d abord ce que nous avons, avant de proposer quoi que
 * ce soit : sans les bornes en base, il n y a rien a deduire.
 *
 *   npx tsx --conditions=react-server scripts/tchad-ce-qui-se-deduit.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 }));
const mds = (v) => (v == null ? "—" : (Number(v) / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 }));

const toutes = await repo().listAuctionResults({ limit: 2000 });
const tchad = toutes.filter((r) => r.country === "Tchad").sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));

dire(`${tchad.length} seances tchadiennes\n`);
dire(`=== LES BORNES SONT-ELLES EN BASE ? ===`);
const bornes = { bta: 0, btaAvec: 0, ota: 0, otaAvec: 0 };
for (const r of tchad) {
  if (r.instrument === "BTA") {
    bornes.bta += 1;
    if (r.rateMin != null && r.rateMax != null) bornes.btaAvec += 1;
  } else {
    bornes.ota += 1;
    if (r.priceMin != null && r.priceMax != null) bornes.otaAvec += 1;
  }
}
dire(`   BTA  ${String(bornes.btaAvec).padStart(3)} / ${bornes.bta} portent taux minimum ET maximum proposes`);
dire(`   OTA  ${String(bornes.otaAvec).padStart(3)} / ${bornes.ota} portent prix minimum ET maximum proposes`);

dire(`\n=== TOUT A-T-IL ETE SERVI ? ===`);
const TOL = 1e6; /* un million de francs : les montants sont imprimes en millions */
let tout = 0;
let partiel = 0;
let inconnu = 0;
const deductibles = [];
for (const r of tchad) {
  if (r.bid == null || r.served == null) {
    inconnu += 1;
    continue;
  }
  const entier = Math.abs(Number(r.bid) - Number(r.served)) <= TOL;
  if (!entier) {
    partiel += 1;
    continue;
  }
  tout += 1;
  const dejaLa = r.instrument === "BTA" ? r.rateLimit != null : r.priceLimit != null;
  const borne = r.instrument === "BTA" ? r.rateMax : r.priceMin;
  if (!dejaLa && borne != null) deductibles.push({ r, borne });
}
dire(`   ${String(tout).padStart(3)} seance(s) ou le servi egale les soumissions : tout le carnet a ete pris`);
dire(`   ${String(partiel).padStart(3)} seance(s) servies partiellement : le limite est entre les bornes, indeterminable`);
dire(`   ${String(inconnu).padStart(3)} seance(s) sans les deux montants`);

dire(`\n=== CE QUI SE DEDUIRAIT, SANS RIEN INVENTER (${deductibles.length}) ===`);
dire(`   ${"seance".padEnd(11)} ${"instr".padEnd(5)} ${"code".padEnd(14)} ${"soumis".padStart(9)} ${"servi".padStart(9)} ${"min".padStart(7)} ${"max".padStart(7)}  limite deduit`);
for (const { r, borne } of deductibles) {
  const bas = r.instrument === "BTA" ? r.rateMin : r.priceMin;
  const haut = r.instrument === "BTA" ? r.rateMax : r.priceMax;
  dire(
    `   ${r.sessionOn}  ${String(r.instrument).padEnd(5)} ${String(r.codeEmission ?? "—").padEnd(14)} ${mds(r.bid).padStart(9)} ${mds(r.served).padStart(9)} ${fr(bas).padStart(7)} ${fr(haut).padStart(7)}  ${fr(borne)} ${r.instrument === "BTA" ? "(le pire taux)" : "(le pire prix)"}`,
  );
}

dire(`\n=== ET LES PARTIELLES ? ===`);
for (const r of tchad.filter((r) => r.bid != null && r.served != null && Math.abs(Number(r.bid) - Number(r.served)) > TOL)) {
  const bas = r.instrument === "BTA" ? r.rateMin : r.priceMin;
  const haut = r.instrument === "BTA" ? r.rateMax : r.priceMax;
  dire(`   ${r.sessionOn} ${String(r.instrument).padEnd(4)} servi ${mds(r.served)} sur ${mds(r.bid)} soumis · bornes ${fr(bas)} a ${fr(haut)} · limite quelque part entre les deux, la piece ne le dit pas`);
}
