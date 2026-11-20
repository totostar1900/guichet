import "server-only";
import ExcelJS from "exceljs";
import { COLONNES, NOM_DE_FEUILLE, NOM_OFFICIEL, PAYS, estUnExemple, estVide, indexDesColonnes, type ColonneDuModele, type Feuille, type LigneBrute } from "@/lib/domain/chargement";

/**
 * LE MODÈLE DE CHARGEMENT, FABRIQUÉ PAR LE DESK, ET SA LECTURE (20 novembre 2026).
 *
 * Le modèle n'est pas un fichier rangé quelque part : il se fabrique à chaque téléchargement, avec les listes du jour (les émetteurs du registre). Un émetteur ajouté au Desk apparaît dans la liste déroulante du modèle suivant ; un modèle ancien reste lisible, ses en-têtes étant ceux de `COLONNES` (une seule définition, pour la fabrication ET pour la lecture).
 *
 * LES COLONNES VERTES SONT DES FORMULES (nom du pays, émetteur du Trésor, nominal retenu, couverture, contrôle) : la personne n'y écrit pas, la lecture les ignore. LES LISTES DÉROULANTES, LES CONTRÔLES ET LES CASES ROUGES existent pour empêcher la faute de frappe avant qu'elle parte, pas pour la découvrir au chargement.
 */

const LIGNES = 300;
const ORANGE = "FFB45F06";
const GRIS_BLEU = "FF5B7089";
const VERT = "FF2F6F4F";
const VERT_CLAIR = "FFEAF5EE";
const ROUGE_CLAIR = "FFFBD5D5";
const GRIS_CLAIR = "FFD9DCE1";

const lettre = (n: number): string => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

const plein = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb }, bgColor: { argb } });
const FORMAT: Record<string, string | undefined> = { int: "#,##0", dec: "0.00##", date: "yyyy-mm-dd", heure: "hh:mm" };

interface Automatique {
  libelle: string;
  largeur: number;
  formule: (l: (id: string) => string, r: number) => string;
  format?: string;
}

const MANQUES = (champs: [string, string][], l: (id: string) => string, r: number) => champs.map(([id, mot]) => `IF(${l(id)}${r}="","${mot} ","")`).join("&");

const AUTOMATIQUES: Record<Feuille, Automatique[]> = {
  tresor: [
    { libelle: "Nom du pays (automatique)", largeur: 30, formule: (l, r) => `IFERROR(VLOOKUP(${l("pays")}${r},Listes!$A$2:$C$7,2,FALSE),"")` },
    { libelle: "Émetteur (automatique)", largeur: 44, formule: (l, r) => `IFERROR(VLOOKUP(${l("pays")}${r},Listes!$A$2:$C$7,3,FALSE),"")` },
    { libelle: "Nominal retenu (automatique)", largeur: 14, format: "#,##0", formule: (l, r) => `IF(${l("nominal")}${r}<>"",${l("nominal")}${r},IF(${l("type")}${r}="OTA",10000,IF(OR(${l("type")}${r}="BTA",${l("type")}${r}="Rachat"),1000000,"")))` },
    {
      libelle: "Contrôle (automatique)",
      largeur: 40,
      formule: (l, r) =>
        `IF(COUNTA(A${r}:${l("piece")}${r})=0,"",IF(AND(${l("type")}${r}<>"",${l("pays")}${r}<>"",${l("code")}${r}<>"",${l("echeance")}${r}<>"",${l("limite")}${r}<>"",${l("reglement")}${r}<>"",${l("piece")}${r}<>"",OR(${l("type")}${r}<>"OTA",${l("coupon")}${r}<>"")),"✔ complet","À compléter : "&TRIM(${MANQUES([["type", "type"], ["pays", "pays"], ["code", "code"], ["echeance", "échéance"], ["limite", "date-limite"], ["reglement", "règlement"], ["piece", "pièce"]], l, r)}&IF(AND(${l("type")}${r}="OTA",${l("coupon")}${r}=""),"coupon ",""))))`,
    },
  ],
  ape: [
    { libelle: "Nom du pays (automatique)", largeur: 30, formule: (l, r) => `IFERROR(VLOOKUP(${l("pays")}${r},Listes!$A$2:$C$7,2,FALSE),"")` },
    {
      libelle: "Contrôle (automatique)",
      largeur: 40,
      formule: (l, r) =>
        `IF(COUNTA(A${r}:${l("piece")}${r})=0,"",IF(AND(${["emetteur", "pays", "code", "coupon", "echeance", "ouverture", "limite", "reglement", "nominal", "piece"].map((id) => `${l(id)}${r}<>""`).join(",")}),"✔ complet","À compléter : "&TRIM(${MANQUES([["emetteur", "émetteur"], ["pays", "pays"], ["code", "code"], ["coupon", "coupon"], ["echeance", "échéance"], ["ouverture", "ouverture"], ["limite", "date-limite"], ["reglement", "règlement"], ["nominal", "nominal"], ["piece", "pièce"]], l, r)})))`,
    },
  ],
  ipo: [
    { libelle: "Nom du pays (automatique)", largeur: 30, formule: (l, r) => `IFERROR(VLOOKUP(${l("pays")}${r},Listes!$A$2:$C$7,2,FALSE),"")` },
    { libelle: "Montant de l'opération (automatique)", largeur: 22, format: "#,##0", formule: (l, r) => `IF(AND(${l("prix")}${r}<>"",${l("offertes")}${r}<>""),${l("prix")}${r}*${l("offertes")}${r},"")` },
    {
      libelle: "Contrôle (automatique)",
      largeur: 40,
      formule: (l, r) =>
        `IF(COUNTA(A${r}:${l("piece")}${r})=0,"",IF(AND(${["emetteur", "pays", "code", "prix", "ouverture", "limite", "reglement", "piece"].map((id) => `${l(id)}${r}<>""`).join(",")}),"✔ complet","À compléter : "&TRIM(${MANQUES([["emetteur", "société"], ["pays", "pays"], ["code", "code"], ["prix", "prix"], ["ouverture", "ouverture"], ["limite", "clôture"], ["reglement", "règlement"], ["piece", "pièce"]], l, r)})))`,
    },
  ],
  resultats: [
    { libelle: "Couverture % (automatique)", largeur: 14, format: "0.00", formule: (l, r) => `IF(AND(ISNUMBER(${l("annonce")}${r}),ISNUMBER(${l("soumissions")}${r}),${l("annonce")}${r}>0),ROUND(${l("soumissions")}${r}/${l("annonce")}${r}*100,2),"")` },
    {
      libelle: "Contrôle (automatique)",
      largeur: 38,
      formule: (l, r) =>
        `IF(COUNTA(A${r}:${l("piece")}${r})=0,"",IF(AND(${["seance", "pays", "instrument", "code", "soumissions", "servi", "piece"].map((id) => `${l(id)}${r}<>""`).join(",")}),IF(AND(ISNUMBER(${l("soumissions")}${r}),ISNUMBER(${l("servi")}${r}),${l("servi")}${r}>${l("soumissions")}${r}),"⚠ servi > soumissions","✔ complet"),"À compléter : "&TRIM(${MANQUES([["seance", "date"], ["pays", "pays"], ["instrument", "instrument"], ["code", "code"], ["soumissions", "soumissions"], ["servi", "servi"], ["piece", "pièce"]], l, r)})))`,
    },
  ],
};

/** Les lignes d'exemple : celles du communiqué du Gabon du 18 novembre 2026 ; les autres sont inventées, et le disent. */
const EXEMPLES: Record<Feuille, Record<string, ExcelJS.CellValue>> = {
  tresor: { type: "BTA", pays: "Gabon", code: "GA1200002929", echeance: new Date(Date.UTC(2027, 4, 21)), limite: new Date(Date.UTC(2026, 10, 18)), heure: 9 / 24, reglement: new Date(Date.UTC(2026, 10, 20)), resultats: new Date(Date.UTC(2026, 10, 18)), volume: 15000, piece: "EXEMPLE — Communiqué d'annonce BTA26S 181126.PDF (à effacer)" },
  ape: { emetteur: "Société Nationale des Pétroles du Congo", pays: "Congo", code: "XX0000000000", coupon: 6.5, echeance: new Date(Date.UTC(2031, 11, 15)), ouverture: new Date(Date.UTC(2026, 11, 1)), limite: new Date(Date.UTC(2026, 11, 18)), heure: 15 / 24, reglement: new Date(Date.UTC(2026, 11, 22)), volume: 30000, nominal: 10000, piece: "EXEMPLE — chiffres inventés, à effacer" },
  ipo: { emetteur: "BGFI Holding Corporation S.A.", pays: "Gabon", code: "XX0000000001", prix: 5000, minimum: 10, offertes: 2000000, ouverture: new Date(Date.UTC(2026, 11, 1)), limite: new Date(Date.UTC(2026, 11, 18)), heure: 15 / 24, reglement: new Date(Date.UTC(2026, 11, 28)), piece: "EXEMPLE — chiffres inventés, à effacer" },
  resultats: { seance: new Date(Date.UTC(2026, 10, 18)), pays: "Gabon", instrument: "BTA", code: "XX0000000002", annonce: 15000, soumissions: 22500, servi: 15000, soumissionnaires: 9, tauxMin: 5.1, tauxMax: 5.9, tauxLimite: 5.8, tauxMoyen: 5.5, piece: "EXEMPLE — chiffres inventés, à effacer" },
};

const OBLIGATOIRES: Record<Feuille, string[]> = {
  tresor: ["type", "pays", "code", "echeance", "limite", "reglement", "piece"],
  ape: ["emetteur", "pays", "code", "coupon", "echeance", "ouverture", "limite", "reglement", "nominal", "piece"],
  ipo: ["emetteur", "pays", "code", "prix", "ouverture", "limite", "reglement", "piece"],
  resultats: ["seance", "pays", "instrument", "code", "soumissions", "servi", "piece"],
};

function feuilleDeLignes(wb: ExcelJS.Workbook, feuille: Feuille, nbEmetteurs: number): void {
  const cols: ColonneDuModele[] = COLONNES[feuille];
  const autos = AUTOMATIQUES[feuille];
  const ws = wb.addWorksheet(NOM_DE_FEUILLE[feuille], { views: [{ state: "frozen", xSplit: 2, ySplit: 1 }] });
  const lettreDe = (id: string) => lettre(cols.findIndex((c) => c.id === id) + 1);
  const total = cols.length + autos.length;

  for (let j = 0; j < total; j++) {
    const col = ws.getColumn(j + 1);
    const spec = cols[j];
    const auto = autos[j - cols.length];
    col.width = spec ? (spec.largeur ?? 16) : auto.largeur;
    const cell = ws.getCell(1, j + 1);
    cell.value = spec ? `${spec.libelle}${spec.statut === "obl" ? " *" : ""}` : auto.libelle;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = plein(spec ? (spec.statut === "obl" ? ORANGE : GRIS_BLEU) : VERT);
    cell.alignment = { wrapText: true, vertical: "middle" };
    if (spec?.aide) cell.note = spec.aide;
  }
  ws.getRow(1).height = 52;

  for (let r = 2; r <= LIGNES + 1; r++) {
    cols.forEach((c, j) => {
      const f = FORMAT[c.format];
      if (f) ws.getCell(r, j + 1).numFmt = f;
    });
    autos.forEach((a, k) => {
      const cell = ws.getCell(r, cols.length + k + 1);
      cell.value = { formula: a.formule(lettreDe, r) };
      cell.fill = plein(VERT_CLAIR);
      if (a.format) cell.numFmt = a.format;
    });
  }

  // La ligne d'exemple, grise, à effacer.
  const ex = EXEMPLES[feuille];
  cols.forEach((c, j) => {
    const v = ex[c.id];
    if (v === undefined) return;
    const cell = ws.getCell(2, j + 1);
    cell.value = v;
    cell.font = { italic: true, color: { argb: "FF6B7280" } };
  });

  // Les listes, les formats de saisie : la faute de frappe est refusée avant de partir.
  const plage = (id: string) => `${lettreDe(id)}2:${lettreDe(id)}${LIGNES + 1}`;
  const surColonne = (id: string, v: ExcelJS.DataValidation) => {
    for (let r = 2; r <= LIGNES + 1; r++) ws.getCell(`${lettreDe(id)}${r}`).dataValidation = v;
  };
  const liste = (id: string, source: string, message = "Choisir une valeur de la liste.") => surColonne(id, { type: "list", allowBlank: true, formulae: [source], showErrorMessage: true, errorTitle: "Valeur non reconnue", error: message });
  if (cols.some((c) => c.id === "type")) liste("type", "Listes!$E$2:$E$4");
  if (cols.some((c) => c.id === "instrument")) liste("instrument", "Listes!$G$2:$G$3");
  if (cols.some((c) => c.id === "operation")) liste("operation", "Listes!$F$2:$F$3");
  if (cols.some((c) => c.id === "emetteur")) liste("emetteur", `Listes!$H$2:$H$${nbEmetteurs + 41}`);
  liste("pays", "Listes!$A$2:$A$7");
  for (let r = 2; r <= LIGNES + 1; r++) {
    const a = `${lettreDe("code")}${r}`;
    ws.getCell(a).dataValidation = { type: "custom", allowBlank: true, formulae: [`OR(${a}="",AND(LEN(${a})=12,ISERROR(FIND(" ",${a}))))`], showErrorMessage: true, errorTitle: "Code d'émission", error: "12 caractères, sans espace (ex. GA1200002929)." };
  }
  for (const c of cols) {
    if (c.format === "date") surColonne(c.id, { type: "date", operator: "greaterThanOrEqual", allowBlank: true, formulae: [new Date(Date.UTC(2018, 0, 1))], showErrorMessage: true, errorTitle: "Date", error: "Une date (AAAA-MM-JJ), à partir de 2018." });
    if (c.format === "heure") surColonne(c.id, { type: "decimal", operator: "between", allowBlank: true, formulae: [0, 0.99999], showErrorMessage: true, errorTitle: "Heure", error: "Une heure hh:mm (ex. 09:00)." });
  }
  const decimal = (id: string, lo: number, hi: number, message: string) => cols.some((c) => c.id === id) && surColonne(id, { type: "decimal", operator: "between", allowBlank: true, formulae: [lo, hi], showErrorMessage: true, errorTitle: "Valeur", error: message });
  decimal("coupon", 1, 20, "Un coupon se saisit en % entre 1 et 20 (6,5 = 6,5 %).");
  decimal("volume", 100, 1_000_000, "Volume en MILLIONS de FCFA (ex. 15000). Si vous avez saisi des francs, divisez par un million.");
  decimal("nominal", 1000, 100_000_000, "Nominal en francs (ex. 1000000).");
  for (const id of ["annonce", "soumissions", "servi"]) decimal(id, 0, 10_000_000, "Montant en MILLIONS de FCFA.");

  // Cases obligatoires : rouges dès que la ligne est commencée ; cases sans objet : grises.
  const fin = lettreDe("piece");
  for (const id of OBLIGATOIRES[feuille]) {
    ws.addConditionalFormatting({ ref: plage(id), rules: [{ type: "expression", priority: 1, formulae: [`AND(COUNTA($A2:$${fin}2)>0,${lettreDe(id)}2="")`], style: { fill: plein(ROUGE_CLAIR) } }] });
  }
  if (feuille === "tresor") {
    ws.addConditionalFormatting({ ref: plage("coupon"), rules: [{ type: "expression", priority: 2, formulae: [`AND($${lettreDe("type")}2="OTA",COUNTA($A2:$${fin}2)>0,${lettreDe("coupon")}2="")`], style: { fill: plein(ROUGE_CLAIR) } }, { type: "expression", priority: 3, formulae: [`OR($${lettreDe("type")}2="BTA",$${lettreDe("type")}2="Rachat")`], style: { fill: plein(GRIS_CLAIR) } }] });
  }
  if (feuille === "resultats") {
    const i = lettreDe("instrument");
    ws.addConditionalFormatting({ ref: `${lettreDe("prixMin")}2:${lettreDe("prixMoyen")}${LIGNES + 1}`, rules: [{ type: "expression", priority: 2, formulae: [`$${i}2="BTA"`], style: { fill: plein(GRIS_CLAIR) } }] });
    ws.addConditionalFormatting({ ref: `${lettreDe("tauxMin")}2:${lettreDe("tauxMoyen")}${LIGNES + 1}`, rules: [{ type: "expression", priority: 2, formulae: [`$${i}2="OTA"`], style: { fill: plein(GRIS_CLAIR) } }] });
    ws.addConditionalFormatting({ ref: plage("servi"), rules: [{ type: "expression", priority: 3, formulae: [`AND(ISNUMBER($${lettreDe("soumissions")}2),ISNUMBER($${lettreDe("servi")}2),$${lettreDe("servi")}2>$${lettreDe("soumissions")}2)`], style: { fill: plein(ROUGE_CLAIR) } }] });
  }
}

const MODE_D_EMPLOI: [string, boolean][] = [
  ["Chargement de lignes et de résultats d'adjudication — modèle du Desk", true],
  ["Trois chemins créent une ligne au Desk : le scan des sites, le chargement manuel d'un PDF, et ce classeur. Tous aboutissent à « À valider » : rien n'est publié sans qu'une personne ait relu et cliqué sur « Publier ».", false],
  ["", false],
  ["Les feuilles", true],
  ["« Trésor (OTA·BTA·Rachat) » : une ligne par émission du Trésor. « Emprunts (APE) » : emprunts obligataires d'une société. « Introductions (IPO) » : introductions en bourse. « Résultats » : une ligne par séance et par code d'émission.", false],
  ["Les actions cotées, les obligations cotées et les fonds n'ont pas de feuille : ils viennent du bulletin de la BVMAC, automatiquement.", false],
  ["", false],
  ["Ce qu'il n'y a plus à écrire (le Desk le déduit)", true],
  ["• Le nom du pays et l'émetteur d'un titre du Trésor : déduits du pays (« Trésor public de la République gabonaise »). Plus aucune orthographe à choisir.", false],
  ["• Le titre de la fiche (« BTA 26 semaines · 21 mai 2027 », « OTA 6,00 % · 31 mars 2028 ») : composé à partir du type, de la durée, du coupon et de l'échéance.", false],
  ["• La référence du communiqué : retirée, le Desk ne s'en sert pas.", false],
  ["• La durée d'un BTA, le dernier coupon versé d'un abondement, le texte « Volume » de la fiche, la description client : calculés.", false],
  ["• Le nominal (BTA 1 000 000 · OTA 10 000), l'heure limite (12:00) et la date de l'annonce des résultats : valeurs d'usage si la case reste vide.", false],
  ["• L'opération (nouvelle ligne ou abondement) : « abondement » si le code d'émission est déjà connu.", false],
  ["• Dans « Résultats » : la durée, l'échéance et le coupon (repris de la ligne par le code) et la couverture (calculée).", false],
  ["", false],
  ["Comment remplir", true],
  ["• En-tête ORANGE avec étoile = obligatoire. Bleu-gris = facultatif. VERT = automatique (formule : ne pas écrire dedans).", false],
  ["• Une case obligatoire vide devient ROUGE dès que la ligne est commencée. La colonne « Contrôle » dit « ✔ complet » ou ce qui manque.", false],
  ["• Les listes déroulantes interdisent la faute de frappe : pays, type, instrument, émetteur. Un code d'émission fait 12 caractères sans espace ; une date est une vraie date (AAAA-MM-JJ) ; une heure est hh:mm.", false],
  ["• Montants en MILLIONS de FCFA, tels qu'imprimés (« 15 000 »), jamais convertis en francs. Nominal et prix par action en francs. Taux, coupons et prix en %.", false],
  ["• Vide = inconnu, jamais zéro. Ne rien déduire : ce que le document ne donne pas reste vide.", false],
  ["• Un BTA se lit en taux, une OTA en prix et en coupon : les colonnes qui ne concernent pas l'instrument sont grisées, ce n'est pas un manque.", false],
  ["• « Pièce ou source » est obligatoire : le nom du PDF ou l'adresse de la page. Sans pièce, la ligne arrive « à compléter » et non « à valider ».", false],
  ["• Ligne grise « EXEMPLE » : à effacer avant de charger (elle est de toute façon ignorée). 300 lignes par feuille.", false],
  ["• Un émetteur absent de la liste s'ajoute dans « Listes » (colonne H), une fois : il apparaît alors dans toutes les feuilles.", false],
  ["", false],
  ["Ce que fait le chargement", true],
  ["Desk › À valider › « Charger un classeur » : le Desk lit le fichier, montre un aperçu (lignes à charger, doublons, erreurs) et n'écrit rien avant « Charger ». Les lignes du Trésor, des emprunts et des IPO arrivent dans « À valider ». Les résultats ne remplissent que ce qui est vide dans une séance connue (ils n'écrasent jamais un chiffre existant) et restent à confirmer.", false],
];

/** Le modèle, avec les listes du jour. `emetteurs` : les noms du registre (sociétés cotées, émetteurs d'obligations, émetteurs des lignes déjà publiées). */
export async function modeleDeChargement(emetteurs: string[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const noms = [...new Set(emetteurs.map((e) => e.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));

  const mode = wb.addWorksheet("Lisez-moi");
  mode.getColumn(1).width = 140;
  MODE_D_EMPLOI.forEach(([t, gras], i) => {
    const c = mode.getCell(i + 1, 1);
    c.value = t;
    c.font = { bold: gras, size: i === 0 ? 14 : 11 };
    c.alignment = { wrapText: true, vertical: "top" };
  });

  for (const f of ["tresor", "ape", "ipo", "resultats"] as Feuille[]) feuilleDeLignes(wb, f, noms.length);

  const li = wb.addWorksheet("Listes");
  const entete = (adr: string, texte: string) => {
    const c = li.getCell(adr);
    c.value = texte;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = plein(GRIS_BLEU);
  };
  entete("A1", "Pays");
  entete("B1", "Nom officiel (automatique)");
  entete("C1", "Émetteur du Trésor (automatique)");
  PAYS.forEach((p, i) => {
    li.getCell(`A${i + 2}`).value = p;
    li.getCell(`B${i + 2}`).value = NOM_OFFICIEL[p];
    li.getCell(`C${i + 2}`).value = `Trésor public de la ${NOM_OFFICIEL[p]}`;
  });
  entete("E1", "Type (Trésor)");
  ["OTA", "BTA", "Rachat"].forEach((v, i) => (li.getCell(`E${i + 2}`).value = v));
  entete("F1", "Opération");
  ["Nouvelle ligne", "Abondement"].forEach((v, i) => (li.getCell(`F${i + 2}`).value = v));
  entete("G1", "Instrument");
  ["OTA", "BTA"].forEach((v, i) => (li.getCell(`G${i + 2}`).value = v));
  entete("H1", "Émetteurs (APE, IPO) — à compléter ici, jamais dans les feuilles");
  noms.forEach((v, i) => (li.getCell(`H${i + 2}`).value = v));
  [14, 34, 50, 3, 16, 16, 12, 62].forEach((w, i) => (li.getColumn(i + 1).width = w));

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/* ---------------------------------------------------------------- la lecture */

export interface FeuilleLue {
  feuille: Feuille;
  /** Absente du classeur : ce n'est pas une erreur, la feuille est simplement vide. */
  presente: boolean;
  lignes: { ligne: number; valeurs: LigneBrute }[];
}

/** Le contenu d'une cellule, quelle que soit sa forme (texte, nombre, date, formule, texte riche). */
function valeurDe(v: ExcelJS.CellValue | undefined): unknown {
  if (v == null) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return v.result === "" ? null : (v.result as unknown);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text;
    if ("error" in v) return null;
  }
  return v as unknown;
}

export async function lireLeClasseur(octets: Uint8Array | ArrayBuffer): Promise<FeuilleLue[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(octets as ArrayBuffer);
  } catch {
    throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx) lisible.");
  }
  const out: FeuilleLue[] = [];
  for (const feuille of ["tresor", "ape", "ipo", "resultats"] as Feuille[]) {
    const ws = wb.getWorksheet(NOM_DE_FEUILLE[feuille]);
    if (!ws) {
      out.push({ feuille, presente: false, lignes: [] });
      continue;
    }
    const entetes: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, n) => {
      entetes[n - 1] = String(valeurDe(cell.value) ?? "");
    });
    const index = indexDesColonnes(feuille, entetes);
    if (![...index.values()].includes("piece")) throw new Error(`La feuille « ${NOM_DE_FEUILLE[feuille]} » n'a plus ses en-têtes d'origine : repartir du modèle téléchargé.`);
    const lignes: FeuilleLue["lignes"] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const valeurs: LigneBrute = {};
      for (const [i, id] of index) valeurs[id] = valeurDe(row.getCell(i + 1).value);
      if (estVide(valeurs) || estUnExemple(valeurs)) continue;
      lignes.push({ ligne: r, valeurs });
    }
    out.push({ feuille, presente: true, lignes });
  }
  return out;
}
