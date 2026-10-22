/**
 * LE TCHAD EST ABSENT DE LA COURBE.
 *
 * Quarante-cinq de ses quarante-huit seances ne portent NI prix NI taux,
 * alors que leurs montants servis sont lus et que les pieces sont passees
 * au lecteur. Un Tresor entier manque, et personne ne s en etait apercu :
 * un rendement absent ne crie pas, il se contente de ne pas tracer.
 *
 * AVANT DE REPARER, COMPRENDRE. Quatre causes possibles, et elles
 * n appellent pas le meme geste.
 *
 *   LA PIECE N A JAMAIS ETE LUE. Alors il n y a rien a reparer que de la
 *   passer.
 *
 *   LA PIECE A ETE LUE ET LE LECTEUR A RENDU DES MONTANTS SANS TAUX. Alors
 *   le defaut est dans la lecture, et il faut voir ce que la piece imprime.
 *
 *   LA PIECE N IMPRIME PAS DE TAUX. Certains Tresors publient un montant
 *   servi et rien d autre, et alors le trou est dans la source, pas chez
 *   nous. Il faut le dire plutot que le combler.
 *
 *   LA PIECE EST ILLISIBLE. Un scan de travers, un tampon.
 *
 * Le script compte les quatre et sort de quoi regarder.
 *
 *   npx tsx --conditions=react-server scripts/tchad-sans-prix.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const fr = (v) => (v == null ? "—" : (Number(v) / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " Mds");

const toutes = await repo().listAuctionResults({ limit: 2000 });
const tchad = toutes.filter((r) => r.country === "Tchad").sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));

const aUnPrix = (r) =>
  r.rateAvg != null || r.rateLimit != null || r.priceAvg != null || r.priceLimit != null || r.priceAvgFcfa != null || r.yieldAvg != null || r.yieldLimit != null;
const muettes = tchad.filter((r) => !aUnPrix(r));

dire(`${tchad.length} seances tchadiennes · ${muettes.length} sans aucun prix ni taux\n`);

const compte = { jamaisLue: 0, lueSansTaux: 0, ecartee: 0, sansPiece: 0 };
for (const r of muettes) {
  if (r.setAsideAt) compte.ecartee += 1;
  else if (!r.readAt) compte.jamaisLue += 1;
  else if (!r.fileKey) compte.sansPiece += 1;
  else compte.lueSansTaux += 1;
}
dire(`=== POURQUOI ===`);
dire(`   ${String(compte.jamaisLue).padStart(3)} jamais passee(s) au lecteur`);
dire(`   ${String(compte.lueSansTaux).padStart(3)} lue(s), piece rangee, et pourtant sans taux`);
dire(`   ${String(compte.sansPiece).padStart(3)} lue(s) mais sans piece rangee`);
dire(`   ${String(compte.ecartee).padStart(3)} ecartee(s) a la main`);

dire(`\n=== CE QUE LES MUETTES PORTENT QUAND MEME ===`);
const porte = { annonce: 0, soumis: 0, servi: 0, couverture: 0, code: 0, echeance: 0, coupon: 0, soumissionnaires: 0 };
for (const r of muettes) {
  if (r.announced != null) porte.annonce += 1;
  if (r.bid != null) porte.soumis += 1;
  if (r.served != null) porte.servi += 1;
  if (r.coverage != null) porte.couverture += 1;
  if (r.codeEmission) porte.code += 1;
  if (r.maturityOn) porte.echeance += 1;
  if (r.couponRate != null) porte.coupon += 1;
  if (r.bidders != null) porte.soumissionnaires += 1;
}
for (const [k, v] of Object.entries(porte)) dire(`   ${String(v).padStart(3)} / ${muettes.length}   ${k}`);

dire(`\n=== LES REMARQUES DU LECTEUR ===`);
const remarques = new Map();
for (const r of muettes) for (const x of r.remarks ?? []) remarques.set(x, (remarques.get(x) ?? 0) + 1);
if (!remarques.size) dire(`   aucune. Le lecteur n a rien signale : la panne est muette.`);
for (const [x, n] of [...remarques].sort((a, b) => b[1] - a[1]).slice(0, 12)) dire(`   ${String(n).padStart(3)} · ${x}`);

dire(`\n=== DIX PIECES A REGARDER ===`);
for (const r of muettes.slice(0, 10)) {
  dire(`   ${r.sessionOn} ${r.instrument} ${String(r.tenor).padEnd(12)} servi ${fr(r.served).padStart(12)} · soumis ${fr(r.bid).padStart(12)} · lu le ${r.readAt ? r.readAt.slice(0, 10) : "jamais"} par ${r.readModel ?? "—"}`);
  dire(`      ${r.sourceUrl}`);
}

dire(`\n=== LES TROIS QUI PARLENT ===`);
for (const r of tchad.filter(aUnPrix)) {
  dire(
    `   ${r.sessionOn} ${r.instrument} ${String(r.tenor).padEnd(12)} rateAvg ${r.rateAvg ?? "—"} rateLimit ${r.rateLimit ?? "—"} priceAvg ${r.priceAvg ?? "—"} priceLimit ${r.priceLimit ?? "—"}`,
  );
  dire(`      ${r.sourceUrl}`);
}
