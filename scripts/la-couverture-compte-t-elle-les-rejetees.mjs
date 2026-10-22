/**
 * LA FICHE PARLE-T-ELLE DES SOUMISSIONS QUI N ONT PAS ETE SERVIES ?
 *
 * Objection de Georges : pourquoi une fiche de resultats mentionnerait-elle
 * un taux qui n a pas ete servi ? Si tout ce qu elle imprime a ete servi,
 * alors le minimum et le maximum bornent le SERVI, et notre lecture du
 * carnet est fausse.
 *
 * LE TAUX DE COUVERTURE TRANCHE, et sans ambiguite, parce qu il est un
 * RAPPORT dont les deux termes sont imprimes a cote de lui.
 *
 *   couverture = soumissions totales / montant annonce
 *       la fiche parle de TOUT le carnet, rejetees comprises.
 *
 *   couverture = montant servi / montant annonce
 *       la fiche ne parle que du servi, et Georges a raison.
 *
 * Il suffit de recalculer les deux et de voir lequel tombe. Le Tresor ne
 * recalcule rien pour nous : il imprime le rapport et ses deux termes, et
 * c est une verification gratuite que personne n avait faite.
 *
 * LE CAS QUI NE DIT RIEN : quand tout a ete servi, les deux rapports sont
 * egaux. On le compte a part plutot que de le ranger du bon cote.
 *
 *   npx tsx --conditions=react-server scripts/la-couverture-compte-t-elle-les-rejetees.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v, n = 2) => (v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n }));

const toutes = (await repo().listAuctionResults({ limit: 2000 })).filter((r) => !r.setAsideAt);
const testables = toutes.filter((r) => r.coverage != null && r.announced != null && Number(r.announced) > 0 && r.bid != null && r.served != null);

dire(`${toutes.length} seances · ${testables.length} portant a la fois la couverture, le montant annonce, la soumission totale et le servi\n`);

const compte = { carnet: 0, servi: 0, muet: 0, niLun: 0 };
const temoins = [];
for (const r of testables) {
  const annonce = Number(r.announced);
  const parCarnet = (Number(r.bid) / annonce) * 100;
  const parServi = (Number(r.served) / annonce) * 100;
  const c = Number(r.coverage);
  const dCarnet = Math.abs(c - parCarnet);
  const dServi = Math.abs(c - parServi);
  const TOL = 0.5; /* un demi point de pourcentage, l arrondi d impression */

  if (Math.abs(parCarnet - parServi) < 0.01) {
    compte.muet += 1;
    continue;
  }
  if (dCarnet <= TOL && dServi > TOL) {
    compte.carnet += 1;
    if (temoins.length < 8) temoins.push({ r, c, parCarnet, parServi, verdict: "LE CARNET" });
  } else if (dServi <= TOL && dCarnet > TOL) {
    compte.servi += 1;
    temoins.push({ r, c, parCarnet, parServi, verdict: "le servi" });
  } else {
    compte.niLun += 1;
  }
}

dire(`=== CE QUE LE TAUX DE COUVERTURE RAPPORTE ===`);
dire(`   ${String(compte.carnet).padStart(4)} seance(s) ou il vaut SOUMISSIONS / annonce, rejetees comprises`);
dire(`   ${String(compte.servi).padStart(4)} seance(s) ou il vaut SERVI / annonce`);
dire(`   ${String(compte.muet).padStart(4)} seance(s) muettes : tout a ete servi, les deux rapports sont le meme nombre`);
dire(`   ${String(compte.niLun).padStart(4)} seance(s) qui ne tombent ni sur l un ni sur l autre`);

dire(`\n=== QUELQUES TEMOINS ===`);
for (const t of temoins) {
  dire(
    `   ${t.r.sessionOn} ${String(t.r.country).padEnd(12)} ${t.r.instrument}   imprime ${fr(t.c)} %   par le carnet ${fr(t.parCarnet)} %   par le servi ${fr(t.parServi)} %   → ${t.verdict}`,
  );
}

dire(`\n   Si la couverture compte les soumissions rejetees, la fiche parle bien de tout`);
dire(`   le carnet, et « minimum propose » n a jamais voulu dire « minimum servi ».`);
