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

describe("les rapports des comptes d'une société cotée", () => {
  it("la marge nette, la rentabilité des fonds propres et la part des fonds propres", async () => {
    const { margeNettePct, rentabiliteFondsPropresPct, partFondsPropresPct } = await import("./finance");
    expect(margeNettePct(840_686_520, 10_456_986_789)).toBeCloseTo(8.04, 2);
    expect(rentabiliteFondsPropresPct(840_686_520, 4_767_320_406)).toBeCloseTo(17.63, 2);
    expect(partFondsPropresPct(4_767_320_406, 7_848_354_395)).toBeCloseTo(60.74, 2);
  });
  it("un rapport trompeur n'est pas rendu : résultat net au-dessus des produits (BHC), dénominateur nul ou négatif", async () => {
    const { margeNettePct, rentabiliteFondsPropresPct, partFondsPropresPct } = await import("./finance");
    expect(margeNettePct(59_489, 30_334), "BHC 2025 : 196 % n'est pas une marge").toBeNull();
    expect(margeNettePct(-5, 100), "une perte est une marge négative, pas un trou").toBeCloseTo(-5, 5);
    expect(margeNettePct(5, 0)).toBeNull();
    expect(rentabiliteFondsPropresPct(5, 0)).toBeNull();
    expect(rentabiliteFondsPropresPct(5, -3)).toBeNull();
    expect(partFondsPropresPct(5, 0)).toBeNull();
  });
});

describe("la capitalisation et les rapports qui en découlent", () => {
  it("la capitalisation, le rapport cours / bénéfice, le cours / valeur comptable, le rendement (SAFACAM, démonstration)", async () => {
    const { capitalisation, rapportCoursBenefice, coursSurValeurComptable, rendementDividendePct } = await import("./finance");
    const cap = capitalisation(32_000, 1_242_000);
    expect(cap).toBe(39_744_000_000);
    expect(rapportCoursBenefice(cap, 3_219_423_726)).toBeCloseTo(12.35, 2);
    expect(coursSurValeurComptable(cap, 22_149_885_911)).toBeCloseTo(1.79, 2);
    expect(rendementDividendePct(2_200, 32_000)).toBeCloseTo(6.875, 3);
  });
  it("un changement du nombre de titres ne change ni le rapport cours / bénéfice ni le cours / valeur comptable", async () => {
    const { capitalisation, rapportCoursBenefice, coursSurValeurComptable } = await import("./finance");
    /* Division du nominal par 5 : cinq fois plus de titres, un cinquième du cours. */
    const avant = capitalisation(50_000, 1_000_000);
    const apres = capitalisation(10_000, 5_000_000);
    expect(apres).toBe(avant);
    expect(rapportCoursBenefice(apres, 2_000_000_000)).toBe(rapportCoursBenefice(avant, 2_000_000_000));
    expect(coursSurValeurComptable(apres, 9_000_000_000)).toBe(coursSurValeurComptable(avant, 9_000_000_000));
  });
  it("un rapport qui ne veut rien dire rend null : résultat net nul ou négatif, capitaux propres négatifs, dividende inconnu, cours nul", async () => {
    const { rapportCoursBenefice, coursSurValeurComptable, rendementDividendePct } = await import("./finance");
    expect(rapportCoursBenefice(1e9, 0)).toBeNull();
    expect(rapportCoursBenefice(1e9, -5)).toBeNull();
    expect(coursSurValeurComptable(1e9, -1)).toBeNull();
    expect(rendementDividendePct(null, 1000)).toBeNull();
    expect(rendementDividendePct(undefined, 1000)).toBeNull();
    expect(rendementDividendePct(100, 0)).toBeNull();
    expect(rendementDividendePct(0, 1000), "un dividende de zéro est un rendement de zéro, pas un trou").toBe(0);
  });
});

describe("la rotation du flottant", () => {
  it("valeur échangée ÷ capitalisation flottante, en %, et rien sans flottant", async () => {
    const { rotationDuFlottantPct } = await import("./finance");
    expect(rotationDuFlottantPct(250_000_000, 7_950_000_000)).toBeCloseTo(3.145, 3);
    expect(rotationDuFlottantPct(0, 7_950_000_000), "aucun échange : zéro, pas un trou").toBe(0);
    expect(rotationDuFlottantPct(1000, 0)).toBeNull();
    expect(rotationDuFlottantPct(-1, 100)).toBeNull();
  });
});
