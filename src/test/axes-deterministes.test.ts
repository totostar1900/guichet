import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pasPropre, ticksPropres } from "@/lib/ui/axes";

/* Les graduations d'un axe sont calculées sur le serveur ET dans le navigateur : si elles diffèrent, React refuse l'hydratation (erreur #418, rendement de REG, 6 novembre 2026). */
describe("les graduations d'un axe ne dépendent d'aucune fonction approchée", () => {
  const src = readFileSync("src/lib/ui/axes.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("axes.ts n'appelle ni Math.pow ni Math.log10", () => {
    expect(src).not.toMatch(/Math\.pow|Math\.log10|\*\*/);
  });

  it("le pas est une puissance de dix exacte, à toutes les échelles", () => {
    expect(pasPropre(0.01, 3)).toBe(0.005);
    expect(pasPropre(2.45, 3)).toBe(2);
    expect(pasPropre(621, 3)).toBe(500);
    expect(pasPropre(0.0003, 3)).toBe(0.0002);
    expect(pasPropre(0, 3)).toBe(1);
  });

  it("les graduations couvrent le maximum et sont des multiples exacts du pas", () => {
    expect(ticksPropres(0, 621, 3)).toEqual([0, 500, 1000]);
    expect(ticksPropres(0, 0.01, 3)).toEqual([0, 0.005, 0.01]);
    expect(ticksPropres(0, 2.45, 3)).toEqual([0, 2, 4]);
    const t = ticksPropres(0, 0.3, 3);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(0.3);
  });
});
