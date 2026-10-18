/** CE QUE L INDEX DE LA BEAC PORTE VRAIMENT, SANS INTERPRETATION. */
import fs from "node:fs";
const dire = (s) => fs.writeSync(1, `${s}\n`);
const res = await fetch("https://www.beac.int/annonces-et-communiques/", { headers: { "user-agent": "Mozilla/5.0 (compatible; Guichet/1.0)" }, signal: AbortSignal.timeout(90_000) });
const html = await res.text();
const lignes = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => {
  const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
  return { cells, texte: cells.join(" | ") };
}).filter((l) => l.texte);
dire(`${lignes.length} lignes\n`);
dire(`=== LES DIX PREMIERES, CELLULE PAR CELLULE ===`);
for (const l of lignes.slice(0, 10)) dire(`   [${l.cells.map((c) => c.slice(0, 60)).join("] [")}]`);
dire(`\n=== LES DIX DERNIERES ===`);
for (const l of lignes.slice(-10)) dire(`   [${l.cells.map((c) => c.slice(0, 60)).join("] [")}]`);
const annees = {};
for (const l of lignes) for (const m of l.texte.matchAll(/\b(20[0-2]\d)\b/g)) annees[m[1]] = (annees[m[1]] ?? 0) + 1;
dire(`\n=== TOUTE ANNEE CITEE QUELQUE PART DANS UNE LIGNE ===`);
for (const [a, n] of Object.entries(annees).sort()) dire(`   ${a}  ${String(n).padStart(4)}`);
dire(`\n=== LIGNES CITANT 2019, LES VINGT PREMIERES ===`);
const d2019 = lignes.filter((l) => /\b2019\b/.test(l.texte));
dire(`   ${d2019.length} ligne(s) citent 2019`);
for (const l of d2019.slice(0, 20)) dire(`   ${l.texte.slice(0, 110)}`);
dire(`\n=== LIGNES CITANT MARS, AVRIL OU MAI 2019 ===`);
for (const l of lignes.filter((l) => /(mars|avril|mai|march|april|may|marzo|abril|mayo)[\s\S]{0,12}2019|2019[\s\S]{0,6}-0?[345]-/i.test(l.texte))) dire(`   ${l.texte.slice(0, 120)}`);
