/**
 * DEUX CITATIONS DONT LA DUREE NE CORRESPOND PAS.
 *
 * Une ligne a deux ans cite une piece intitulee « OTA a 3 ans ». De deux
 * choses l une : la duree de la ligne est fausse, ou la piece citee l est.
 * On ne devine pas, on fait parler une TROISIEME source.
 *
 * LE CODE D EMISSION ENCODE LA DUREE. Les Tresors de la CEMAC construisent
 * leurs codes ainsi : deux lettres de pays, un chiffre d instrument, puis
 * UNE LETTRE DE DUREE. GA2A et TD2A valent deux ans, GA2J trois, GA2K
 * quatre, GA2B cinq, GA2C sept, GA2D dix. La regle se verifie avant de
 * servir : si elle tient sur toute la base, elle arbitre nos deux cas.
 *
 * Le script etablit d abord la correspondance a partir des donnees, puis
 * s en sert.
 *
 *   npx tsx --conditions=react-server scripts/citations-tchad-gabon.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const { repo } = await import("../src/lib/data/index.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);

const toutes = await repo().listAuctionResults({ limit: 2000 });
const otas = toutes.filter((r) => r.instrument === "OTA" && r.codeEmission && r.tenor);

/* LA LETTRE DE DUREE est le quatrieme caractere : GA2[A]00000183. */
const parLettre = new Map();
for (const r of otas) {
  const lettre = r.codeEmission[3];
  const c = parLettre.get(lettre) ?? new Map();
  c.set(r.tenor, (c.get(r.tenor) ?? 0) + 1);
  parLettre.set(lettre, c);
}

dire(`=== LA LETTRE DE DUREE DIT-ELLE TOUJOURS LA MEME CHOSE ? ===\n`);
dire(`   ${"lettre".padEnd(7)} ${"n".padStart(4)}  durees portees par les lignes qui l emploient`);
const reference = new Map();
let incoherentes = 0;
for (const [lettre, c] of [...parLettre].sort()) {
  const total = [...c.values()].reduce((a, b) => a + b, 0);
  const trie = [...c].sort((a, b) => b[1] - a[1]);
  if (trie.length > 1) incoherentes += 1;
  reference.set(lettre, trie[0][0]);
  dire(`   ${lettre.padEnd(7)} ${String(total).padStart(4)}  ${trie.map(([t, n]) => `${t} (${n})`).join(" · ")}`);
}
dire(`\n   ${incoherentes} lettre(s) employee(s) pour plusieurs durees.`);

dire(`\n=== LES DEUX CITATIONS EN CAUSE ===`);
const vise = toutes.filter(
  (r) => (r.codeEmission === "TD2A00000941" && r.sessionOn === "2025-04-30") || (r.codeEmission === "GA2K00000116" && r.sessionOn === "2024-11-20"),
);
for (const r of vise) {
  const lettre = r.codeEmission[3];
  dire(`\n   ${r.sessionOn} · ${r.country} · ${r.codeEmission}`);
  dire(`      duree portee par la ligne   ${r.tenor}`);
  dire(`      duree dite par le code      ${reference.get(lettre) ?? "?"}   (lettre « ${lettre} »)`);
  dire(`      echeance                    ${r.maturityOn ?? "—"}`);
  dire(`      titre de la piece citee     ${r.sourceTitle}`);
  dire(`      ${r.sourceUrl}`);
}

dire(`\n=== LES AUTRES LIGNES DE CES DEUX SEANCES ===`);
for (const cle of ["2025-04-30|Tchad", "2024-11-20|Gabon"]) {
  const [d, p] = cle.split("|");
  dire(`\n   ${d} · ${p}`);
  for (const r of toutes.filter((r) => r.sessionOn === d && r.country === p)) {
    dire(`      ${String(r.instrument).padEnd(4)} ${String(r.tenor).padEnd(12)} ${String(r.codeEmission ?? "—").padEnd(14)} echeance ${r.maturityOn ?? "—"}`);
    dire(`         ${r.sourceTitle}`);
  }
}

dire(`\n=== LA MEME LIGNE AILLEURS, AVEC SA DUREE ET SON ECHEANCE ===`);
for (const code of ["TD2A00000941", "GA2K00000116"]) {
  const ailleurs = toutes.filter((r) => r.codeEmission === code);
  dire(`   ${code} : ${ailleurs.length} seance(s)`);
  for (const r of ailleurs) dire(`      ${r.sessionOn} ${r.tenor} echeance ${r.maturityOn ?? "—"}`);
}
