import { describe, expect, it } from "vitest";
import { fundCurveFrom } from "@/lib/domain/fund-curve";

/**
 * La courbe réduite : deux dates, les valeurs dans l'ordre.
 *
 * Le dessin ne lit que la première date, la dernière, et les valeurs. Ce
 * cliquet tient la forme, l'ordre, et le refus de tracer une ligne d'un point.
 */
const nav = (navDate: string, n: number) => ({ navDate, nav: n });

describe("la courbe d'un fonds", () => {
  it("rend les valeurs dans l'ordre des dates, quelle que soit l'entrée", () => {
    const c = fundCurveFrom([nav("2026-03-01", 102), nav("2026-01-01", 100), nav("2026-02-01", 101)]);
    expect(c).toEqual({ from: "2026-01-01", to: "2026-03-01", ys: [100, 101, 102] });
  });

  it("ne garde que les dernières quand on en demande moins", () => {
    const navs = Array.from({ length: 10 }, (_, i) => nav(`2026-01-${String(i + 1).padStart(2, "0")}`, 100 + i));
    const c = fundCurveFrom(navs, 3);
    expect(c?.ys).toEqual([107, 108, 109]);
    expect(c?.from).toBe("2026-01-08");
    expect(c?.to).toBe("2026-01-10");
  });

  it("refuse de tracer avec moins de deux points", () => {
    expect(fundCurveFrom([])).toBeUndefined();
    expect(fundCurveFrom([nav("2026-01-01", 100)])).toBeUndefined();
  });

  it("écarte une valeur qui n'en est pas une", () => {
    const c = fundCurveFrom([nav("2026-01-01", 100), nav("2026-01-02", Number.NaN), nav("2026-01-03", 102)]);
    expect(c?.ys).toEqual([100, 102]);
  });

  it("garde la dernière valeur en dernier : c'est elle qui s'inscrit en or", () => {
    const c = fundCurveFrom([nav("2025-01-09", 11050.04), nav("2026-09-18", 12309.01)]);
    expect(c?.ys[c.ys.length - 1]).toBe(12309.01);
    expect(c?.to).toBe("2026-09-18");
  });
});
