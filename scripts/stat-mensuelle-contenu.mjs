/** Que contient la statistique mensuelle, en plus de l encours ? */
import fs from "node:fs";
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const dire = (s) => fs.writeSync(1, `${s}\n`);
const r = await rangeesDuPdf(new Uint8Array(fs.readFileSync(new URL("../.sorties/stat-mensuelle.pdf", import.meta.url))));
const lignes = r.map((x) => ({ p: x.page, t: x.cellules.map((c) => c.texte).join(" | ") }));
dire(`${r.length} rangees, ${Math.max(...lignes.map((l) => l.p))} pages\n`);
dire("=== LES TITRES DE SECTION ===");
for (const l of lignes) if (/^\s*[A-Z]\s*\|?\s*-|^\s*\d+\s*\|?\s*-\s*\|?\s*[EÉ]volution|^\s*(I{1,3}|IV|V)\s*\|?\s*-/.test(l.t)) dire(`   p${l.p}  ${l.t.slice(0, 120)}`);
dire("\n=== CE QUI RESSEMBLE A UNE SEANCE (taux de couverture, soumissions) ===");
const s = lignes.filter((l) => /couverture|soumission|adjudication du|servi|taux moyen|marginal/i.test(l.t));
dire(`   ${s.length} rangee(s)`);
for (const l of s.slice(0, 14)) dire(`   p${l.p}  ${l.t.slice(0, 150)}`);
