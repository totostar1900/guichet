/**
 * LA FEUILLE DES CINQUANTE RANGÉES REFUSÉES, PRÊTE À ÊTRE VÉRIFIÉE.
 *
 * Georges : « dis-moi exactement ce que tu veux que je copie ». La réponse
 * honnête, après extraction, est : presque rien. La grille lit déjà
 * quarante-quatre des cinquante rangées au complet ; c'est le constructeur de
 * rangée qui ne les assemble pas. Demander de retaper six cents cellules
 * qu'on sait déjà lire serait du travail volé.
 *
 * LA FEUILLE DEMANDE DONC DEUX CHOSES, ET DANS CET ORDRE D'IMPORTANCE :
 *
 *   1. SIX VALEURS réellement absentes : la colonne « Cours de référence de
 *      la séance suivante » sur les six rangées du 7 août 2024, que la grille
 *      ne rend pas.
 *   2. UN COUP D'ŒIL sur les quarante-quatre autres, pré-remplies telles que
 *      nous les lisons. Une colonne « juste ? » à cocher, et une colonne pour
 *      corriger. C'est un échantillon de contrôle : il dit si notre lecture
 *      vaut une lecture humaine, ce qu'aucun test ne peut établir seul.
 *
 * Les en-têtes reprennent ceux du bulletin à la lettre, relevés sur la pièce :
 * une feuille dont les colonnes ne portent pas les mots du document oblige à
 * deviner la correspondance, et c'est là que les erreurs entrent.
 *
 *   npx tsx --conditions=react-server scripts/feuille-cours-a-verifier.mjs
 */
import fs from "node:fs";

const env = fs.readFileSync("C:/dev/guichet/.env.local", "utf8");
for (const l of env.split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const ExcelJS = (await import("exceljs")).default;
const { rangeesDuPdf } = await import("../src/lib/market/boc-geometrie.ts");
const { readSource } = await import("../src/lib/intake/storage.ts");
const { repo } = await import("../src/lib/data/index.ts");

const dire = (s) => fs.writeSync(1, `${s}\n`);
const PERDUE = /^Obligation ([A-Z]{2}\d{10}) : ligne de cours non reconnue/;

/**
 * LES COLONNES, DANS L'ORDRE OÙ LE BULLETIN LES IMPRIME.
 *
 * Relevées sur la pièce du 3 mars 2023, en recomposant l'en-tête sur quatre
 * hauteurs par les abscisses. Les quatre premières sont l'identité du titre,
 * que nous connaissons déjà et qui est pré-remplie.
 */
const COLONNES = [
  "Désignation de l'émetteur",
  "Désignation du titre",
  "Code ISIN",
  "Mnemo",
  "Cours précédent · Date",
  "Cours précédent · Cours en %",
  "Cours précédent · Cours en FCFA",
  "Nominal (j+3)",
  "Coupon couru (j+3)",
  "Volume demandé",
  "Volume offert",
  "Volume transigé",
  "Valeur transigée",
  "Nombre de transactions",
  "Statut",
  "Cours du jour · Ouver.",
  "Cours du jour · Clôt.",
  "Cours du jour · Haut",
  "Cours du jour · Bas",
  "Variation",
  "Cours de référence de la séance suivante en FCFA",
];

const NAVY = "FF0B2545";
const OR = "FFB8860B";
const MANQUE = "FFFFF4CE";

/** Les cellules d'une rangée refusée, identité et nombres réunis. */
function rangeeComplete(rangees, isin) {
  const porteur = rangees.find((r) => r.cellules.some((c) => c.texte.includes(isin)));
  if (!porteur) return undefined;
  /* LA RANGÉE PEUT ÊTRE COUPÉE EN DEUX HAUTEURS, à trois points d'écart là
     où le regroupement en tolère deux et demi. On réunit donc les voisines
     de la même page, triées par abscisse : c'est précisément ce que le
     constructeur ne fait pas, et toute la feuille en dépend. */
  const proches = rangees.filter((r) => r.page === porteur.page && Math.abs(r.y - porteur.y) <= 6);
  const cellules = proches.flatMap((r) => r.cellules).sort((a, b) => a.x - b.x);
  return { page: porteur.page, y: porteur.y, cellules };
}

const bulletins = await repo().listBulletins(3000);
const lot = bulletins
  .map((b) => ({ b, isins: [...new Set((b.warnings ?? []).map((w) => w.match(PERDUE)?.[1]).filter(Boolean))] }))
  .filter((x) => x.isins.length && x.b.fileKey)
  .sort((a, b) => a.b.sessionDate.localeCompare(b.b.sessionDate));

const lignes = [];
for (const { b, isins } of lot) {
  let rangees;
  try {
    rangees = await rangeesDuPdf(await readSource(b.fileKey));
  } catch (e) {
    dire(`${b.sessionDate} : pièce illisible (${e.message})`);
    continue;
  }
  for (const isin of isins) {
    const r = rangeeComplete(rangees, isin);
    lignes.push({ seance: b.sessionDate, numero: b.number, isin, cellules: r?.cellules.map((c) => c.texte) ?? [] });
  }
  dire(`${b.sessionDate}  ${isins.length} rangée(s)`);
}

dire(`\n${lignes.length} rangée(s) au total`);
const complètes = lignes.filter((l) => l.cellules.length >= COLONNES.length).length;
dire(`   ${complètes} rangée(s) dont la grille rend les ${COLONNES.length} cellules`);
dire(`   ${lignes.length - complètes} rangée(s) incomplètes, à compléter à la main\n`);

const wb = new ExcelJS.Workbook();
const f = wb.addWorksheet("Cours à vérifier", { properties: { tabColor: { argb: OR } } });

const enTete = ["Séance", "BOC n°", "Cellules lues", "Juste ?", "Correction éventuelle", ...COLONNES, "Cellules lues telles quelles (aide à la saisie)"];
f.mergeCells(1, 1, 1, enTete.length);
const t = f.getCell(1, 1);
t.value = "Les 50 rangées de cours que le lecteur refuse, telles que la grille les voit";
t.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
f.getRow(1).height = 26;

f.mergeCells(2, 1, 2, enTete.length);
const s = f.getCell(2, 1);
s.value =
  "Les colonnes reprennent les en-têtes du bulletin à la lettre. Les cellules JAUNES sont celles que la grille ne rend pas : ce sont les seules à taper. Pour les autres, la valeur est pré-remplie telle que nous la lisons : il suffit d'un coup d'œil, « non » en colonne « Juste ? » et la bonne valeur à côté. Ne rien changer aux colonnes Séance, BOC n° et Code ISIN : elles servent de clef.";
s.font = { size: 9, italic: true, color: { argb: "FF4B5563" } };
s.alignment = { wrapText: true, vertical: "middle", indent: 1 };
f.getRow(2).height = 46;

const r4 = f.getRow(4);
enTete.forEach((h, i) => {
  const c = r4.getCell(i + 1);
  c.value = h;
  c.font = { bold: true, size: 8, color: { argb: NAVY } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF1F6" } };
  c.alignment = { vertical: "middle", wrapText: true };
  c.border = { bottom: { style: "thin", color: { argb: OR } } };
  f.getColumn(i + 1).width = i < 5 ? 14 : i === enTete.length - 1 ? 70 : Math.min(26, Math.max(11, h.length / 2 + 6));
});
r4.height = 40;
f.views = [{ state: "frozen", xSplit: 5, ySplit: 4 }];
f.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: enTete.length } };

lignes.forEach((l, i) => {
  const row = f.getRow(5 + i);
  row.getCell(1).value = l.seance;
  row.getCell(2).value = l.numero;
  row.getCell(3).value = l.cellules.length;
  row.getCell(4).value = "";
  row.getCell(5).value = "";
  /* ON NE PLACE QUE CE QU'ON SAIT PLACER. Le placement par position suppose
     que la rangée a bien ses vingt-et-une cellules ; une rangée de dix-huit
     décale tout d'un cran et remplit les colonnes de valeurs fausses, ce qui
     est pire que de les laisser vides. Mesuré sur les six rangées du 7 août
     2024 : le code ISIN y recevait « CG0000020220 EBD01 » et le mnémonique
     une date. Sous le compte attendu, la rangée est donc entièrement à
     remplir, et son texte brut est donné à côté pour que ce soit rapide. */
  const alignable = l.cellules.length === COLONNES.length;
  COLONNES.forEach((_, j) => {
    const cell = row.getCell(6 + j);
    const v = alignable ? l.cellules[j] : undefined;
    if (v == null) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MANQUE } };
      cell.border = { bottom: { style: "thin", color: { argb: OR } }, top: { style: "thin", color: { argb: OR } } };
    } else {
      cell.value = v;
    }
    cell.font = { size: 9 };
    cell.alignment = { vertical: "top" };
  });
  /* Le texte brut en bout de ligne : il ne sert qu aux rangées non alignables,
     et il evite de rouvrir le PDF pour les remplir. */
  if (!alignable) {
    const aide = row.getCell(6 + COLONNES.length);
    aide.value = l.cellules.join("  |  ");
    aide.font = { size: 8, name: "Consolas", color: { argb: "FF4B5563" } };
    aide.alignment = { vertical: "top", wrapText: true };
  }
  for (const c of [1, 2, 3]) row.getCell(c).font = { size: 9, color: { argb: "FF6B7280" } };
});

const chemin = "C:/dev/guichet/cours-a-verifier.xlsx";
fs.writeFileSync(chemin, await wb.xlsx.writeBuffer());
dire(`écrit : ${chemin}`);
