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

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
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
const SAISIE = "FFE8F3EC";

/**
 * LES SIX RANGÉES DU 7 AOÛT 2024, RELEVÉES À LA MAIN PAR GEORGES.
 *
 * La grille n'en rendait que dix-huit cellules sur vingt-et-une, collées et
 * privées de leur dernière colonne : aucun alignement ne se démontrait, donc
 * la feuille les laissait vides plutôt que de les remplir de travers.
 *
 * LA SAISIE SE VÉRIFIE, ET ELLE TIENT. Sur les deux rangées qui ont traité,
 * la valeur transigée imprimée se reconstitue exactement :
 *
 *   EBD05  275 × (10 000 + 233,11) = 2 814 105
 *   EBD06  250 × (10 000 + 184,14) = 2 546 035
 *
 * Au franc près toutes les deux. Et ce contrôle apprend une convention que
 * nous ignorions : LA VALEUR TRANSIGÉE EST COUPON COURU COMPRIS. Une saisie
 * fausse ne tomberait pas juste sur deux lignes indépendantes.
 *
 * LA DERNIÈRE COLONNE EST ABSENTE DE LA PIÈCE, et c'est une lecture, pas un
 * oubli : la grille s'arrête après la variation, la copie de Georges aussi.
 * Deux lectures indépendantes qui s'arrêtent au même endroit disent que le
 * bulletin ne l'imprime pas ce jour-là. On écrit donc « absente de la pièce »
 * plutôt que de laisser une case vide, qui se lirait comme un travail inachevé.
 */
const ABSENTE = "absente de la pièce";
const SAISIE_DU_7_AOUT_2024 = {
  CG0000020220: ["BDEAC", "BDEAC 5,45% NET 2020 - 2027", "CG0000020220", "EBD01", "06/08/2024", "100,00", "8000", "8000", "268,03", "0", "795000", "0", "0", "0", "NC", "100,00", "100,00", "106,00", "94,00", "0,00%", ABSENTE],
  CG0000020261: ["BDEAC", "BDEAC 5,6% NET 2021-2028", "CG0000020261", "EBD02", "06/08/2024", "100,00", "10000", "10000", "379,45", "0", "500000", "0", "0", "0", "NC", "100,00", "100,00", "106,00", "94,00", "0,00%", ABSENTE],
  CG0000020329: ["BDEAC", "BDEAC 6% NET 2022-2029", "CG0000020329", "EBD03", "06/08/2024", "99,95", "9995", "10000", "370,49", "0", "500000", "0", "0", "0", "NC", "99,95", "99,95", "105,95", "93,95", "0,00%", ABSENTE],
  CG0000020469: ["BDEAC", "BDEAC 6,20% NET 2024-2031", "CG0000020469", "EBD04", "07/08/2024", "100,00", "10000", "10000", "242,9", "0", "0", "0", "0", "0", "NC", "100,00", "100,00", "106,00", "94,00", "0,00%", ABSENTE],
  CG0000020436: ["BDEAC", "BDEAC 5,95% NET 2024-2029", "CG0000020436", "EBD05", "07/08/2024", "100,00", "10000", "10000", "233,11", "275", "275", "275", "2 814 105", "1", "PEq", "100,00", "100,00", "106,00", "94,00", "0,00%", ABSENTE],
  CG0000020444: ["BDEAC", "BDEAC 4,70% NET 2024-2027", "CG0000020444", "EBD06", "07/08/2024", "100,00", "10000", "10000", "184,14", "250", "250", "250", "2 546 035", "1", "PEq", "100,00", "100,00", "106,00", "94,00", "0,00%", ABSENTE],
};

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

const enTete = ["Séance", "BOC n°", "Provenance", "Juste ?", "Correction éventuelle", ...COLONNES, "Contrôle arithmétique", "Cellules lues telles quelles"];
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
  f.getColumn(i + 1).width = i < 5 ? 15 : i >= enTete.length - 2 ? 56 : Math.min(26, Math.max(11, h.length / 2 + 6));
});
r4.height = 40;
f.views = [{ state: "frozen", xSplit: 5, ySplit: 4 }];
f.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: enTete.length } };

lignes.forEach((l, i) => {
  const row = f.getRow(5 + i);
  row.getCell(1).value = l.seance;
  row.getCell(2).value = l.numero;
  row.getCell(3).value = "";
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
  const saisie = !alignable ? SAISIE_DU_7_AOUT_2024[l.isin] : undefined;
  COLONNES.forEach((_, j) => {
    const cell = row.getCell(6 + j);
    const v = alignable ? l.cellules[j] : saisie?.[j];
    /* La saisie à la main se distingue de la lecture machine, sans quoi la
       feuille mélangerait deux provenances sous la même apparence. */
    if (saisie) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SAISIE } };
    if (v == null) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MANQUE } };
      cell.border = { bottom: { style: "thin", color: { argb: OR } }, top: { style: "thin", color: { argb: OR } } };
    } else {
      cell.value = v;
    }
    cell.font = { size: 9 };
    cell.alignment = { vertical: "top" };
  });
  row.getCell(3).value = saisie ? "saisie à la main" : alignable ? "lue par la grille" : "non alignable";
  row.getCell(3).font = { size: 8, color: { argb: saisie ? "FF2B6A4B" : "FF6B7280" } };

  /**
   * LE CONTRÔLE ARITHMÉTIQUE, QUAND LA RANGÉE A TRAITÉ.
   *
   * Trouvé sur la saisie de Georges, et c'est elle qui l'a enseigné : la
   * valeur transigée imprimée vaut le volume multiplié par le nominal PLUS
   * LE COUPON COURU. Deux rangées indépendantes tombent au franc près, ce
   * qu'une saisie fausse ne ferait pas.
   *
   * Une rangée qui n'a pas traité n'a rien à vérifier ici : on le dit plutôt
   * que de laisser un blanc, qui se lirait comme un contrôle oublié.
   */
  const nb = (s) => Number(String(s ?? "").replace(/[  ]/g, "").replace(",", "."));
  const valeurs = alignable ? l.cellules : saisie;
  const ctrl = row.getCell(6 + COLONNES.length);
  if (valeurs) {
    const volume = nb(valeurs[11]);
    const valeurTransigee = nb(valeurs[12]);
    const nominal = nb(valeurs[7]);
    const couru = nb(valeurs[8]);
    if (volume > 0 && valeurTransigee > 0) {
      const attendu = volume * (nominal + couru);
      const ecart = valeurTransigee - attendu;
      ctrl.value = `volume × (nominal + couru) = ${Math.round(attendu).toLocaleString("fr-FR")} · imprimé ${Math.round(valeurTransigee).toLocaleString("fr-FR")} · écart ${Math.round(ecart)}`;
      ctrl.font = { size: 8, bold: Math.abs(ecart) > 1, color: { argb: Math.abs(ecart) <= 1 ? "FF2B6A4B" : "FFA63D26" } };
    } else {
      ctrl.value = "rien n'a traité : rien à vérifier ici";
      ctrl.font = { size: 8, italic: true, color: { argb: "FF9CA3AF" } };
    }
    ctrl.alignment = { vertical: "top", wrapText: true };
  }

  /* Le texte brut en bout de ligne : il ne sert qu aux rangées non alignables,
     et il evite de rouvrir le PDF pour les remplir. */
  if (!alignable) {
    const aide = row.getCell(7 + COLONNES.length);
    aide.value = l.cellules.join("  |  ");
    aide.font = { size: 8, name: "Consolas", color: { argb: "FF4B5563" } };
    aide.alignment = { vertical: "top", wrapText: true };
  }
  for (const c of [1, 2, 3]) row.getCell(c).font = { size: 9, color: { argb: "FF6B7280" } };
});

const chemin = new URL("../cours-a-verifier.xlsx", import.meta.url);
fs.writeFileSync(chemin, await wb.xlsx.writeBuffer());
dire(`écrit : ${chemin}`);
