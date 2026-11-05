import { describe, expect, it } from "vitest";
import { classer, CLE_DE_PERIODE, ligneDeComparaison, rangEcrit, type LigneDeComparaison } from "./comparatif";

const ligne = (id: string, a1?: number): LigneDeComparaison => ({ id, titre: `Fonds ${id}`, pcts: a1 == null ? {} : { a1: { pct: a1 } } });

describe("le comparatif d'un fonds", () => {
  it("classe sur la mesure de la période, le meilleur d'abord, et dit le rang du fonds", () => {
    const c = classer(ligne("moi", 4.69), [ligne("a", 7.1), ligne("b", 4.31), ligne("c", 3.9)], "a1");
    expect(c.lignes.map((l) => l.id)).toEqual(["a", "moi", "b", "c"]);
    expect([c.rang, c.total, c.sans]).toEqual([2, 4, 0]);
    expect(c.premier?.id, "le premier de la catégorie n'est pas nommé").toBe("a");
  });
  it("ne dessine pas un fonds sans mesure, et le compte à part : jamais de zéro inventé", () => {
    const c = classer(ligne("moi", 4.69), [ligne("jeune"), ligne("a", 7.1)], "a1");
    expect(c.lignes.some((l) => l.id === "jeune")).toBe(false);
    expect([c.total, c.sans]).toEqual([2, 1]);
  });
  it("garde le fonds dans le dessin même quand il est hors des mieux classés, et partage le rang des égalités", () => {
    const pairs = ["a", "b", "c", "d", "e", "f"].map((id, i) => ligne(id, 10 - i));
    const c = classer(ligne("moi", 0.5), pairs, "a1", 6);
    expect(c.lignes).toHaveLength(6);
    expect(c.lignes[5].moi, "le fonds n'est plus la dernière ligne dessinée").toBe(true);
    expect(c.rang).toBe(7);
    const egal = classer(ligne("moi", 5), [ligne("a", 5), ligne("b", 3)], "a1");
    expect([egal.lignes[0].rang, egal.lignes[1].rang, egal.lignes[2].rang]).toEqual([1, 1, 3]);
  });
  it("n'a pas de rang quand le fonds lui-même n'a pas de mesure, et le premier est alors le meilleur des pairs", () => {
    const c = classer(ligne("moi"), [ligne("a", 7.1), ligne("b", 3)], "a1");
    expect(c.rang).toBeUndefined();
    expect(c.premier?.id).toBe("a");
  });
  it("n'a pas de « premier » quand le fonds est en tête", () => {
    expect(classer(ligne("moi", 9), [ligne("a", 7.1)], "a1").premier).toBeUndefined();
  });
  it("lit les mesures de la liste des fonds : fenêtres et année en cours, rien d'autre", () => {
    const l = ligneDeComparaison("x", "X", { from: "2025-01-01", to: "2026-10-01", ys: [100, 110], ytdFrom: 100, ytdDate: "2025-12-31", fenetres: { a1: { pct: 7, depuis: "2025-10-01" } } });
    expect(l.pcts.a1?.pct).toBe(7);
    expect(l.pcts.debut?.pct).toBeCloseTo(10, 5);
    expect(ligneDeComparaison("y", "Y", undefined).pcts).toEqual({});
  });
  it("ne compare que les périodes que la liste des fonds mesure : ni 5 ans ni Max", () => {
    expect(Object.keys(CLE_DE_PERIODE).sort()).toEqual(["1a", "2a", "3a", "3m", "6m", "debut"]);
  });
  it("écrit le rang à la française", () => {
    expect([rangEcrit(1), rangEcrit(2), rangEcrit(11)]).toEqual(["1ᵉʳ", "2ᵉ", "11ᵉ"]);
  });
});
