/**
 * CE QU'UNE REPRISE AU LECTEUR v7 RENDRAIT, ET OÙ ÇA SE VOIT.
 *
 * Georges, le 12 octobre 2026 : « avons-nous gagné des séances, y a-t-il un
 * impact sur les points de l'indice et la profondeur de la donnée ? »
 *
 * Trois questions distinctes, et il faut les séparer :
 *
 *   les SÉANCES   combien quittent la file des bulletins à regarder ;
 *   l'INDICE      il est IMPRIMÉ par la bourse depuis le 12/12/2023, il ne
 *                 se calcule pas chez nous : une action retrouvée ne crée
 *                 donc pas un point d'indice. Ce qu'elle nourrit, ce sont
 *                 les séries par société, base 100 ;
 *   la PROFONDEUR les cotations par ligne, et les trous dans chaque série.
 *
 *   npx tsx scripts/ce-que-v7-rendrait.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { lectureAncienne, VERSION_DU_LECTEUR } = await import("../src/lib/market/lecteur-version.ts");
const { enAttente } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const bulletins = await r.listBulletins(2000);

console.log(`=== LES SÉANCES ===\n`);
const anciennes = bulletins.filter((b) => lectureAncienne(b.readerVersion));
console.log(`   ${bulletins.length} séances en base · lecteur courant v${VERSION_DU_LECTEUR}`);
console.log(`   ${anciennes.length} lues par un lecteur plus ancien, donc candidates à une reprise`);
console.log(`   ${bulletins.filter(enAttente).length} dans la file « à regarder »`);
const parVersion = {};
for (const b of bulletins) parVersion[b.readerVersion ?? "aucune"] = (parVersion[b.readerVersion ?? "aucune"] ?? 0) + 1;
for (const [v, n] of Object.entries(parVersion)) console.log(`      v${v} : ${n}`);

console.log(`\n=== L'INDICE ===\n`);
const avecIndice = bulletins.filter((b) => b.indexValue != null);
console.log(`   ${avecIndice.length} séances portent la valeur de l'indice, du ${avecIndice.at(-1)?.sessionDate} au ${avecIndice[0]?.sessionDate}`);
console.log(`   ${bulletins.filter((b) => b.indexValue == null).length} ne la portent pas`);
/* L'indice est imprimé, pas calculé : une action retrouvée ne crée aucun
   point. Le seul cas où une relecture en ajoute un, c'est une séance
   postérieure au 12/12/2023 dont l'en-tête d'indice n'avait pas été lu. */
const muettesApres = bulletins.filter((b) => b.indexValue == null && b.sessionDate >= "2023-12-12");
console.log(`   dont ${muettesApres.length} APRÈS le 12/12/2023 : celles-là, et elles seules, peuvent gagner un point`);
for (const b of muettesApres.slice(0, 8)) console.log(`      ${b.sessionDate} · ${b.status} · lecteur v${b.readerVersion ?? "—"}`);

console.log(`\n=== LA PROFONDEUR, LIGNE PAR LIGNE ===\n`);
const dernieres = await r.latestQuotes();
const trous = [];
for (const q of dernieres) {
  const hist = await r.listQuotes(q.isin, 2000);
  const dates = new Set(hist.map((x) => x.sessionDate));
  /* Les séances où la ligne AURAIT dû coter : entre sa première et sa
     dernière cotation connue, toute séance lue sans elle est un trou. */
  const premiere = hist.at(-1)?.sessionDate ?? "";
  const derniere = hist[0]?.sessionDate ?? "";
  const attendues = bulletins.filter((b) => b.sessionDate >= premiere && b.sessionDate <= derniere);
  const manquantes = attendues.filter((b) => !dates.has(b.sessionDate));
  if (manquantes.length) trous.push({ isin: q.isin, instrument: q.instrument, cotations: hist.length, attendues: attendues.length, manquantes: manquantes.length });
}
trous.sort((a, b) => b.manquantes - a.manquantes);
console.log(`   ${dernieres.length} lignes · ${trous.length} avec au moins un trou`);
console.log(`   ${trous.reduce((s, t) => s + t.manquantes, 0)} cotations manquantes au total, sur les fenêtres de vie des lignes\n`);
for (const t of trous.slice(0, 12)) console.log(`   ${t.isin} ${t.instrument.padEnd(10)} ${String(t.cotations).padStart(4)} lues sur ${String(t.attendues).padStart(4)} séances · ${t.manquantes} trous`);
