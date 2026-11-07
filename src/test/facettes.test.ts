import { describe, expect, it } from "vitest";
import { compterFacettes, impossibles } from "@/lib/domain/facettes";

interface L { pays: string; type: string }
const lignes: L[] = [
  { pays: "Gabon", type: "BTA" },
  { pays: "Gabon", type: "OTA" },
  { pays: "Cameroun", type: "BTA" },
  { pays: "Cameroun", type: "BTA" },
  { pays: "Tchad", type: "OTA" },
];
const choix: Record<string, Set<string>> = { pays: new Set(), type: new Set() };
const passeSans = (x: L, cle: string) => Object.entries(choix).every(([k, s]) => k === cle || s.size === 0 || s.has(x[k as keyof L]));
const valeurs = (x: L, cle: string) => [x[cle as keyof L]];

describe("les facettes", () => {
  it("compte chaque valeur avec tous les autres filtres, sans le sien", () => {
    choix.pays = new Set(); choix.type = new Set(["BTA"]);
    const c = compterFacettes(lignes, ["pays", "type"], passeSans, valeurs);
    expect(c.pays).toEqual({ Gabon: 1, Cameroun: 2 });
    expect(c.type).toEqual({ BTA: 3, OTA: 2 });
  });
  it("laisse changer de valeur dans une facette sans tout retirer", () => {
    choix.pays = new Set(["Gabon"]); choix.type = new Set();
    const c = compterFacettes(lignes, ["pays", "type"], passeSans, valeurs);
    expect(c.pays).toEqual({ Gabon: 2, Cameroun: 2, Tchad: 1 });
    expect(c.type).toEqual({ BTA: 1, OTA: 1 });
  });
  it("laisse une valeur choisie à zéro et la signale comme impossible", () => {
    choix.pays = new Set(["Tchad"]); choix.type = new Set(["BTA"]);
    const c = compterFacettes(lignes, ["pays", "type"], passeSans, valeurs);
    expect(c.pays.Tchad ?? 0).toBe(0);
    expect(impossibles(choix.pays, c.pays)).toEqual(["Tchad"]);
    expect(impossibles(new Set(["Cameroun"]), c.pays)).toEqual([]);
  });
});
