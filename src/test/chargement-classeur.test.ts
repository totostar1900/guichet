import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { modeleDeChargement, lireLeClasseur } from "@/lib/chargement-classeur";
import { appliquerLePlan, planifierLeClasseur } from "@/lib/chargement-plan";
import { COLONNES, NOM_DE_FEUILLE, cleDeLibelle, completerLeBrouillon, dernierCoupon, dureeDuBon, emetteurDuTresor, heureDeCellule, jourDeCellule, lireUneLigneApe, lireUneLigneIpo, lireUneLigneTresor, lireUnResultat, titreDeLaFiche } from "@/lib/domain/chargement";
import { missingFields } from "@/lib/intake/publish";
import { repo } from "@/lib/data";

const lire = (f: string) => readFileSync(f, "utf8");
const CTX = { codesConnus: new Set<string>(), emetteurs: ["Société Nationale des Pétroles du Congo", "BGFI Holding Corporation S.A."] };
const jour = (a: number, m: number, j: number) => new Date(Date.UTC(a, m - 1, j));

/** La ligne du communiqué du Gabon du 18 novembre 2026, telle qu'une personne la saisit : sept champs. */
const GABON = { type: "BTA", pays: "Gabon", code: "GA1200002929", echeance: jour(2027, 5, 21), limite: jour(2026, 11, 18), heure: 9 / 24, reglement: jour(2026, 11, 20), piece: "Communiqué d'annonce BTA26S 181126.PDF" };

describe("ce que le Desk déduit à la place de la personne", () => {
  it("un BTA du Gabon se remplit avec sept champs, et tout le reste se déduit", () => {
    const c = lireUneLigneTresor(GABON, 2, CTX);
    expect(c.erreurs).toEqual([]);
    const d = c.brouillon!;
    expect(d.countryName).toBe("République gabonaise");
    expect(d.issuer).toBe("Trésor public de la République gabonaise");
    expect(d.nominal).toBe(1_000_000);
    expect(d.title).toBe("BTA 26 semaines · 21 mai 2027");
    expect(d.deadlineAt).toBe("2026-11-18T09:00");
    expect(d.resultsAt).toBe("2026-11-18T12:00");
    expect(d.operation).toBe("nouvelle_ligne");
    expect(d.official, "une pièce citée : tenue pour officielle").toBe(true);
    expect(missingFields(d), "rien ne manque à la publication").toEqual([]);
  });

  it("un code d'émission déjà connu devient un abondement, avec son dernier coupon déduit", () => {
    const ota = lireUneLigneTresor({ ...GABON, type: "OTA", coupon: 6, echeance: jour(2028, 3, 31) }, 2, { ...CTX, codesConnus: new Set(["GA1200002929"]) });
    expect(ota.brouillon!.operation).toBe("abondement");
    expect(ota.brouillon!.lastCouponOn).toBe("2026-03-31");
    expect(ota.brouillon!.title).toBe("OTA 6,00 % · 31 mars 2028");
    expect(ota.brouillon!.nominal).toBe(10_000);
    expect(dernierCoupon("2028-03-31", "2026-11-20")).toBe("2026-03-31");
    expect(dernierCoupon("2028-12-15", "2026-11-20")).toBe("2025-12-15");
  });

  it("sans pièce, la ligne arrive à compléter, non officielle ; sans heure, 12:00 le dit", () => {
    const c = lireUneLigneTresor({ ...GABON, piece: "", heure: undefined }, 2, CTX);
    expect(c.brouillon!.official).toBe(false);
    expect(c.brouillon!.deadlineAt).toBe("2026-11-18T12:00");
    expect(c.avertissements.join(" ")).toMatch(/aucune pièce citée/);
    expect(c.avertissements.join(" ")).toMatch(/12 h 00 retenu par convention/);
  });

  it("refuse ce qui est faux, en le disant : code, pays, coupon, dates, volume en francs", () => {
    const e = (l: Record<string, unknown>) => lireUneLigneTresor({ ...GABON, ...l }, 2, CTX).erreurs.join(" | ");
    expect(e({ code: "GA12 0000" })).toMatch(/12 caractères/);
    expect(e({ pays: "Gabn" })).toMatch(/pays/);
    expect(e({ type: "OTA" })).toMatch(/coupon/);
    expect(e({ reglement: jour(2026, 11, 10) })).toMatch(/règlement avant la date limite/);
    expect(e({ echeance: jour(2026, 11, 19) })).toMatch(/échéance avant le règlement/);
    expect(e({ volume: 15_000_000_000 })).toMatch(/MILLIONS/);
  });

  it("un emprunt et une IPO : l'émetteur vient de la liste, un inconnu est signalé, pas refusé", () => {
    const ape = lireUneLigneApe({ emetteur: "Société Nationale des Pétroles du Congo", pays: "Congo", code: "XX0000000000", coupon: 6.5, echeance: jour(2031, 12, 15), ouverture: jour(2026, 12, 1), limite: jour(2026, 12, 18), reglement: jour(2026, 12, 22), nominal: 10_000, piece: "Note d'information" }, 3, CTX);
    expect(ape.erreurs).toEqual([]);
    expect(ape.brouillon!.kind).toBe("APE");
    expect(ape.brouillon!.countryName).toBe("République du Congo");
    expect(ape.brouillon!.issuer).toBe("Société Nationale des Pétroles du Congo");
    expect(ape.avertissements.filter((a) => /absent du registre/.test(a))).toEqual([]);
    const inconnu = lireUneLigneApe({ emetteur: "SNPC Congo", pays: "Congo", code: "XX0000000000", coupon: 6.5, echeance: jour(2031, 12, 15), ouverture: jour(2026, 12, 1), limite: jour(2026, 12, 18), reglement: jour(2026, 12, 22), nominal: 10_000, piece: "x" }, 3, CTX);
    expect(inconnu.avertissements.join(" ")).toMatch(/absent du registre/);
    const ipo = lireUneLigneIpo({ emetteur: "BGFI Holding Corporation S.A.", pays: "Gabon", code: "XX0000000001", prix: 5000, offertes: 2_000_000, ouverture: jour(2026, 12, 1), limite: jour(2026, 12, 18), reglement: jour(2026, 12, 28), piece: "Prospectus" }, 4, CTX);
    expect(ipo.erreurs).toEqual([]);
    expect(ipo.brouillon!.kind).toBe("ACTIONS");
    expect(ipo.brouillon!.pricePerShare).toBe(5000);
    expect(ipo.brouillon!.sizeLabel).toBe("10 Mds FCFA");
  });

  it("des résultats en millions : convertis en francs, la couverture calculée, le servi jamais supérieur aux soumissions", () => {
    const r = lireUnResultat({ seance: jour(2026, 11, 18), pays: "Gabon", instrument: "BTA", code: "GA1200002929", annonce: 15_000, soumissions: 22_500, servi: 15_000, tauxMoyen: 5.5, prixMoyen: 99, piece: "Communiqué" }, 5);
    expect(r.erreurs).toEqual([]);
    expect(r.valeurs.bid).toBe(22_500_000_000);
    expect(r.valeurs.coverage).toBe(150);
    expect(r.valeurs.rateAvg).toBe(5.5);
    expect(r.valeurs.priceAvg, "un bon se lit en taux").toBeUndefined();
    expect(r.avertissements.join(" ")).toMatch(/prix ignorés/);
    expect(lireUnResultat({ seance: jour(2026, 11, 18), pays: "Gabon", instrument: "BTA", code: "GA1200002929", soumissions: 100, servi: 200, piece: "x" }, 6).erreurs.join(" ")).toMatch(/servi supérieur/);
    expect(lireUnResultat({ seance: jour(2026, 11, 18), pays: "Gabon", instrument: "BTA", code: "GA1200002929", soumissions: 100, servi: 50 }, 7).erreurs.join(" ")).toMatch(/pièce/);
  });

  it("lit les dates et les heures comme Excel les rend, et les compose en toutes lettres", () => {
    expect(jourDeCellule(jour(2026, 11, 18))).toBe("2026-11-18");
    expect(jourDeCellule(46344)).toBe("2026-11-18");
    expect(jourDeCellule("18/11/2026")).toBe("2026-11-18");
    expect(jourDeCellule("pas une date")).toBeUndefined();
    expect(heureDeCellule(9 / 24)).toBe("09:00");
    expect(heureDeCellule("9h00")).toBe("09:00");
    expect(heureDeCellule(new Date(Date.UTC(1899, 11, 30, 15, 30)))).toBe("15:30");
    expect(dureeDuBon("2026-11-20", "2027-05-21")).toBe("26 semaines");
    expect(titreDeLaFiche({ kind: "RACHAT", maturityOn: "2027-05-21" })).toBe("Rachat au pair · 21 mai 2027");
    expect(emetteurDuTresor("Guinée éq.")).toBe("Trésor public de la République de Guinée équatoriale");
    expect(cleDeLibelle("Date limite de souscription *")).toBe(cleDeLibelle("date limite de souscription"));
  });

  it("une description écrite par une personne n'est jamais remplacée", () => {
    const d = completerLeBrouillon({ ...lireUneLigneTresor(GABON, 2, CTX).brouillon!, blurb: "Ma phrase." });
    expect(d.blurb).toBe("Ma phrase.");
  });
});

describe("le modèle téléchargé et son aller-retour", () => {
  it("porte les quatre feuilles, les listes du jour et des colonnes automatiques qui se calculent", async () => {
    const octets = await modeleDeChargement(["Société Test A", "Société Test B"]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(octets as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Lisez-moi", ...Object.values(NOM_DE_FEUILLE), "Listes"]);
    const listes = wb.getWorksheet("Listes")!;
    const emetteurs: string[] = [];
    listes.getColumn(8).eachCell((c, n) => {
      if (n > 1 && c.value != null) emetteurs.push(String(c.value));
    });
    expect(emetteurs).toEqual(["Société Test A", "Société Test B"]);
    for (const [f, nom] of Object.entries(NOM_DE_FEUILLE)) {
      const ws = wb.getWorksheet(nom)!;
      const premiers = COLONNES[f as keyof typeof COLONNES].map((c) => cleDeLibelle(String(ws.getRow(1).getCell(COLONNES[f as keyof typeof COLONNES].indexOf(c) + 1).value)));
      expect(premiers).toEqual(COLONNES[f as keyof typeof COLONNES].map((c) => cleDeLibelle(c.libelle)));
    }
    const tresor = wb.getWorksheet(NOM_DE_FEUILLE.tresor)!;
    expect(tresor.getCell("N2").value).toMatchObject({ formula: expect.stringContaining("VLOOKUP") });
  });

  it("une ligne remplie à la main se relit : l'exemple et les colonnes vertes sont ignorés", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await modeleDeChargement([])) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet(NOM_DE_FEUILLE.tresor)!;
    ws.getRow(3).values = ["OTA", "Congo", "CG2K00000999", jour(2030, 6, 30), 6.2, jour(2026, 12, 7), 9 / 24, jour(2026, 12, 9), undefined, 12000, undefined, undefined, "Communiqué OTA 4 ans.pdf"];
    const feuilles = await lireLeClasseur((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const t = feuilles.find((f) => f.feuille === "tresor")!;
    expect(t.lignes.map((l) => l.ligne), "la ligne 2 est l'exemple").toEqual([3]);
    const c = lireUneLigneTresor(t.lignes[0].valeurs, 3, CTX);
    expect(c.erreurs).toEqual([]);
    expect(c.brouillon!.couponRate).toBe(6.2);
    expect(c.brouillon!.sizeLabel).toBe("12 Mds FCFA");
    expect(c.brouillon!.deadlineAt).toBe("2026-12-07T09:00");
  });

  it("refuse un fichier qui n'est pas un classeur, et un classeur dont les en-têtes ont changé", async () => {
    await expect(lireLeClasseur(new TextEncoder().encode("pas un classeur"))).rejects.toThrow(/classeur Excel/);
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet(NOM_DE_FEUILLE.tresor).addRow(["autre chose"]);
    await expect(lireLeClasseur((await wb.xlsx.writeBuffer()) as ArrayBuffer)).rejects.toThrow(/en-têtes d'origine/);
  });
});

describe("le plan et son application, sur le dépôt de démonstration", () => {
  async function classeur(lignes: unknown[][], feuille: keyof typeof NOM_DE_FEUILLE = "tresor"): Promise<ArrayBuffer> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await modeleDeChargement([])) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet(NOM_DE_FEUILLE[feuille])!;
    ws.spliceRows(2, 1);
    lignes.forEach((v, i) => (ws.getRow(2 + i).values = v.slice(1) as ExcelJS.CellValue[]));
    return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  }

  it("charge une ligne en « À valider », ignore un doublon, n'écrit rien à l'aperçu", async () => {
    const avant = (await repo().listIntake()).length;
    const ligne = [undefined, "BTA", "Gabon", "GA9900001111", jour(2027, 5, 21), undefined, jour(2026, 11, 18), 9 / 24, jour(2026, 11, 20), undefined, 15000, undefined, undefined, "Communiqué.pdf"];
    const plan = await planifierLeClasseur(await classeur([ligne, ligne]), "essai.xlsx");
    expect(plan.lignes.map((l) => l.statut)).toEqual(["a_charger", "doublon"]);
    expect((await repo().listIntake()).length, "l'aperçu n'écrit rien").toBe(avant);
    const fait = await appliquerLePlan(plan, "Test");
    expect(fait.pieces).toBe(1);
    const apres = await repo().listIntake();
    const piece = apres.find((q) => q.draft.isin === "GA9900001111")!;
    expect(piece.state).toBe("a_valider");
    expect(piece.fromLabel).toMatch(/Classeur Excel · essai\.xlsx/);
    expect(piece.draft.issuer).toBe("Trésor public de la République gabonaise");
    const encore = await planifierLeClasseur(await classeur([ligne]), "essai.xlsx");
    expect(encore.lignes[0].statut, "déjà dans la file").toBe("doublon");
  });

  it("une ligne sans pièce arrive à compléter (bloquée)", async () => {
    const ligne = [undefined, "BTA", "Tchad", "TD9900002222", jour(2027, 5, 21), undefined, jour(2026, 11, 18), undefined, jour(2026, 11, 20), undefined, undefined, undefined, undefined, undefined];
    const plan = await planifierLeClasseur(await classeur([ligne]), "essai.xlsx");
    await appliquerLePlan(plan, "Test");
    expect((await repo().listIntake()).find((q) => q.draft.isin === "TD9900002222")!.state).toBe("bloque");
  });

  it("des résultats : code inconnu refusé, erreur dite, rien d'écrit", async () => {
    const r = [undefined, jour(2026, 11, 18), "Gabon", "BTA", "ZZ0000000000", undefined, 22500, 15000, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "Communiqué"];
    const plan = await planifierLeClasseur(await classeur([r], "resultats"), "essai.xlsx");
    expect(plan.resultats[0].statut).toBe("erreur");
    expect(plan.resultats[0].erreurs.join(" ")).toMatch(/code d'émission inconnu/);
  });
});

describe("les résultats chargés dans une séance connue", () => {
  it("ne remplissent que le vide, signalent un écart sans l'écraser, et créent une séance d'un code connu", async () => {
    const r = repo();
    const base = { codeEmission: "GA7700003333", country: "Gabon" as const, instrument: "BTA" as const, tenor: "26 semaines", sessionOn: "2026-10-14", abondement: false, announced: 15_000_000_000, bid: 22_500_000_000, maturityOn: "2027-04-15", sourceUrl: "essai:classeur:1", sourceTitle: "Séance d'essai" };
    const connue = await r.upsertAuctionResult(base);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await modeleDeChargement([])) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet(NOM_DE_FEUILLE.resultats)!;
    ws.spliceRows(2, 1);
    /* seance, pays, instrument, code, annoncé, soumissions, servi, soumissionnaires, taux min, max, limite, moyen, prix×4, pièce */
    ws.getRow(2).values = [jour(2026, 10, 14), "Gabon", "BTA", "GA7700003333", 15_000, 99_999, 15_000, 8, 5.1, 5.9, 5.8, 5.5, undefined, undefined, undefined, undefined, "Communiqué du 14 octobre"];
    ws.getRow(3).values = [jour(2026, 10, 28), "Gabon", "BTA", "GA7700003333", 10_000, 12_000, 10_000, undefined, undefined, undefined, undefined, 5.6, undefined, undefined, undefined, undefined, "Communiqué du 28 octobre"];
    const plan = await planifierLeClasseur((await wb.xlsx.writeBuffer()) as ArrayBuffer, "resultats.xlsx");
    expect(plan.resultats[0].statut).toBe("complete");
    expect(plan.resultats[0].ajoutes).toEqual(expect.arrayContaining(["total servi", "taux moyen pondéré", "soumissionnaires"]));
    expect(plan.resultats[0].ecarts.join(" "), "les soumissions du Desk (22,5 Mds) diffèrent de celles du classeur").toMatch(/total des soumissions/);
    expect(plan.resultats[1].statut).toBe("cree");
    await appliquerLePlan(plan, "Test");
    const apres = (await r.listAuctionResults({ codeEmission: "GA7700003333" })).sort((a, b) => a.sessionOn.localeCompare(b.sessionOn));
    expect(apres[0].id).toBe(connue.id);
    expect(apres[0].served).toBe(15_000_000_000);
    expect(apres[0].rateAvg).toBe(5.5);
    expect(apres[0].bid, "le chiffre déjà là n'est pas écrasé").toBe(22_500_000_000);
    expect(apres[1].sessionOn).toBe("2026-10-28");
    expect(apres[1].tenor, "durée reprise de la séance voisine").toBe("26 semaines");
    expect(apres[1].confirmedBy, "une séance chargée à la main reste à confirmer").toBeUndefined();
  });
});

describe("les garde-fous du code", () => {
  it("le téléchargement du modèle est réservé au desk, et la page de chargement n'écrit qu'au second geste", () => {
    expect(lire("src/app/desk/a-valider/modele/route.ts")).toMatch(/await requireDesk\(/);
    const a = lire("src/app/desk/a-valider/chargement/actions.ts");
    const debut = a.indexOf("export async function apercuDuClasseurAction");
    const apercu = a.slice(debut, a.indexOf("export async function chargerLeClasseurAction", debut));
    expect(apercu, "l'aperçu écrit").not.toMatch(/appliquerLePlan/);
    expect(a).toMatch(/appliquerLePlan\(plan, desk\.name\)/);
  });

  it("les résultats ne remplissent que le vide : un chiffre existant n'est jamais écrasé", () => {
    const p = lire("src/lib/chargement-plan.ts");
    expect(p).toMatch(/if \(actuel == null\) \{\s*patch\[k\] = v;/);
    expect(p).toMatch(/\(non modifié\)/);
  });

  it("la lecture du classeur et la fabrication du modèle partagent UNE définition des colonnes", () => {
    expect(lire("src/lib/chargement-classeur.ts")).toMatch(/COLONNES\[feuille\]/);
    expect(lire("src/lib/domain/chargement.ts")).toMatch(/par = new Map\(COLONNES\[feuille\]/);
  });

  it("le formulaire du Desk ne demande plus ni nom de pays, ni référence, ni titre, et l'émetteur du Trésor n'y est pas saisi", () => {
    const f = lire("src/app/desk/a-valider/ValidateForm.tsx");
    expect(f).not.toMatch(/<Field k="countryName"|<Field k="sourceRef"|<Field k="title"/);
    expect(f).toMatch(/emetteurDuTresor\(vivant\.country\)/);
    expect(f).toMatch(/<Field k="issuer"[^>]*options=/);
    expect(lire("src/app/desk/a-valider/actions.ts")).toMatch(/return completerLeBrouillon\(next\)/);
  });
});
