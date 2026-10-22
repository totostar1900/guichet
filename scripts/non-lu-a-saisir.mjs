/**
 * CE QU'IL Y AURAIT À TAPER, SI LE DESK RECOPIAIT LES RANGÉES NON LUES.
 *
 * Georges, le 13 octobre 2026 : « et si le desk les recopiait à la main dans
 * un classeur pour chargement ? » La question se tranche sur deux chiffres :
 * combien de rangées, et combien de cellules par rangée. Une saisie de
 * soixante-dix rangées est une matinée ; une saisie de six mille n'existe pas.
 *
 *   npx tsx --conditions=react-server scripts/non-lu-a-saisir.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { construireRapport } = await import("../src/lib/market/rapport-fournisseur.ts");
const { FAMILLES } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);

const bulletins = await repo().listBulletins(3000);
const dates = bulletins.map((b) => b.sessionDate).sort();
const r = construireRapport(bulletins, dates[0], dates[dates.length - 1]);

const libelle = Object.fromEntries(FAMILLES.map((f) => [f.code, f.libelle]));

dire(`=== LES RANGÉES NON LUES · ${r.du} → ${r.au} ===\n`);
dire(`   ${r.perdues.length} rangées, sur ${new Set(r.perdues.map((l) => l.seance)).size} séances\n`);

const parCode = {};
for (const l of r.perdues) (parCode[l.code] ??= []).push(l);
dire(`   PAR FAMILLE`);
for (const [c, xs] of Object.entries(parCode).sort((a, b) => b[1].length - a[1].length)) {
  dire(`      ${String(xs.length).padStart(4)}  ${c}  ${libelle[c] ?? "?"}  ·  ${new Set(xs.map((l) => l.seance)).size} séance(s)`);
}

dire(`\n   LA MATIÈRE, TELLE QUE LE DESK LA VERRAIT`);
for (const [c, xs] of Object.entries(parCode).sort((a, b) => b[1].length - a[1].length)) {
  dire(`\n   --- famille ${c} : ${libelle[c] ?? "?"} ---`);
  for (const l of xs.slice(0, 4)) {
    dire(`      ${l.seance}  objet « ${l.objet} »`);
    dire(`         ${l.message.slice(0, 300)}`);
  }
  if (xs.length > 4) dire(`      … et ${xs.length - 4} autres de la même famille`);
}

/* COMBIEN DE SÉRIES DERRIÈRE CES RANGÉES, et combien portent déjà leur texte.
   Cinquante rangées sur deux lignes ne valent pas cinquante faits, et une
   rangée dont le message ne porte PAS le texte imprimé ne se recopie pas :
   elle oblige à rouvrir le PDF. */
dire(`\n   CE QUE CES RANGÉES REPRÉSENTENT VRAIMENT`);
const parIsin = {};
for (const l of r.perdues) if (l.objet) (parIsin[l.objet] ??= []).push(l.seance);
for (const [i, ss] of Object.entries(parIsin).sort((a, b) => b[1].length - a[1].length)) {
  dire(`      ${String(ss.length).padStart(3)} séance(s)  ${i}  du ${ss.sort()[0]} au ${ss.sort().at(-1)}`);
}
const avecTexte = r.perdues.filter((l) => l.imprime || /«/.test(l.message)).length;
dire(`\n      ${avecTexte} rangée(s) sur ${r.perdues.length} portent le texte imprimé dans leur message`);
dire(`      ${r.perdues.length - avecTexte} obligent donc à rouvrir le PDF pour être recopiées`);
