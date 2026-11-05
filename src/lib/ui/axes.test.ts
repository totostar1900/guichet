import { describe, expect, it } from "vitest";
import { ticksPropres } from "@/lib/ui/axes";

describe("les graduations d'un axe", () => {
  it("des valeurs rondes qui encadrent la série", () => {
    expect(ticksPropres(0, 621, 3)).toEqual([0, 500, 1000]);
    expect(ticksPropres(83_000, 85_500, 3)).toEqual([82_000, 84_000, 86_000]);
    expect(ticksPropres(0, 12, 4)).toEqual([0, 5, 10, 15]);
  });
  it("la dernière graduation couvre toujours le maximum, la première le minimum", () => {
    for (const [a, b] of [[0, 7], [3, 99], [-40, 60], [82_900, 90_100]] as const) {
      const t = ticksPropres(a, b, 4);
      expect(t[0]).toBeLessThanOrEqual(a);
      expect(t[t.length - 1]).toBeGreaterThanOrEqual(b);
    }
  });
  it("une série plate rend une seule graduation", () => {
    expect(ticksPropres(5, 5, 3)).toEqual([5]);
  });
});
