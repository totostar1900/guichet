import ExcelJS from "exceljs";
import type { LigneRapport, RapportFournisseur } from "./rapport-fournisseur";

/**
 * LE RAPPORT AU FOURNISSEUR, EN CLASSEUR.
 *
 * Le PDF est ce qu'on envoie, le classeur est ce qu'ils exploitent : on ne
 * demande pas à l'informaticien d'une bourse de recopier à la main
 * soixante-cinq références de cellules depuis un document imprimable.
 *
 * SIX FEUILLES, ET L'ORDRE EST UN ARGUMENT. On ouvre sur ce que le
 * document publie de faux, pas sur les manques du lecteur : une feuille
 * « erreurs de publication » en tête est lue, la même en sixième position ne
 * l'est pas. Les limites du lecteur viennent apres, et elles y
 * sont, parce qu un releve qui n accuse que l autre n est pas cru.
 */

const NAVY = "FF0B2545";
const OR = "FFB8860B";
const PAPIER = "FFF6F7F9";

type Colonne = { en: string; clef: keyof LigneRapport | string; l: number };

const COLONNES_LIGNES: Colonne[] = [
  { en: "Séance", clef: "seance", l: 12 },
  { en: "Instrument", clef: "objet", l: 32 },
  { en: "Devenir de la donnée", clef: "devenu", l: 22 },
  { en: "Cellule imprimée", clef: "imprime", l: 16 },
  { en: "Valeur retenue", clef: "retenu", l: 16 },
  { en: "Diagnostic", clef: "diagnostic", l: 62 },
  { en: "Message du lecteur (preuve)", clef: "message", l: 90 },
  { en: "Code interne", clef: "code", l: 7 },
];

const titre = (f: ExcelJS.Worksheet, texte: string, sous: string, nbColonnes: number) => {
  f.mergeCells(1, 1, 1, nbColonnes);
  const t = f.getCell(1, 1);
  t.value = texte;
  t.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  t.alignment = { vertical: "middle", indent: 1 };
  f.getRow(1).height = 26;

  f.mergeCells(2, 1, 2, nbColonnes);
  const s = f.getCell(2, 1);
  s.value = sous;
  s.font = { size: 9, italic: true, color: { argb: "FF4B5563" } };
  s.alignment = { vertical: "middle", indent: 1, wrapText: true };
  f.getRow(2).height = 24;
  f.getRow(3).height = 6;
};

const enTetes = (f: ExcelJS.Worksheet, cols: { en: string; l: number }[], rang: number) => {
  const r = f.getRow(rang);
  cols.forEach((c, i) => {
    const cell = r.getCell(i + 1);
    cell.value = c.en;
    cell.font = { bold: true, size: 9, color: { argb: NAVY } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF1F6" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: OR } } };
    f.getColumn(i + 1).width = c.l;
  });
  r.height = 22;
  f.views = [{ state: "frozen", ySplit: rang }];
  f.autoFilter = { from: { row: rang, column: 1 }, to: { row: rang, column: cols.length } };
};

const feuilleDeLignes = (wb: ExcelJS.Workbook, nom: string, titreTexte: string, sous: string, lignes: LigneRapport[]) => {
  const f = wb.addWorksheet(nom, { properties: { tabColor: { argb: OR } } });
  titre(f, titreTexte, sous, COLONNES_LIGNES.length);
  enTetes(f, COLONNES_LIGNES, 4);
  if (lignes.length === 0) {
    f.getCell(5, 1).value = "Aucune sur la période.";
    f.getCell(5, 1).font = { italic: true, color: { argb: "FF6B7280" } };
    return f;
  }
  lignes.forEach((l, i) => {
    const r = f.getRow(5 + i);
    COLONNES_LIGNES.forEach((c, j) => {
      const v = (l as unknown as Record<string, string>)[c.clef as string] ?? "";
      const cell = r.getCell(j + 1);
      cell.value = v;
      cell.alignment = { vertical: "top", wrapText: c.l > 40 };
      cell.font = { size: 9 };
      if (c.clef === "imprime" && v) cell.font = { size: 9, bold: true, color: { argb: "FFA63D26" } };
      if (c.clef === "retenu" && v) cell.font = { size: 9, bold: true, color: { argb: "FF2B6A4B" } };
      if (c.clef === "message") cell.font = { size: 8, name: "Consolas", color: { argb: "FF4B5563" } };
    });
  });
  return f;
};

export async function classeurFournisseur(r: RapportFournisseur): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date(r.genere);
  const plage = `Du ${r.du} au ${r.au} · ${r.seances} séances · établi le ${r.genere.slice(0, 10)}`;

  /* ---- 1 · ce qui est faux dans le document ---- */
  feuilleDeLignes(
    wb,
    "1. Erreurs de publication",
    "Ce que le bulletin publie d'inexact",
    `${plage}. Ces lignes ne relèvent pas d une difficulté de lecture : le bulletin porte lui-même une valeur ou un format qui ne peut pas être juste, et sa propre arithmétique le démontre. Ce sont les seules qui ne peuvent pas être corrigées, parce que les pourcentages imprimés sont calculés sur les cellules en cause.`,
    r.publication,
  );

  /* ---- 2 · la synthèse ---- */
  const syn = wb.addWorksheet("2. Synthèse", { properties: { tabColor: { argb: NAVY } } });
  titre(syn, "Synthèse par devenir de la donnée", `${plage}. ${r.remarques} remarques, ${r.seancesSansRemarque} séances sans aucune remarque.`, 5);
  enTetes(syn, [{ en: "Devenir de la donnée", l: 24 }, { en: "La donnée est-elle dans notre base ?", l: 30 }, { en: "Remarques", l: 11 }, { en: "Séances", l: 10 }, { en: "Ce que cela signifie", l: 80 }], 4);
  r.parSort.forEach((s, i) => {
    const row = syn.getRow(5 + i);
    row.getCell(1).value = s.libelle;
    row.getCell(1).font = { bold: true, size: 9 };
    row.getCell(2).value = s.ecrite ? "Oui, elle est enregistrée" : "Non, elle manque";
    row.getCell(2).font = { size: 9, color: { argb: s.ecrite ? "FF2B6A4B" : "FFA63D26" } };
    row.getCell(3).value = s.remarques;
    row.getCell(4).value = s.seances;
    row.getCell(5).value = s.dit;
    row.getCell(5).alignment = { wrapText: true, vertical: "top" };
    row.getCell(5).font = { size: 9 };
  });

  const d = 5 + r.parSort.length + 2;
  syn.getCell(d, 1).value = "Détail par famille de remarque";
  syn.getCell(d, 1).font = { bold: true, size: 10, color: { argb: NAVY } };
  enTetes(syn, [{ en: "Code", l: 24 }, { en: "Libellé", l: 30 }, { en: "Devenir", l: 11 }, { en: "Remarques", l: 10 }, { en: "Séances", l: 80 }], d + 1);
  syn.views = [{ state: "frozen", ySplit: 4 }];
  syn.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 5 } };
  r.parFamille.forEach((f, i) => {
    const row = syn.getRow(d + 2 + i);
    row.getCell(1).value = f.code;
    row.getCell(2).value = f.libelle;
    row.getCell(3).value = f.devenu;
    row.getCell(4).value = f.remarques;
    row.getCell(5).value = f.seances;
    for (let c = 1; c <= 5; c++) row.getCell(c).font = { size: 9 };
  });

  /* ---- 3, 4, 5 ---- */
  feuilleDeLignes(
    wb,
    "3. Corrigé par nos soins",
    "Ce qui a été réparé pour pouvoir être intégré",
    `${plage}. Chaque ligne porte la cellule telle que le bulletin l imprime et la valeur retenue. Une cellule n est réparée que lorsque le document valide lui-même la correction, par exemple quand la variation imprimée s accorde avec les deux valeurs liquidatives. Cette feuille est l écart exact entre la base et la publication.`,
    r.corrections,
  );
  feuilleDeLignes(
    wb,
    "4. Écarté",
    "Ce qui a été refusé à l intégration",
    `${plage}. La valeur a été lue puis refusée parce qu'elle ne pouvait pas être vraie. Elle manque donc dans notre base, et c'est notre décision, prise faute de pouvoir la vérifier.`,
    r.ecartees,
  );
  feuilleDeLignes(
    wb,
    "5. Non lu",
    "Ce que le lecteur n a pas su lire",
    `${plage}. La donnée est dans le bulletin et le lecteur ne l a pas extraite. La cause est le plus souvent la couche texte du PDF, où les cellules se touchent sans séparateur. Le message porte le texte brut tel qu il arrive : il permet de retrouver la rangée.`,
    r.perdues,
  );

  /* ---- 6 · la méthode ---- */
  const m = wb.addWorksheet("6. Méthode", { properties: { tabColor: { argb: "FF9CA3AF" } } });
  titre(m, "Comment ce rapport est produit", plage, 2);
  const dire: [string, string][] = [
    ["Source", "Les bulletins officiels de la cote tels que publiés, lus automatiquement à leur parution puis relus à chaque amélioration du lecteur."],
    ["Période", `Du ${r.du} au ${r.au}, soit ${r.seances} séances.`],
    ["Ce qui est corrigé", "Uniquement ce que le document valide lui-même. Exemple : une date restée en numéro de série n'est retenue que si la variation imprimée sur la rangée s'accorde avec les deux valeurs liquidatives, au centième de point près."],
    ["Ce qui n est jamais corrigé", "Une valeur qu il faudrait deviner à partir des lignes voisines. Une donnée manquante vaut mieux qu une donnée inventée."],
    ["Traçabilité", "Toute correction conserve la valeur d'origine, visible en colonne « Cellule imprimée ». Aucune retouche n'est irréversible."],
    ["Ce qui lèverait ces points", "Pour la feuille 1, une correction à la source. Pour la feuille 5, un export dont la couche texte sépare les cellules, ou un fichier de données déposé à côté du PDF."],
      ];
  dire.forEach(([k, v], i) => {
    const row = m.getRow(5 + i * 2);
    row.getCell(1).value = k;
    row.getCell(1).font = { bold: true, size: 9, color: { argb: NAVY } };
    row.getCell(1).alignment = { vertical: "top" };
    row.getCell(2).value = v;
    row.getCell(2).font = { size: 9 };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    row.height = 34;
  });
  m.getColumn(1).width = 28;
  m.getColumn(2).width = 110;
  m.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  m.getCell(3, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPIER } };

  return new Uint8Array((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}
