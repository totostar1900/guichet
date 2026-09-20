import { describe, expect, it } from "vitest";
import { amountFlag, computeProfile, profileFlag, toCover } from "@/data/profile";

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
  it("version 2: three blocks, verifications, the capped word and the confidence", () => {
    // a dynamic appetite, everything verified, but a reserve under a month and little to invest
    const base = { horizon: 3, objectif: 3, tolerance: 2, liquidite: 2, connaissance: 3, detenus: 0b0111, frequence: 2, v_prix: 2, v_adjudication: 1, v_depositaire: 1, v_vl: 1, revenus: 3, part: 3, reserve: 0, charges: 0, foyer: 0 };
    const capped = computeProfile({ ...base, epargne: 0 });
    expect(capped.version).toBe(2);
    expect(capped.kind).toBe("equilibre");
    expect(capped.capped).toBe(true);
    expect(capped.capacity).toBe("limitee");
    expect(capped.verified).toBe(4);
    expect(capped.knowledge).toBe("averti");
    expect(capped.confidence).toBe("verifie");
    expect(toCover(capped)).toEqual([]);
    // the same person with a real reserve and savings : dynamic, uncapped
    const free = computeProfile({ ...base, epargne: 3, reserve: 3 });
    expect(free.kind).toBe("dynamique");
    expect(free.capped).toBe(false);
    expect(free.capacity).toBe("bonne");
    // a beginner who missed the verifications : declared only, lessons to cover
    const novice = computeProfile({ ...base, connaissance: 0, detenus: 0b10000, frequence: 0, v_prix: 3, v_adjudication: 3, v_depositaire: 3, v_vl: 3, epargne: 1, reserve: 1 });
    expect(novice.knowledge).toBe("debutant");
    expect(novice.confidence).toBe("declare");
    expect(toCover(novice).map((c) => c.lesson)).toEqual(["coupon-et-rendement", "adjudication", "qui-fait-quoi", "fonds-vl"]);
    // eight lessons read verify the profile by themselves
    expect(computeProfile({ ...base, epargne: 1, v_prix: 3, v_adjudication: 3, v_depositaire: 3, v_vl: 3 }, 8).confidence).toBe("verifie");
  });
  it("reads an amount against the savings said available", () => {
    const p = computeProfile({ horizon: 3, objectif: 1, tolerance: 1, liquidite: 2, connaissance: 1, detenus: 1, frequence: 1, v_prix: 2, v_adjudication: 1, v_depositaire: 1, v_vl: 1, revenus: 3, epargne: 1, part: 2, reserve: 2, charges: 0, foyer: 2 });
    expect(amountFlag(p, 500_000)?.level).toBe("ok");
    expect(amountFlag(p, 1_500_000)?.level).toBe("warn");
    expect(amountFlag(p, 3_000_000)?.fr).toContain("au-delà");
    expect(amountFlag(computeProfile({ ...p.answers, epargne: 3 }), 50_000_000)).toBeNull();
    expect(amountFlag(undefined, 1)).toBeNull();
  });
});
