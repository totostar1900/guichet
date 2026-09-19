import { describe, expect, it } from "vitest";
import { bondCalc, btaCalc, daysBetween, tenorText } from "./finance";

// Reference values come from the Purpose Capital note of 9 Sept 2026
// (three RCA lines, 1 000 titres, settlement 16/09/2026).
const settleOn = "2026-09-16";

describe("RCA OTA lines at 95 % (note Purpose Capital)", () => {
  it("Ligne A : new line, 6,25 %, 16/09/2028 → 9,096 %", () => {
    const r = bondCalc(
      { nominal: 10_000, couponRate: 6.25, settleOn, maturityOn: "2028-09-16", lastCouponOn: null },
      10_000_000,
      95,
    );
    expect(r.titles).toBe(1000);
    expect(r.accrued).toBe(0);
    expect(Math.round(r.outlay)).toBe(9_500_000);
    expect(Math.round(r.gain)).toBe(1_750_000);
    expect(r.irr).toBeCloseTo(9.096, 2);
  });

  it("Ligne B : reopening, 6,50 %, 12/08/2029, 35 days accrued → 8,506 %", () => {
    const r = bondCalc(
      { nominal: 10_000, couponRate: 6.5, settleOn, maturityOn: "2029-08-12", lastCouponOn: "2026-08-12" },
      10_000_000,
      95,
    );
    expect(r.accruedDays).toBe(35);
    expect(Math.round(r.accrued)).toBe(62_329);
    expect(Math.round(r.outlay)).toBe(9_562_329);
    expect(Math.round(r.gain)).toBe(2_387_671);
    expect(r.irr).toBeCloseTo(8.506, 2);
  });

  it("Ligne C : reopening, 6,50 %, 14/02/2028, 214 days accrued → 10,422 %", () => {
    const r = bondCalc(
      { nominal: 10_000, couponRate: 6.5, settleOn, maturityOn: "2028-02-14", lastCouponOn: "2026-02-14" },
      10_000_000,
      95,
    );
    expect(r.accruedDays).toBe(214);
    expect(Math.round(r.accrued)).toBe(381_096);
    expect(Math.round(r.outlay)).toBe(9_881_096);
    expect(r.irr).toBeCloseTo(10.422, 2);
    expect(r.flows).toHaveLength(2);
    expect(r.flows[1].label).toBe("Coupon + capital");
  });

  it("at par the yield equals the coupon for a new line", () => {
    const r = bondCalc(
      { nominal: 10_000, couponRate: 6.25, settleOn, maturityOn: "2028-09-16", lastCouponOn: null },
      10_000_000,
      100,
    );
    expect(r.irr).toBeCloseTo(6.25, 2);
  });
});

describe("desk prices of 14 Sept (94 / 93 / 92)", () => {
  it("Ligne C at 94 % ≈ 11,2 % and 2 500 titles cost 24 452 740", () => {
    const r = bondCalc(
      { nominal: 10_000, couponRate: 6.5, settleOn, maturityOn: "2028-02-14", lastCouponOn: "2026-02-14" },
      25_000_000,
      94,
    );
    expect(Math.round(r.outlay)).toBe(24_452_740);
    expect(r.irr).toBeGreaterThan(11.1);
    expect(r.irr).toBeLessThan(11.3);
  });
});

describe("BTA precount", () => {
  it("52-week bond at 5,50 % precount yields more than 5,50 %", () => {
    const r = btaCalc({ nominal: 1_000_000, settleOn: "2026-09-17", maturityOn: "2027-09-16" }, 10_000_000, 5.5);
    expect(r.days).toBe(364);
    expect(r.pricePerBond).toBeCloseTo(944_388.9, 0);
    expect(r.yieldPct).toBeGreaterThan(5.8);
    expect(r.n).toBe(10);
  });
});

describe("dates", () => {
  it("tenor text", () => {
    expect(tenorText("2026-09-16", "2028-09-16")).toBe("2 ans");
    expect(tenorText("2026-09-16", "2029-08-12")).toBe("2 ans et 11 mois");
    expect(tenorText("2026-09-16", "2028-02-14")).toBe("1 an et 5 mois");
    expect(tenorText("2026-09-16", "2026-11-29")).toBe("2 mois");
    expect(tenorText("2026-09-16", "2026-09-30")).toBe("14 jours");
  });
  it("days between", () => {
    expect(daysBetween("2026-02-14", "2026-09-16")).toBe(214);
  });
});
