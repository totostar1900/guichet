import "server-only";
import ExcelJS from "exceljs";
import { MESSAGES_MAX, type LigneDeTableau, type MessageDeStatut } from "@/lib/domain/statuts";

/**
 * LE TABLEAU DES MESSAGES DE LA PREMIÈRE PAGE, EN CLASSEUR (18 novembre 2026) : ce que le desk télécharge, complète, puis renvoie. Une feuille, quatre colonnes :
 * Identifiant (vide pour un nouveau message), Message, Langue (fr / en), Actif (oui / non). Le tableau REMPLACE la base : voir `planifierImport`.
 */
const ENTETES = ["Identifiant", "Message", "Langue", "Actif"] as const;

export async function classeurDesMessages(actifs: MessageDeStatut[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet("Messages", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: ENTETES[0], key: "id", width: 12 },
    { header: ENTETES[1], key: "texte", width: 80 },
    { header: ENTETES[2], key: "langue", width: 10 },
    { header: ENTETES[3], key: "actif", width: 10 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const m of actifs) {
    const ligne = ws.addRow({ id: m.id, texte: m.texte, langue: m.langue, actif: "oui" });
    ligne.getCell("texte").alignment = { wrapText: true, vertical: "top" };
  }
  const notes = wb.addWorksheet("Mode d'emploi");
  notes.getColumn(1).width = 110;
  for (const l of [
    "Chaque ouverture des statuts tire un message au hasard dans cette base, dans la langue du client.",
    "Ajoutez une ligne pour un nouveau message : laissez l'identifiant vide, écrivez le message, la langue (fr ou en) et « oui » dans Actif.",
    "Pour retirer un message : écrivez « non » dans Actif, ou supprimez sa ligne.",
    "Ce tableau REMPLACE la base : ce qui n'y est plus est retiré (le message reste au journal, avec la date et le nom de qui l'a retiré).",
    "Un message tient de 8 à 160 caractères. Ni conseil, ni promesse, ni urgence : « meilleur », « garanti », « dernière chance »… sont refusés.",
  ])
    notes.addRow([l]);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** Le texte d'une cellule, quelle que soit sa forme (texte, nombre, texte riche, formule). */
function texteDe(v: ExcelJS.CellValue | undefined): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return v.result == null ? "" : String(v.result);
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v);
}

/** Les lignes du tableau envoyé : la première feuille, repérée par ses en-têtes (dans n'importe quel ordre). Lève une phrase claire si le fichier n'est pas le bon. */
export async function lireClasseurDesMessages(octets: ArrayBuffer): Promise<LigneDeTableau[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(octets);
  } catch {
    throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx).");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Le classeur est vide.");
  const col: Partial<Record<(typeof ENTETES)[number], number>> = {};
  ws.getRow(1).eachCell((cell, n) => {
    const nom = texteDe(cell.value).trim().toLowerCase();
    for (const e of ENTETES) if (e.toLowerCase() === nom) col[e] = n;
  });
  if (!col.Message) throw new Error("Colonne « Message » introuvable : téléchargez le tableau et complétez-le.");
  const lignes: LigneDeTableau[] = [];
  const dernier = Math.min(ws.rowCount, MESSAGES_MAX + 50);
  for (let r = 2; r <= dernier; r++) {
    const row = ws.getRow(r);
    const lire = (e: (typeof ENTETES)[number]) => (col[e] ? texteDe(row.getCell(col[e]!).value) : "");
    lignes.push({ rang: r, id: lire("Identifiant"), texte: lire("Message"), langue: lire("Langue"), actif: lire("Actif") });
  }
  return lignes;
}
