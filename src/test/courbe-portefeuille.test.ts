import { describe, expect, it } from "vitest";
import { courbeDuPortefeuille } from "@/lib/domain/courbe-portefeuille";
import { VALEUR_DU_JOUR, type MoneyFlow } from "@/lib/domain/performance";

const v = (date: string, amount: number, label = "Versement"): MoneyFlow => ({ date, amount, label });

describe("la courbe du portefeuille", () => {
  it("cumule les versements et les retours, mois par mois", () => {
    const c = courbeDuPortefeuille([v("2026-01-10", -1_000_000), v("2026-03-05", -500_000), v("2026-03-20", 60_000, "Coupon")], 1_600_000, "2026-04-15");
    expect(c.points.map((p) => p.mois)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"]);
    expect(c.points.map((p) => p.verse)).toEqual([1_000_000, 1_000_000, 1_500_000, 1_500_000]);
    expect(c.points.map((p) => p.recu)).toEqual([0, 0, 60_000, 60_000]);
  });

  it("pose un point sur un mois sans mouvement", () => {
    // Sans lui, la ligne sauterait d'un versement à l'autre et laisserait
    // croire à une progression continue entre les deux.
    const c = courbeDuPortefeuille([v("2026-01-10", -1_000_000)], 1_000_000, "2026-05-02");
    expect(c.points).toHaveLength(5);
    expect(c.points[3]).toEqual({ mois: "2026-04-01", verse: 1_000_000, recu: 0 });
  });

  it("ignore le point de valorisation : il n'est pas un mouvement d'argent", () => {
    const c = courbeDuPortefeuille([v("2026-01-10", -1_000_000), v("2026-02-01", 9_999_999, VALEUR_DU_JOUR)], 1_200_000, "2026-02-10");
    expect(c.points.at(-1)!.recu).toBe(0);
    expect(c.valeur).toBe(1_200_000);
  });

  it("passe d'une année à l'autre sans trou", () => {
    const c = courbeDuPortefeuille([v("2025-11-03", -400_000), v("2026-01-08", -200_000)], 620_000, "2026-01-20");
    expect(c.points.map((p) => p.mois)).toEqual(["2025-11-01", "2025-12-01", "2026-01-01"]);
    expect(c.points.at(-1)!.verse).toBe(600_000);
  });

  it("ne rend rien quand il n'y a aucun mouvement", () => {
    const c = courbeDuPortefeuille([], 0, "2026-04-15");
    expect(c.points).toEqual([]);
    expect(c.depuis).toBeUndefined();
  });

  it("borne un portefeuille très ancien plutôt que de dessiner mille points", () => {
    const c = courbeDuPortefeuille([v("2000-01-10", -1_000_000)], 1_000_000, "2026-09-30");
    expect(c.points.length).toBeLessThanOrEqual(131);
  });
});
