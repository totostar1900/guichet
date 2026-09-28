import { describe, expect, it } from "vitest";
import { derniereParDuree, poids } from "@/lib/market/lecture-b";

/**
 * La lecture B décide ce qui entre dans la courbe. Elle se vérifie.
 */
describe("la lecture B", () => {
  const p = (mot: string, age: number, mince = false) => ({ mot, age, mince });

  it("garde une seule séance par durée, la plus récente", () => {
    const g = derniereParDuree([p("3 mois", 700), p("3 mois", 12), p("3 mois", 300), p("1 an", 40)]);
    expect(g).toHaveLength(2);
    expect(g.find((x) => x.mot === "3 mois")!.age).toBe(12);
  });

  it("ne confond pas deux durées qui se ressemblent", () => {
    expect(derniereParDuree([p("1 an", 10), p("1.5 ans", 20), p("12 mois", 30)])).toHaveLength(3);
  });

  it("garde un point sans âge plutôt que rien, mais lui préfère un daté", () => {
    const g = derniereParDuree<{ mot: string; age?: number }>([{ mot: "5 ans" }, { mot: "5 ans", age: 400 }]);
    expect(g).toHaveLength(1);
    expect(g[0].age).toBe(400);
  });

  it("fait décroître le poids de moitié à chaque demi-vie", () => {
    expect(poids(p("1 an", 0), { demiVieJours: 90 })).toBeCloseTo(1, 6);
    expect(poids(p("1 an", 90), { demiVieJours: 90 })).toBeCloseTo(0.5, 6);
    expect(poids(p("1 an", 180), { demiVieJours: 90 })).toBeCloseTo(0.25, 6);
  });

  it("pèse tout pareil quand on ne demande pas de décroissance", () => {
    expect(poids(p("1 an", 900), {})).toBe(1);
  });

  it("sous-pondère une séance mince sans la faire disparaître", () => {
    const w = poids(p("1 an", 0, true), { minces: "sous-ponderer" });
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(poids(p("1 an", 0), { minces: "sous-ponderer" }));
  });

  it("la retire quand on le demande, et la garde entière quand on le demande", () => {
    expect(poids(p("1 an", 0, true), { minces: "exclure" })).toBe(0);
    expect(poids(p("1 an", 0, true), { minces: "inclure" })).toBe(1);
  });
});
