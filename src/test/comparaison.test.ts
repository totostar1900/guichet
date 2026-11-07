import { describe, expect, it } from "vitest";
import { borner, bonRoule, compatibilite, fenetreCommune, mesureSurPoints, plusProches, sensibilite, sensibiliteBonRoule, sensibiliteSurPoints, valeurAu, type SeanceBon } from "@/lib/domain/comparaison";

const bon = (date: string, tauxPct: number, semaines = 13): SeanceBon => ({ date, tauxPct, semaines });

describe("la fenêtre commune", () => {
  it("va du plus tardif des débuts au plus précoce des fins", () => {
    expect(fenetreCommune([{ debut: "2023-01-05", fin: "2026-11-05" }, { debut: "2023-03-03", fin: "2026-11-06" }])).toEqual({ debut: "2023-03-03", fin: "2026-11-05" });
  });
  it("n'existe pas quand les lignes ne se recoupent pas", () => {
    expect(fenetreCommune([{ debut: "2020-01-01", fin: "2021-01-01" }, { debut: "2022-01-01", fin: "2023-01-01" }])).toBeUndefined();
  });
  it("ramène la plage demandée dans ce qu'on a et le dit", () => {
    const c = { debut: "2023-03-03", fin: "2026-11-05" };
    expect(borner({ du: "2021-01-01", au: "2026-12-31" }, c)).toEqual({ du: "2023-03-03", au: "2026-11-05", borne: true });
    expect(borner({ du: "2025-11-05", au: "2026-11-05" }, c)).toEqual({ du: "2025-11-05", au: "2026-11-05", borne: false });
    expect(borner({}, c)).toEqual({ du: "2025-11-05", au: "2026-11-05", borne: false });
  });
});

describe("les valeurs liquidatives et les cours", () => {
  const vl = [{ date: "2025-01-01", valeur: 100 }, { date: "2025-07-01", valeur: 105 }, { date: "2026-01-01", valeur: 110 }];
  it("ne prend pas une valeur trop ancienne pour celle du jour", () => {
    expect(valeurAu(vl, "2025-07-05", 10)).toBe(105);
    expect(valeurAu(vl, "2025-12-01", 10)).toBeUndefined();
    expect(valeurAu(vl, "2024-12-31", 10)).toBeUndefined();
  });
  it("mesure la variation et l'annualise sur la période", () => {
    const m = mesureSurPoints(vl, "2025-01-01", "2026-01-01", 10)!;
    expect(m.cumule).toBeCloseTo(10, 6);
    expect(m.annualise).toBeCloseTo(10, 6);
    expect(mesureSurPoints(vl, "2025-07-01", "2025-07-20", 30)!.annualise).toBeNull();
  });
});

describe("un bon roulé", () => {
  it("une seule séance, échéance au dernier jour : l'escompte seul", () => {
    const r = bonRoule([bon("2025-01-01", 4)], 13, "2025-01-01", "2025-04-02", 0)!;
    expect(r.placements).toBe(1);
    expect(r.cumule).toBeCloseTo((1 / (1 - 0.04 * (91 / 360)) - 1) * 100, 9);
    expect(r.joursSansPlacement).toBe(0);
  });
  it("valorise l'attente au taux bancaire, avant et après le placement", () => {
    const r = bonRoule([bon("2025-01-11", 4)], 13, "2025-01-01", "2025-04-15", 2)!;
    const attendu = (1 + 0.02 * (10 / 365)) / (1 - 0.04 * (91 / 360)) * (1 + 0.02 * (3 / 365));
    expect(r.cumule).toBeCloseTo((attendu - 1) * 100, 9);
    expect(r.joursSansPlacement).toBe(13);
  });
  it("ne fait pas un placement qui ne serait pas échu à la fin de la période", () => {
    expect(bonRoule([bon("2025-01-01", 4)], 13, "2025-01-01", "2025-03-01", 2)).toBeUndefined();
  });
  it("réinvestit à la séance suivante, et une seule fois si on le demande", () => {
    const s = [bon("2025-01-01", 4), bon("2025-04-02", 5)];
    expect(bonRoule(s, 13, "2025-01-01", "2025-07-02", 0)!.placements).toBe(2);
    expect(bonRoule(s, 13, "2025-01-01", "2025-07-02", 0, true)!.placements).toBe(1);
  });
  it("ne mélange pas les durées", () => {
    expect(bonRoule([bon("2025-01-01", 4, 26)], 13, "2025-01-01", "2025-07-01", 0)).toBeUndefined();
  });
});

describe("la sensibilité au jour d'entrée", () => {
  it("donne la pire, la médiane et la meilleure, et pas les dates", () => {
    const s = sensibilite([3, 5, 1, 4])!;
    expect(s).toEqual({ pire: 1, mediane: 3.5, meilleure: 5, n: 4 });
    expect(Object.keys(s)).not.toContain("date");
  });
  it("part de chaque valeur liquidative où la détention tient dans la période", () => {
    const pts = [{ date: "2025-01-01", valeur: 100 }, { date: "2025-02-01", valeur: 102 }, { date: "2025-03-01", valeur: 101 }, { date: "2025-04-01", valeur: 104 }];
    const s = sensibiliteSurPoints(pts, "2025-01-01", "2025-04-01", 59, 5)!;
    expect(s.n).toBe(2);
    expect(s.pire).toBeCloseTo(1, 6);
    expect(s.meilleure).toBeCloseTo((104 / 102 - 1) * 100, 6);
  });
  it("prend chaque séance d'adjudication comme entrée possible", () => {
    const s = [bon("2025-01-01", 4), bon("2025-01-15", 6), bon("2025-04-02", 4), bon("2025-04-16", 6)];
    const r = sensibiliteBonRoule(s, 13, "2025-01-01", "2025-07-16", 91, 0)!;
    expect(r.n).toBeGreaterThanOrEqual(2);
    expect(r.meilleure).toBeGreaterThan(r.pire);
  });
});

describe("le verdict de compatibilité", () => {
  const ota5 = { id: "ota5", nature: "promesse" as const, horizonJours: 1826 };
  const ota3 = { id: "ota3", nature: "promesse" as const, horizonJours: 1095 };
  const bta = { id: "bta", nature: "promesse" as const, horizonJours: 182 };
  const fonds = { id: "f", nature: "passe" as const };
  it("laisse comparer deux dettes d'horizons voisins", () => expect(compatibilite(ota5, ota3).niveau).toBe("ok"));
  it("avertit quand l'horizon passe du simple au double", () => expect(compatibilite(ota5, bta).niveau).toBe("horizons"));
  it("avertit quand les natures diffèrent : une promesse n'est pas un passé", () => expect(compatibilite(ota5, fonds).niveau).toBe("natures"));
  it("propose les lignes de même nature et d'horizon le plus proche", () => {
    expect(plusProches(ota5, [bta, ota3, fonds, { id: "ota7", nature: "promesse", horizonJours: 2555 }]).map((p) => p.id)).toEqual(["ota7", "ota3"]);
  });
});
