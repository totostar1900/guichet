import { describe, expect, it } from "vitest";
import { TOLERANCE_MOIS, TOLERANCE_TRIMESTRE, variationSurMois } from "@/lib/domain/fund-perf";

/**
 * LE MOIS ET LE TRIMESTRE D'UN FONDS, MESURÉS SUR NOTRE SÉRIE.
 *
 * Mesuré le 6 octobre 2026 : le bulletin publie sa table des OPCVM quatre
 * fois, par horizon de comparaison, et un fonds n'y reparaît que si sa
 * société de gestion l'a voulu. Sur quarante-six fonds, ONZE portaient une
 * variation mensuelle, et ces onze appartiennent à DEUX maisons sur douze,
 * Harvest et ESS. Les trente-cinq autres affichaient « — », non parce que
 * le chiffre n'existe pas mais parce qu'un gérant étranger ne l'a pas fait
 * imprimer. Trente d'entre eux ont plus de dix VL en base.
 */
const hebdo = (debut: string, semaines: number, depart = 10_000, pas = 10) =>
  Array.from({ length: semaines }, (_, i) => {
    const d = new Date(Date.parse(debut) + i * 7 * 86_400_000);
    return { navDate: d.toISOString().slice(0, 10), nav: depart + i * pas };
  });

describe("la variation sur un mois", () => {
  it("compare à la dernière VL publiée avant la date visée", () => {
    /* Série hebdomadaire du 1er juillet au 30 septembre. Au 30 septembre, un
       mois en arrière vise le 30 août ; la VL retenue est celle du 26 août. */
    const serie = hebdo("2026-07-01", 14);
    const to = serie[serie.length - 1];
    const v = variationSurMois(serie, to, 1, TOLERANCE_MOIS)!;
    expect(v).toBeDefined();
    expect(v.depuis <= "2026-09-30").toBe(true);
    expect(v.pct).toBeGreaterThan(0);
  });

  it("compte en mois du calendrier, pas en tranches de trente jours", () => {
    /* Du 31 mars au 28 février : un mois en arrière vise le 28 février, et
       non le 1er mars qu'auraient donné trente jours. */
    const serie = [
      { navDate: "2026-02-27", nav: 100 },
      { navDate: "2026-03-06", nav: 110 },
      { navDate: "2026-03-31", nav: 120 },
    ];
    const v = variationSurMois(serie, serie[2], 1, TOLERANCE_MOIS)!;
    expect(v.depuis).toBe("2026-02-27");
    expect(v.pct).toBeCloseTo(20, 6);
  });

  it("refuse plutôt que d'étirer la fenêtre en silence", () => {
    /* Deux VL à quatre mois d'écart : « un mois » n'a rien à comparer, et
       rendre la variation sur quatre mois sous ce nom serait un mensonge. */
    const serie = [
      { navDate: "2026-05-01", nav: 100 },
      { navDate: "2026-09-01", nav: 130 },
    ];
    expect(variationSurMois(serie, serie[1], 1, TOLERANCE_MOIS)).toBeUndefined();
  });

  it("et la tolérance couvre exactement un fonds hebdomadaire", () => {
    /* Sept jours : la VL la plus proche avant la date visée a au plus six
       jours de retard chez un fonds hebdomadaire, donc elle passe toujours. */
    expect(TOLERANCE_MOIS).toBe(7);
    const serie = hebdo("2026-06-03", 20);
    for (let i = 5; i < serie.length; i++) {
      expect(variationSurMois(serie, serie[i], 1, TOLERANCE_MOIS), `VL du ${serie[i].navDate}`).toBeDefined();
    }
  });

  it("ne rend rien sans série, ni sur une VL nulle", () => {
    expect(variationSurMois([], { navDate: "2026-09-30", nav: 100 }, 1, TOLERANCE_MOIS)).toBeUndefined();
    expect(variationSurMois(hebdo("2026-06-03", 20), { navDate: "2026-09-30", nav: 0 }, 1, TOLERANCE_MOIS)).toBeUndefined();
  });

  it("écarte une VL de départ nulle, qui ferait diviser par zéro", () => {
    const serie = [
      { navDate: "2026-08-01", nav: 0 },
      { navDate: "2026-07-01", nav: 100 },
      { navDate: "2026-09-05", nav: 120 },
    ];
    const v = variationSurMois(serie, serie[2], 1, 40)!;
    expect(v.depuis).toBe("2026-07-01");
    expect(Number.isFinite(v.pct)).toBe(true);
  });
});

describe("la variation sur un trimestre", () => {
  it("accorde quinze jours de jeu, parce que la fenêtre est trois fois plus longue", () => {
    expect(TOLERANCE_TRIMESTRE).toBe(14);
    const serie = hebdo("2026-01-07", 40);
    const v = variationSurMois(serie, serie[serie.length - 1], 3, TOLERANCE_TRIMESTRE)!;
    expect(v).toBeDefined();
    /* Treize semaines de hausse à dix francs : la variation s'en déduit. */
    expect(v.pct).toBeGreaterThan(0);
  });

  it("et une série de deux mois ne peut pas rendre un trimestre", () => {
    const serie = hebdo("2026-08-01", 8);
    expect(variationSurMois(serie, serie[serie.length - 1], 3, TOLERANCE_TRIMESTRE)).toBeUndefined();
  });
});
