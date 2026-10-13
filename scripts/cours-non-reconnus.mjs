/**
 * LES RANGÉES DE COURS QUE NI L'UN NI L'AUTRE LECTEUR NE SAIT LIRE.
 *
 * POURQUOI CE SCRIPT. La remarque « Obligation ‹ISIN› : ligne de cours non
 * reconnue » dit QUEL titre a échoué et rien d'autre : elle ne porte pas le
 * texte refusé. Une feuille de saisie bâtie dessus serait aveugle, le desk
 * n'aurait rien à recopier. Et le motif entre dans `PERDUE`, donc la lecture
 * géométrique est déjà consultée sur ces rangées : elle renonce aussi.
 *
 * Les deux lecteurs échouent, donc la question n'est pas « que taper » mais
 * d'abord « pourquoi ». On rend la rangée telle que la grille la voit, cellule
 * par cellule avec son abscisse, parce que c'est la seule vue qui montre à la
 * fois ce que le document porte et où la découpe se perd.
 *
 * Cinquante rangées, quinze séances, douze lignes cotées, du 3 mars 2023 au
 * 7 août 2024, en trois blocs nets.
 *
 *   npx tsx --conditions=react-server scripts/cours-non-reconnus.mjs [--brut]
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { pdfText } = await import("../src/lib/market/boc.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);
const avecBrut = process.argv.includes("--brut");

const PERDUE = /^Obligation ([A-Z]{2}\d{10}) : ligne de cours non reconnue/;

const bulletins = await repo().listBulletins(3000);
/* On ne touche QUE les séances portant ce commentaire : c'est la consigne, et
   c'est aussi ce qui garde la mesure lisible. */
const lot = bulletins
  .map((b) => ({ b, isins: [...new Set((b.warnings ?? []).map((w) => w.match(PERDUE)?.[1]).filter(Boolean))] }))
  .filter((x) => x.isins.length && x.b.fileKey)
  .sort((a, b) => a.b.sessionDate.localeCompare(b.b.sessionDate));

dire(`${lot.length} séance(s), ${lot.reduce((a, x) => a + x.isins.length, 0)} rangée(s) refusée(s)\n`);

for (const { b, isins } of lot) {
  dire(`${"=".repeat(78)}`);
  dire(`${b.sessionDate}  ·  BOC n° ${b.number}  ·  ${isins.length} rangée(s) : ${isins.join(", ")}`);

  let bytes;
  try {
    bytes = await readSource(b.fileKey);
  } catch (e) {
    dire(`   pièce injoignable : ${e.message}`);
    continue;
  }

  /* LA GRILLE D'ABORD. Elle sépare les cellules par leur abscisse là où
     l'aplatissement les colle, et c'est elle qui dira si la matière est
     présente ou si le PDF ne la porte pas. */
  let rangees = [];
  try {
    rangees = await rangeesDuPdf(bytes);
  } catch (e) {
    dire(`   grille illisible : ${e.message}`);
  }

  for (const isin of isins) {
    const trouvees = rangees.filter((r) => r.cellules.some((c) => c.texte.includes(isin)));
    dire(`\n   --- ${isin} ---`);
    if (!trouvees.length) {
      dire(`      la grille ne trouve aucune rangée portant cet ISIN.`);
    }
    for (const r of trouvees) {
      /* LES VOISINES À LA MÊME PAGE, et c'est ce qui manquait : filtrer sur
         « la rangée qui CONTIENT l'ISIN » suppose que la rangée est d'un
         seul tenant. Quand la mise en page la coupe en deux hauteurs, les
         nombres sont juste au-dessus ou juste en dessous, et le sondage
         concluait « la matière n'y est pas » alors qu'il ne l'avait pas
         cherchée. */
      const proches = rangees.filter((x) => x.page === r.page && Math.abs(x.y - r.y) <= 14).sort((a, b) => b.y - a.y);
      for (const v of proches) {
        const marque = v === r ? "ISIN" : "    ";
        dire(`      ${marque} page ${v.page}  y=${Math.round(v.y)}  ${v.cellules.length} cellule(s)`);
        dire(`           ${v.cellules.map((c) => `${Math.round(c.x)}:« ${c.texte} »`).join("  ")}`);
      }
    }
  }

  if (avecBrut) {
    /* LE TEXTE APLATI, pour voir ce que l'expression dense refuse. */
    const texte = await pdfText(bytes);
    const lignes = texte.split(/\r?\n/).map((l) => l.trim());
    for (const isin of isins) {
      const i = lignes.findIndex((l) => l.includes(isin));
      if (i < 0) continue;
      dire(`\n   --- ${isin}, texte aplati ---`);
      for (const l of lignes.slice(Math.max(0, i - 1), i + 3)) dire(`      « ${l.slice(0, 220)} »`);
    }
  }
  dire("");
}
