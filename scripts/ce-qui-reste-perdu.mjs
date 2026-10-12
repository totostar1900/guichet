/**
 * CE QUI RESTE PERDU APRÈS LES DEUX LECTEURS, ET POURQUOI.
 *
 * La mesure des voisines a répondu à la première moitié de la question de
 * Georges : dans une table abîmée, dix lignes se lisent et deux se perdent.
 * Les voisines sont donc dix fois plus nombreuses que les échecs.
 *
 * Reste la seconde moitié, qui décide du travail : pour chaque ligne encore
 * perdue APRÈS le lecteur géométrique, dire laquelle des deux familles elle
 * occupe.
 *
 *   ABSENTE    aucune rangée ne porte son ISIN. L'information n'est pas dans
 *              ce que le PDF nous rend, aucune voisine n'y changera rien.
 *   PRÉSENTE   la rangée est là, elle refuse de se découper. Là, et là
 *              seulement, le gabarit appris et la contrainte de page ont
 *              quelque chose à mordre.
 *
 * Et pour chaque rangée présente, de quoi juger : son texte, le nombre de
 * cellules, ce que la grille de sa page a appris, combien de rangées de la
 * même page se sont lues, et quels nominaux ces voisines montrent.
 *
 *   npx tsx --conditions=react-server scripts/ce-qui-reste-perdu.mjs [combien]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { fetchBoc, pdfText } = await import("../src/lib/market/boc.ts");
const { parseBoc } = await import("../src/lib/market/boc-parse.ts");
const { completerObligations, rangeesDuPdf, colonnes } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { enAttente } = await import("../src/lib/market/remarques.ts");
const { repo } = await import("../src/lib/data/index.ts");

const r = repo();
const combien = Number(process.argv[2]) || 8;
const PERDUE = /^Obligation ([A-Z]{2}\d{10}) : /;
const ISIN_DANS = /[A-Z]{2}\d{10}/;

const lot = (await r.listBulletins(2000))
  .filter(enAttente)
  .filter((b) => (b.warnings ?? []).some((w) => PERDUE.test(w)))
  .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  .slice(0, combien);

let absentes = 0;
let presentes = 0;
const motifs = new Map();

for (const b of lot) {
  let bytes;
  try {
    bytes = b.fileKey ? await readSource(b.fileKey) : (await fetchBoc(b.sessionDate))?.bytes;
  } catch {
    bytes = undefined;
  }
  if (!bytes) continue;

  const refs = await r.nominauxDeReference(b.sessionDate);
  /* pdfjs DÉTACHE LE TAMPON : deux lectures sur les mêmes octets et la
     seconde ne voit rien, sans un mot. Chaque appel reçoit sa copie. */
  const rangees = await rangeesDuPdf(Uint8Array.from(bytes));
  const parsed = parseBoc(await pdfText(Uint8Array.from(bytes)), refs);
  const rattrapees = await completerObligations(parsed, Uint8Array.from(bytes), refs);

  /* CE QUI RESTE EST DANS parsed.warnings APRÈS L'APPEL, et non dans ce que
     l'appel rend : completerObligations rend les lignes RATTRAPÉES. Confondre
     les deux a fait croire une première fois que rien ne restait perdu. */
  const notes = parsed.warnings;
  const restantes = [...new Set(notes.map((w) => w.match(PERDUE)?.[1]).filter(Boolean))];
  if (rattrapees.length) console.log(`\n   (${b.sessionDate} : ${rattrapees.length} rattrapée(s) par la géométrie)`);
  if (restantes.length === 0) continue;

  console.log(`\n=== ${b.sessionDate} · ${parsed.bonds.length} obligations lues · ${restantes.length} encore perdue(s) ===`);

  for (const isin of restantes) {
    const motif = notes.find((w) => w.startsWith(`Obligation ${isin} :`))?.slice(`Obligation ${isin} : `.length) ?? "";
    const court = motif.replace(/\(\d+ cellules\)/, "(N cellules)").slice(0, 70);
    motifs.set(court, (motifs.get(court) ?? 0) + 1);

    const rangee = rangees.find((x) => x.cellules.some((c) => ISIN_DANS.test(c.texte) && c.texte.includes(isin)));
    if (!rangee) {
      absentes++;
      console.log(`   ${isin}  ABSENTE des rangées · ${court}`);
      continue;
    }
    presentes++;
    const mêmePage = rangees.filter((x) => x.page === rangee.page);
    const grille = colonnes(mêmePage);
    const voisines = mêmePage.filter((x) => x !== rangee && x.cellules.some((c) => ISIN_DANS.test(c.texte)));
    const lues = voisines.filter((x) => parsed.bonds.some((o) => x.cellules.some((c) => c.texte.includes(o.isin))));
    const nominaux = [...new Set(lues.map((x) => parsed.bonds.find((o) => x.cellules.some((c) => c.texte.includes(o.isin)))?.nominalRemaining).filter((n) => n != null))];
    console.log(`   ${isin}  PRÉSENTE page ${rangee.page} · ${rangee.cellules.length} cellules · ${court}`);
    console.log(`      grille apprise : ${grille.length} colonnes · ${voisines.length} voisines à ISIN dont ${lues.length} lues`);
    console.log(`      nominaux des voisines : ${nominaux.length ? nominaux.map((n) => n.toLocaleString("fr-FR")).join(", ") : "aucun"}`);
    console.log(`      rangée : ${rangee.cellules.map((c) => c.texte).join(" | ").slice(0, 220)}`);
  }
}

console.log(`\n=== BILAN SUR ${lot.length} SÉANCES ===\n`);
console.log(`   ${presentes} lignes PRÉSENTES dans les rangées et non découpées : le gabarit et la contrainte de page peuvent les prendre`);
console.log(`   ${absentes} lignes ABSENTES des rangées : hors d'atteinte de toute voisine\n`);
for (const [m, n] of [...motifs].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)} × ${m}`);
