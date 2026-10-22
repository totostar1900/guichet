/**
 * LA PIECE TCHADIENNE IMPRIME-T-ELLE UN PRIX ?
 *
 * Deux causes possibles au trou, et elles appellent des gestes opposes.
 *
 *   LE LECTEUR A MANQUE la colonne : il faut relire, et savoir pourquoi.
 *
 *   LE TRESOR NE LA PUBLIE PAS : il faut le DIRE, pas le combler. Un trou
 *   dans la source n est pas un defaut chez nous, et le confondre avec un
 *   defaut de lecture conduit a inventer des nombres.
 *
 * Si les pieces portent une couche de texte, la question se tranche sans
 * modele et sans oeil : on cherche les mots du bareme.
 *
 *   npx tsx --conditions=react-server scripts/tchad-que-dit-la-piece.mjs [--texte]
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const montrerTexte = process.argv.includes("--texte");

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function texteDe(bytes) {
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const c = await page.getTextContent();
    out += c.items.map((i) => i.str).join(" ") + "\n";
  }
  await doc.destroy();
  return out;
}

/* LES MOTS DU BAREME, tels que les six Tresors les ecrivent. */
const MOTS = [
  /prix\s+moyen/i,
  /taux\s+moyen/i,
  /prix\s+limite/i,
  /taux\s+limite/i,
  /prix\s+marginal/i,
  /taux\s+marginal/i,
  /prix\s+(minimum|maximum)/i,
  /taux\s+(minimum|maximum)/i,
  /rendement/i,
  /pondér/i,
];

const toutes = await repo().listAuctionResults({ limit: 2000 });
const tchad = toutes.filter((r) => r.country === "Tchad" && r.fileKey).sort((a, b) => b.sessionOn.localeCompare(a.sessionOn));

let avecTexte = 0;
let parlentDePrix = 0;
const sansMot = [];
for (const r of tchad) {
  let t;
  try {
    t = await texteDe(await readSource(r.fileKey));
  } catch (e) {
    dire(`   ${r.sessionOn} ${r.instrument} ILLISIBLE : ${String(e.message).slice(0, 60)}`);
    continue;
  }
  const n = t.replace(/\s+/g, "").length;
  if (n < 200) {
    dire(`   ${r.sessionOn} ${String(r.instrument).padEnd(4)} ${String(n).padStart(5)} car.  scan muet`);
    continue;
  }
  avecTexte += 1;
  const trouves = MOTS.filter((m) => m.test(t)).map((m) => String(m).replace(/[/\\^$i]/g, "").replace(/\\s\+/g, " "));
  if (trouves.length) parlentDePrix += 1;
  else sansMot.push(r);
  dire(`   ${r.sessionOn} ${String(r.instrument).padEnd(4)} ${String(n).padStart(5)} car.  ${trouves.length ? trouves.join(" · ") : "AUCUN MOT DE BAREME"}`);
  if (montrerTexte) dire(`      ${t.replace(/[ \t]+/g, " ").replace(/\n/g, " ").trim().slice(0, 1400)}\n`);
}

dire(`\n=== ${tchad.length} pieces · ${avecTexte} avec une couche de texte · ${parlentDePrix} qui nomment un prix ou un taux ===`);
if (!avecTexte) dire(`   Toutes des scans. Seul un modele ou un oeil peut dire ce qu elles impriment.`);
