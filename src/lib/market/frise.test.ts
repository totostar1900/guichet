import { describe, expect, it } from "vitest";
import { anneesDe, bouge, casesParMois, ordonner, type CoupleFrise } from "./frise";

/**
 * LA FRISE DU COMPARATEUR : quatre années en quarante-huit cases, et deux
 * faits qui ne se confondent pas — ce que le marché a fait, ce que nous
 * n'avons pas su lire.
 */
const c = (o: Partial<CoupleFrise> & { d: string }): CoupleFrise => ({ p: "2024-03-01", s: 0, a: 0, r: false, ...o });

describe("le chiffre d'une case", () => {
  it("compte les séances qui bougent, pas les lignes qui ont bougé", () => {
    /* Une séance où douze lignes partent ne vaut pas douze : la case dit
       combien de couples méritent d'être ouverts, pas l'ampleur. */
    const cases = casesParMois([c({ d: "2024-03-04", s: 12 }), c({ d: "2024-03-05", a: 1 }), c({ d: "2024-03-06" })]);
    expect(cases.get("2024-03")).toMatchObject({ seances: 3, mouvements: 2 });
  });

  it("une arrivée seule suffit : entrer dans la cote est un mouvement", () => {
    expect(bouge(c({ d: "2024-03-04", a: 1 }))).toBe(true);
    expect(bouge(c({ d: "2024-03-04", s: 1 }))).toBe(true);
    expect(bouge(c({ d: "2024-03-04" }))).toBe(false);
  });
});

describe("la marque d'une case", () => {
  it("se compte à part du chiffre : un mouvement n'est pas un défaut", () => {
    const cases = casesParMois([
      c({ d: "2024-03-04", s: 2 }),
      c({ d: "2024-03-05", r: true }),
      c({ d: "2024-03-06", a: 1, r: true }),
    ]);
    expect(cases.get("2024-03")).toMatchObject({ mouvements: 2, aRelire: 2 });
  });
});

describe("le rangement", () => {
  it("sépare les mois sans trou de calendrier inventé", () => {
    const cases = casesParMois([c({ d: "2024-03-29" }), c({ d: "2024-05-02", s: 1 })]);
    /* Avril n'est pas une case vide ici : la vue le dessine, mais le
       regroupement ne connaît que les mois qui portent une séance. */
    expect([...cases.keys()]).toEqual(["2024-03", "2024-05"]);
  });

  it("met les séances qui bougent en tête, puis la date", () => {
    const l = ordonner([c({ d: "2024-03-06" }), c({ d: "2024-03-07", s: 1 }), c({ d: "2024-03-04" }), c({ d: "2024-03-05", a: 1 })]);
    expect(l.map((x) => x.d)).toEqual(["2024-03-05", "2024-03-07", "2024-03-04", "2024-03-06"]);
  });

  it("les années vont de la plus ancienne à la plus récente", () => {
    expect(anneesDe([c({ d: "2026-01-02" }), c({ d: "2023-11-30" }), c({ d: "2026-07-01" })])).toEqual(["2023", "2026"]);
  });
});
