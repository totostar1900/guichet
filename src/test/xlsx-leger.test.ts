import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { lireClasseur } from "@/lib/market/xlsx-leger";
import { agregerOja, reconnaitreFichier } from "@/lib/market/oja";

async function classeur(lignes: unknown[][], nom = "Feuille 1"): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(nom);
  for (const l of lignes) ws.addRow(l);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

describe("le lecteur de classeur léger", () => {
  it("lit les en-têtes, des textes accentués et à entités, des nombres, des booléens, des cellules vides", async () => {
    const buf = await classeur([
      ["Titre", "Etat", "Volume", "Note"],
      ["GA1100002359", "Acceptée", 50_000_000, "R&D <ok>"],
      ["GA1100002359", null, 10_000_000, true],
      [],
      ["GA2A00000480", "Annulée", 1.5, "é"],
    ]);
    const c = await lireClasseur(buf);
    expect(c.entetes).toEqual(["Titre", "Etat", "Volume", "Note"]);
    expect(c.lignes).toHaveLength(3);
    expect(c.lignes[0]).toMatchObject({ Titre: "GA1100002359", Etat: "Acceptée", Volume: 50_000_000, Note: "R&D <ok>" });
    expect(c.lignes[1].Etat ?? null).toBeNull();
    expect(c.lignes[1].Note).toBe(true);
    expect(c.lignes[2].Volume).toBe(1.5);
  });

  it("ne garde que les colonnes demandées", async () => {
    const buf = await classeur([["a", "b", "c"], [1, 2, 3], [4, 5, 6]]);
    const c = await lireClasseur(buf, { colonnes: ["a", "c"] });
    expect(c.lignes).toEqual([{ a: 1, c: 3 }, { a: 4, c: 6 }]);
  });

  it("lit les dates comme des numéros de série, que `agregerOja` sait lire", async () => {
    const buf = await classeur([["Titre", "Etat", "Type d'opération", "Volume", "Prix ajusté", "Date de confirmation", "Compte du détenteur d'achteur"], ["GA1100002359", "Acceptée", "IPO", 4_000_000_000, 6.5, new Date("2026-10-21T14:00:00Z"), "8112"]]);
    const c = await lireClasseur(buf);
    const r = agregerOja({ offres: c.lignes });
    expect(r.seances[0].date).toBe("2026-10-21");
    expect(reconnaitreFichier(c.entetes)).toBe("offres");
  });

  it("lit au-delà de mille lignes sans se fier à une dimension déclarée", async () => {
    const lignes: unknown[][] = [["n", "v"]];
    for (let i = 0; i < 5000; i++) lignes.push([i, `ligne ${i}`]);
    const c = await lireClasseur(await classeur(lignes));
    expect(c.lignes).toHaveLength(5000);
    expect(c.lignes[4999]).toEqual({ n: 4999, v: "ligne 4999" });
  });

  it("refuse un fichier qui n'est pas un classeur", async () => {
    await expect(lireClasseur(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]))).rejects.toThrow(/classeur Excel/);
  });
});

describe("la reconnaissance sans lecture complète", () => {
  it("rend les en-têtes sans lire les lignes", async () => {
    const lignes: unknown[][] = [["Titre", "Etat"]];
    for (let i = 0; i < 3000; i++) lignes.push([`T${i}`, "Acceptée"]);
    const c = await lireClasseur(await classeur(lignes), { seulementEntetes: true });
    expect(c.entetes).toEqual(["Titre", "Etat"]);
    expect(c.lignes).toEqual([]);
  });
});
