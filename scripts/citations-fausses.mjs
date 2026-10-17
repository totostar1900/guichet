/**
 * LA PIECE CITEE EST-ELLE BIEN CELLE DE LA LIGNE ?
 *
 * Avant d envoyer quelqu un verifier des pieces a l oeil, il faut que les
 * liens pointent au bon endroit. Un doute est apparu : une ligne a QUATRE
 * ans cite une piece intitulee TROIS ans.
 *
 * LE TEST EST DANS LE TITRE. Les communiques gabonais nomment la duree :
 * « OTA 3 ans du 07 fevrier 2024 ». Si le titre annonce une duree et que la
 * ligne en porte une autre, la citation est fausse, et l oeil qu on envoie
 * la-bas verifiera la mauvaise page.
 *
 *   npx tsx --conditions=react-server scripts/citations-fausses.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

/** La duree que le titre ou l adresse annonce, en annees, quand ils la disent. */
function dureeDuTitre(texte) {
  const t = String(texte ?? "").replace(/-/g, " ").toLowerCase();
  const an = t.match(/\bota\D{0,12}(\d{1,2})\s*ans?\b/) ?? t.match(/\b(\d{1,2})\s*ans?\b/);
  return an ? Number(an[1]) : null;
}
const dureeDeLaLigne = (tenor) => {
  const m = String(tenor ?? "").match(/(\d+)/);
  if (!m) return null;
  return /semaine/i.test(tenor) ? Number(m[1]) / 52 : Number(m[1]);
};

const toutes = await repo().listAuctionResults({ limit: 2000 });
const otas = toutes.filter((r) => r.instrument === "OTA");

let verifiables = 0;
const fausses = [];
const partagees = new Map();
for (const r of otas) {
  const dTitre = dureeDuTitre(r.sourceTitle) ?? dureeDuTitre(r.sourceUrl);
  const dLigne = dureeDeLaLigne(r.tenor);
  if (dTitre != null && dLigne != null) {
    verifiables += 1;
    if (dTitre !== dLigne) fausses.push({ r, dTitre, dLigne });
  }
  const k = r.sourceUrl;
  partagees.set(k, [...(partagees.get(k) ?? []), r]);
}

dire(`${otas.length} obligations · ${verifiables} dont la duree est verifiable dans le titre\n`);

/* ACQUITTER N EST PAS SE TAIRE. Une piece mal nommee PAR LA BEAC reste une
   discordance, et le controle doit continuer de la voir ; mais la ranger avec
   les discordances non examinees ferait rougir ce panneau indefiniment sur une
   faute qui n est pas la notre, et un rouge permanent ne se lit plus. Elles
   passent donc dans une seconde liste, et la premiere doit rester vide. */
const expliquees = fausses.filter(({ r }) => r.correction?.includes("mal nommée à la source"));
const aExaminer = fausses.filter(({ r }) => !r.correction?.includes("mal nommée à la source"));

dire(`=== ${aExaminer.length} CITATION(S) A EXAMINER ===`);
for (const { r, dTitre, dLigne } of aExaminer) {
  dire(`   ${r.sessionOn} ${String(r.country).padEnd(10)} ${String(r.codeEmission ?? "—").padEnd(14)} ligne ${dLigne} ans, piece « ${String(r.sourceTitle).slice(0, 64)} » annonce ${dTitre} ans`);
}
if (!aExaminer.length) dire(`   aucune.`);

dire(`\n=== ${expliquees.length} DISCORDANCE(S) EXPLIQUEE(S) : LA BEAC A MAL NOMME SA PIECE ===`);
for (const { r, dTitre, dLigne } of expliquees) {
  dire(`   ${r.sessionOn} ${String(r.country).padEnd(10)} ${String(r.codeEmission ?? "—").padEnd(14)} ligne ${dLigne} ans, titre ${dTitre} ans · code et echeance confirment la ligne, aucune autre piece a l index`);
}

const multi = [...partagees.entries()].filter(([, rs]) => rs.length > 1);
dire(`\n=== ${multi.length} ADRESSE(S) CITEE(S) PAR PLUSIEURS LIGNES ===`);
for (const [url, rs] of multi.slice(0, 12)) {
  dire(`   ${rs.length} lignes · ${url.split("/").pop().slice(0, 78)}`);
  for (const r of rs) dire(`      ${r.sessionOn} ${String(r.codeEmission ?? "—").padEnd(14)} ${r.tenor}`);
}
dire(`\n   Plusieurs lignes peuvent legitimement partager une piece quand le`);
dire(`   Tresor publie un seul communique pour plusieurs lignes du jour. Ce qui`);
dire(`   ne va pas, c est une duree annoncee differente de celle de la ligne.`);
