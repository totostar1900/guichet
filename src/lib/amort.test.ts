import { describe, expect, it } from "vitest";
import { amortCalc, paymentDates } from "./finance";
import { localIso } from "./format";

describe("amortCalc : BVMAC fiche schedules", () => {
  it("ECMR 6,25 % 2022-2029: three equal instalments on 27/05, interest on the outstanding", () => {
    // Fiche: 141 bn outstanding → 47 bn on 27/05/2027, 2028, 2029; interest 8 812,5 / 5 875 / 2 937,5 M.
    const r = amortCalc({ nominal: 6000, couponRate: 6.25, settleOn: "2026-09-18", maturityOn: "2029-05-27", periodsPerYear: 1 }, 6000 * 1000, 100);
    expect(r.flows.map((f) => localIso(f.date))).toEqual(["2027-05-27", "2028-05-27", "2029-05-27"]);
    const perTitle = r.flows.map((f) => f.amount / 1000);
    expect(perTitle[0]).toBeCloseTo(2000 + 375, 6); // capital 2000 + 6.25 % × 6000
    expect(perTitle[1]).toBeCloseTo(2000 + 250, 6);
    expect(perTitle[2]).toBeCloseTo(2000 + 125, 6);
    expect(r.accruedDays).toBe(114); // since 27/05/2026
    expect(r.irr).toBeGreaterThan(6.1);
    expect(r.irr).toBeLessThan(6.45);
  });
  it("ACEP 7 % semi-annual: 3 instalments, half-year interest", () => {
    const r = amortCalc({ nominal: 6000, couponRate: 7, settleOn: "2026-09-18", maturityOn: "2027-12-30", periodsPerYear: 2 }, 6000 * 100, 100);
    expect(r.flows.map((f) => localIso(f.date))).toEqual(["2026-12-30", "2027-06-30", "2027-12-30"]);
    expect(r.flows[0].amount / 100).toBeCloseTo(2000 + 210, 6); // 3.5 % × 6000
  });
  it("grace period: interest only until the grace date", () => {
    const r = amortCalc({ nominal: 10000, couponRate: 6, settleOn: "2026-09-18", maturityOn: "2028-04-05", periodsPerYear: 1, graceUntil: "2027-04-05" }, 10000 * 10, 100);
    expect(r.flows.map((f) => f.label)).toEqual(["Coupon", "Coupon + capital"]);
    expect(r.flows[1].amount / 10).toBeCloseTo(10600, 6);
  });
  it("paymentDates steps quarterly", () => {
    expect(paymentDates("2026-09-18", "2027-08-07", 4).map((d) => localIso(d))).toEqual(["2026-11-07", "2027-02-07", "2027-05-07", "2027-08-07"]);
  });
});
