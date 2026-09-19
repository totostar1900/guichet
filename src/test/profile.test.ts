import { describe, expect, it } from "vitest";
import { computeProfile, profileFlag } from "@/data/profile";

/** The profile arithmetic and the words a line gets against it. */
describe("financial profile", () => {
  it("reads cautious, balanced and dynamic answers", () => {
    const cautious = computeProfile({ horizon: 0, objectif: 0, tolerance: 0, connaissance: 0, part: 0, liquidite: 0, revenus: 0 });
    expect(cautious.kind).toBe("prudent");
    expect(cautious.horizonYears).toEqual([0, 1]);
    const balanced = computeProfile({ horizon: 1, objectif: 1, tolerance: 1, connaissance: 1, part: 2, liquidite: 2, revenus: 2 });
    expect(balanced.kind).toBe("equilibre");
    const dynamic = computeProfile({ horizon: 3, objectif: 3, tolerance: 2, connaissance: 3, part: 3, liquidite: 2, revenus: 2 });
    expect(dynamic.kind).toBe("dynamique");
    expect(dynamic.horizonYears).toEqual([5, 99]);
  });
  it("marks a line against the horizon and the tolerance", () => {
    const p = computeProfile({ horizon: 1, objectif: 1, tolerance: 0, connaissance: 1, part: 2, liquidite: 2, revenus: 2 });
    expect(profileFlag(p, { tenorYears: 1.5 })?.level).toBe("ok");
    expect(profileFlag(p, { tenorYears: 5 })?.level).toBe("warn");
    expect(profileFlag(p, { equity: true })?.fr).toContain("tolérance");
    expect(profileFlag(undefined, { tenorYears: 5 })).toBeNull();
  });
});
