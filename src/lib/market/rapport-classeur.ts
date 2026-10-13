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

/**
 * LA COLONNE D'AUDIT VIENT AVANT LA PREUVE, ET APRÈS LE DIAGNOSTIC.
 *
 * Demandé par Georges le 13 octobre 2026 : toute correction doit se marquer
 * comme telle et détailler ce qui a été fait. « Corrigée et intégrée » dit
 * qu'on a touché à la donnée, pas ce qu'on a fait ni ce qui autorisait à le
 * faire. L'ordre des colonnes raconte donc la ligne dans l'ordre où on la
 * lit : quoi, qu'est-ce qui lui est arrivé, qu'avons-nous fait et pourquoi
 * c'était permis, puis la preuve brute.
 */
const COLONNES_LIGNES: Colonne[] = [
  { en: "Séance", clef: "seance", l: 12 },
  { en: "Instrument", clef: "objet", l: 32 },
  { en: "Devenir de la donnée", clef: "devenu", l: 22 },
  { en: "Cellule imprimée", clef: "imprime", l: 16 },
  { en: "Valeur retenue", clef: "retenu", l: 16 },
  { en: "Diagnostic", clef: "diagnostic", l: 62 },
  { en: "Correction appliquée ?", clef: "correctionAppliquee", l: 12 },
  { en: "Ce qui a été fait, et ce qui l'a validé", clef: "correction", l: 90 },
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
      const brut = (l as unknown as Record<string, unknown>)[c.clef as string];
      /* « Oui » et « Non » plutôt que VRAI/FAUX : la colonne se lit, elle ne
         se calcule pas, et un booléen d'Excel change de langue avec le
         tableur de celui qui l'ouvre. */
      const v = c.clef === "correctionAppliquee" ? (brut ? "Oui" : "Non") : ((brut as string) ?? "");
      const cell = r.getCell(j + 1);
      cell.value = v;
      cell.alignment = { vertical: "top", wrapText: c.l > 40 };
      cell.font = { size: 9 };
      if (c.clef === "imprime" && v) cell.font = { size: 9, bold: true, color: { argb: "FFA63D26" } };
      if (c.clef === "retenu" && v) cell.font = { size: 9, bold: true, color: { argb: "FF2B6A4B" } };
      if (c.clef === "correctionAppliquee") cell.font = { size: 9, bold: true, color: { argb: brut ? "FF2B6A4B" : "FF6B7280" } };
      if (c.clef === "correction") cell.font = { size: 8, color: { argb: "FF374151" } };
      if (c.clef === "message") cell.font = { size: 8, name: "Consolas", color: { argb: "FF4B5563" } };
    });
  });
  return f;
};

export async function classeurFournisseur(r: RapportFournisseur): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date(r.genere);
  const plage = `Du ${r.du} au ${r.au} · ${r.seances} séances · établi le ${r.genere.slice(0, 10)}`;

  /**
   * ---- 1 · ce qui est faux dans le document ----
   *
   * DEUX AXES, ET LES CONFONDRE A FAIT QUATRE DÉFAUTS. Cette feuille répond
   * à « À QUI LA CAUSE REVIENT » ; les feuilles 3 à 5 répondent à « CE QU'EST
   * DEVENUE LA DONNÉE ». Le second est une partition, le premier la coupe en
   * diagonale : une même ligne figure donc dans deux feuilles, et c'est
   * normal pourvu qu'on le DISE.
   *
   * Le sous-titre d'avant affirmait que ces lignes « ne peuvent pas être
   * corrigées », alors que la colonne voisine en déclarait soixante-cinq
   * « Corrigée et intégrée ». Un document qui se contredit sur deux colonnes
   * voisines ne se défend pas devant un tiers.
   */
  const dejaAilleurs = r.publication.filter((l) => l.sort === "corrigee" || l.sort === "ecartee" || l.sort === "perdue").length;
  feuilleDeLignes(
    wb,
    "1. Erreurs de publication",
    "Ce que le bulletin publie d'inexact",
    `${plage}. ${r.publication.length} ligne(s). Cette feuille classe par CAUSE, pas par devenir : elle réunit ce dont la responsabilité revient à la publication, que nous ayons pu le réparer ou non. Le bulletin porte lui-même une valeur ou un format qui ne peut pas être juste, et sa propre arithmétique le démontre. ${dejaAilleurs} de ces lignes reparaissent dans les feuilles 3 à 5, qui classent les MÊMES remarques selon ce qu'est devenue la donnée : les deux classements ne s'additionnent pas.`,
    r.publication,
  );

  /* ---- 2 · la synthèse ---- */
  const syn = wb.addWorksheet("2. Synthèse", { properties: { tabColor: { argb: NAVY } } });
  /* UN TABLEAU DE SYNTHÈSE SE VÉRIFIE, SINON IL NE SERT À RIEN. La colonne
     « Remarques » s'additionne et fait le total annoncé : on le dit, parce
     qu'un lecteur qui a trouvé une fois un total faux ne vérifie plus rien.
     La colonne « Séances » ne s'additionne PAS, une séance portant plusieurs
     familles : on le dit aussi, et on donne le vrai nombre. */
  titre(
    syn,
    "Synthèse par devenir de la donnée",
    `${plage}. ${r.remarques} remarques, sur ${r.seances - r.seancesSansRemarque} séances concernées et ${r.seancesSansRemarque} séances sans aucune remarque. La colonne « Remarques » s'additionne et doit faire ${r.remarques} dans chacun des deux tableaux ci-dessous. La colonne « Séances » ne s'additionne pas : une même séance porte souvent plusieurs familles.`,
    5,
  );
  enTetes(syn, [{ en: "Devenir de la donnée", l: 24 }, { en: "La donnée est-elle dans notre base ?", l: 30 }, { en: "Remarques", l: 11 }, { en: "Séances (non additionnable)", l: 14 }, { en: "Ce que cela signifie", l: 80 }], 4);
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

  /* LA LIGNE DE TOTAL EST LE CONTRÔLE, pas un ornement : elle permet de
     vérifier le tableau sans le recopier ailleurs. */
  const tSort = 5 + r.parSort.length;
  syn.getCell(tSort, 1).value = "Total";
  syn.getCell(tSort, 1).font = { bold: true, size: 9, color: { argb: NAVY } };
  syn.getCell(tSort, 3).value = r.parSort.reduce((a, s) => a + s.remarques, 0);
  syn.getCell(tSort, 3).font = { bold: true, size: 9 };
  syn.getCell(tSort, 4).value = r.seances - r.seancesSansRemarque;
  syn.getCell(tSort, 5).value = "Séances distinctes concernées, et non la somme de la colonne.";
  syn.getCell(tSort, 5).font = { size: 8, italic: true, color: { argb: "FF6B7280" } };

  const d = tSort + 2;
  syn.getCell(d, 1).value = "Détail par famille de remarque";
  syn.getCell(d, 1).font = { bold: true, size: 10, color: { argb: NAVY } };
  /* Les largeurs étaient recopiées du tableau du dessus, ce qui donnait une
     colonne « Séances » de quatre-vingts caractères. */
  enTetes(syn, [{ en: "Code", l: 8 }, { en: "Libellé", l: 44 }, { en: "Devenir", l: 24 }, { en: "Remarques", l: 11 }, { en: "Séances (non additionnable)", l: 14 }], d + 1);
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

  /* LE MÊME TOTAL, SUR LE SECOND TABLEAU, et c'est celui qui manquait : la
     somme des familles valait 504 pour 507 annoncées, parce que trois
     phrases tombaient dans un fourre-tout absent de la liste. Un tableau
     dont les lignes ne font pas le total apprend à ne plus additionner. */
  const tFam = d + 2 + r.parFamille.length;
  syn.getCell(tFam, 1).value = "Total";
  syn.getCell(tFam, 1).font = { bold: true, size: 9, color: { argb: NAVY } };
  syn.getCell(tFam, 4).value = r.parFamille.reduce((a, f) => a + f.remarques, 0);
  syn.getCell(tFam, 4).font = { bold: true, size: 9 };
  syn.getCell(tFam, 5).value = r.seances - r.seancesSansRemarque;
  syn.getCell(tFam, 3).value = "séances distinctes :";
  syn.getCell(tFam, 3).font = { size: 8, italic: true, color: { argb: "FF6B7280" } };

  /* ---- 3, 4, 5 ---- */
  /* LE TITRE DE LA FEUILLE RÉPÈTE LE MOT DE LA COLONNE, à la lettre. Trois
     feuilles sur trois disaient autrement ce que leur colonne « Devenir de
     la donnée » disait déjà : « Corrigé par nos soins » contre « Corrigée et
     intégrée ». Deux mots pour une chose font croire à deux choses. */
  const aussiEnF1 = (xs: LigneRapport[]) => xs.filter((l) => r.publication.includes(l)).length;
  const horsPublication = (xs: LigneRapport[]) =>
    `${xs.length} ligne(s), classée(s) ici par DEVENIR de la donnée. ${aussiEnF1(xs)} d'entre elles reparaissent en feuille 1, qui classe par cause : les deux feuilles ne s'additionnent pas.`;
  feuilleDeLignes(
    wb,
    "3. Corrigée et intégrée",
    "Ce qui a été réparé pour pouvoir être intégré",
    `${plage}. ${horsPublication(r.corrections)} Chaque ligne porte la cellule telle que le bulletin l imprime, la valeur retenue, et ce qui a autorisé la correction. Une cellule n est réparée que lorsque le document valide lui-même la correction, par exemple quand la variation imprimée s accorde avec les deux valeurs liquidatives. Cette feuille est l écart exact entre la base et la publication.`,
    r.corrections,
  );
  feuilleDeLignes(
    wb,
    "4. Écartée",
    "Ce qui a été refusé à l intégration",
    `${plage}. ${horsPublication(r.ecartees)} La valeur a été lue puis refusée parce qu'elle ne pouvait pas être vraie. Elle manque donc dans notre base, et c'est notre décision : la colonne « Ce qui a été fait » dit pourquoi aucune lecture de remplacement ne se démontre sur la pièce.`,
    r.ecartees,
  );
  feuilleDeLignes(
    wb,
    "5. Non lue",
    "Ce que le lecteur n a pas su lire",
    `${plage}. ${horsPublication(r.perdues)} La donnée est dans le bulletin et le lecteur ne l a pas extraite : il n y a rien à corriger, il y a quelque chose à lire. La cause est le plus souvent la couche texte du PDF, où les cellules se touchent sans séparateur. Le message porte le texte brut tel qu il arrive.`,
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
