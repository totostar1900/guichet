import { describe, expect, it } from "vitest";
import { consolide } from "@/lib/market/zone";

/**
 * Le niveau de zone dit « la CEMAC ». Il doit donc être la CEMAC.
 *
 * Le défaut trouvé en production : la règle comptait les points au lieu des
 * Trésors. Le Congo portant deux abondements au même horizon arrondi, la
 * « moyenne de zone » à un an et demi était le Congo moyenné avec le Congo,
 * affichée sous le nom et la couleur de la zone. Un chiffre faux qui a l'air
 * d'un chiffre.
 */
describe("le niveau de zone", () => {
  const pt = (annees: number, mot: string, pct: number, age = 10) => ({ annees, mot, pct, age });

  it("moyenne les Trésors présents à un horizon", () => {
    const z = consolide([
      { pays: "Cameroun", points: [pt(0.5, "6 mois", 4)] },
      { pays: "Congo", points: [pt(0.5, "6 mois", 6)] },
    ]);
    expect(z).toHaveLength(1);
    expect(z[0].pct).toBe(5);
    expect(z[0].n).toBe(2);
  });

  it("écarte un horizon que deux points d'un même Trésor se partagent", () => {
    const z = consolide([{ pays: "Congo", points: [pt(1.5, "1.5 ans", 7), pt(1.5, "1.5 ans", 9)] }]);
    expect(z).toEqual([]);
  });

  it("écarte un horizon porté par une seule signature", () => {
    const z = consolide([
      { pays: "Gabon", points: [pt(5, "5 ans", 8)] },
      { pays: "Cameroun", points: [pt(0.5, "6 mois", 4)] },
    ]);
    expect(z).toEqual([]);
  });

  it("ne se dit pas plus fraîche que le plus vieux prix qu'elle moyenne", () => {
    const z = consolide([
      { pays: "Cameroun", points: [pt(3, "3 ans", 5, 12)] },
      { pays: "Gabon", points: [pt(3, "3 ans", 7, 400)] },
    ]);
    expect(z[0].age).toBe(400);
  });

  it("rend les horizons dans l'ordre des durées", () => {
    const deux = [
      { pays: "Cameroun", points: [pt(3, "3 ans", 5), pt(0.5, "6 mois", 4)] },
      { pays: "Congo", points: [pt(3, "3 ans", 7), pt(0.5, "6 mois", 6)] },
    ];
    expect(consolide(deux).map((x) => x.mot)).toEqual(["6 mois", "3 ans"]);
  });
});
