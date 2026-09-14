import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoc } from "./boc-parse";

const text = readFileSync(new URL("./__fixtures__/BOC-20260804.txt", import.meta.url), "utf8");
const boc = parseBoc(text);

describe("BOC n° 2565 du 04/08/2026", () => {
  it("reads the header and the index", () => {
    expect(boc.bulletinNo).toBe(2565);
    expect(boc.sessionDate).toBe("2026-08-04");
    expect(boc.index?.value).toBeCloseTo(1132.95, 2);
  });

  it("reads the 7 listed equities with prices and thresholds", () => {
    expect(boc.equities.map((e) => e.isin)).toEqual(["CM0000010009", "CM0000010017", "CM0000010025", "CM0000010041", "GQ0000010050", "GA0000010066", "GA0000010074"]);
    const bhc = boc.equities.find((e) => e.isin === "GA0000010074")!;
    expect(bhc.mnemo).toBe("BHC");
    expect(bhc.close).toBe(90000);
    expect(bhc.previousClose).toBe(90000);
    expect(bhc.previousDate).toBe("2026-08-03");
    expect(bhc.ytdVariationPct).toBeNull();
    const scgre = boc.equities.find((e) => e.isin === "GA0000010066")!;
    expect(scgre.volumeTraded).toBe(1);
    expect(scgre.valueTraded).toBe(20000);
    expect(scgre.status).toBe("PEq");
    const sem = boc.equities[0];
    expect(sem.thresholdHigh).toBe(58300);
    expect(sem.thresholdLow).toBe(47700);
    expect(sem.ytdVariationPct).toBeCloseTo(8.16, 2);
    expect(sem.issuer).toMatch(/EAUX MINERALES/);
  });

  it("reads state, regional and private bonds", () => {
    const etats = boc.bonds.filter((b) => b.segment === "etats");
    expect(etats.length).toBe(20);
    const ecmr6 = boc.bonds.find((b) => b.isin === "CM0000020305")!;
    expect(ecmr6.mnemo).toBe("ECMR6");
    expect(ecmr6.issuer).toBe("ETAT DU CAMEROUN");
    expect(ecmr6.designation).toBe("ECMR 6.25% NET 2022-2029");
    expect(ecmr6.previousPct).toBe(100);
    expect(ecmr6.nominalRemaining).toBe(6000);
    expect(ecmr6.accruedCoupon).toBeCloseTo(73.97, 2);
    expect(ecmr6.close).toBe(100);
    expect(ecmr6.referenceNextFcfa).toBe(6000);
    const ecm10 = boc.bonds.find((b) => b.isin === "CM0000020388")!;
    expect(ecm10.previousPct).toBe(99);
    expect(ecm10.thresholdHigh).toBeCloseTo(104.94, 2);
    expect(boc.bonds.some((b) => b.segment === "regionales" && b.isin === "CG0000020220")).toBe(true);
    expect(boc.bonds.some((b) => b.segment === "privees" && b.isin === "CM0000020412")).toBe(true);
    expect(boc.bonds.length).toBe(32);
    expect(new Set(boc.bonds.map((b) => b.isin)).size).toBe(32);
    const alios = boc.bonds.find((b) => b.isin === "CM0000020412")!;
    expect(alios.issuer).toBe("ALIOS FINANCE");
    expect(alios.designation).toBe("ALIOS 6.5% BRUT 2023-2028");
  });

  it("reads the OPCVM NAVs with manager, depositary, category and frequency", () => {
    expect(boc.funds.length).toBeGreaterThanOrEqual(30);
    const asca = boc.funds.find((f) => f.name === "FCP ASCA LIQUIDITES")!;
    expect(asca.manager).toBe("ASCA ASSET MANAGEMENT");
    expect(asca.depositary).toBe("ASCA");
    expect(asca.category).toBe("M");
    expect(asca.frequency).toBe("hebdomadaire");
    expect(asca.navOrigin).toBe(10000);
    expect(asca.nav).toBeCloseTo(14832.48, 2);
    expect(asca.navDate).toBe("2026-07-23");
    expect(asca.perfSinceInceptionPct).toBeCloseTo(48.32, 2);
    const avenir = boc.funds.find((f) => f.name === "FCP AB AVENIR")!;
    expect(avenir.frequency).toBe("quotidienne");
    expect(avenir.depositary).toBe("BGFIBANK CAMEROUN");
    const wrapped = boc.funds.find((f) => f.name.startsWith("FCP ECOBANK MONETAIRE"))!;
    expect(wrapped.manager).toBe("EDC ASSET MANAGEMENT CEMAC");
    expect(wrapped.nav).toBeCloseTo(1174.63, 2);
    const parts = boc.funds.find((f) => /CONTACTURER OBLIGATAIRE.*PARTS A/.test(f.name))!;
    expect(parts.nav).toBeCloseTo(11412.64, 2);
    // one row per fund: repeats in the monthly / quarterly sections only add variations
    expect(new Set(boc.funds.map((f) => f.name)).size).toBe(boc.funds.length);
    const diversifie = boc.funds.find((f) => f.name === "FCP HARVEST DIVERSIFIE")!;
    expect(diversifie.frequency).toBe("quotidienne");
    expect(diversifie.variationMonthlyPct).toBeCloseTo(0.69, 2);
    expect(diversifie.variationQuarterlyPct).toBeCloseTo(1.29, 2);
    const corridor = boc.funds.find((f) => f.name === "FCP CORRIDOR RENDEMENT")!;
    expect(corridor.previousNav).toBeCloseTo(11889.26, 2);
    expect(boc.funds.find((f) => f.name === "FCPE CONTACTURER EPARGNE SALARIALE")).toBeDefined();
    expect(boc.funds.find((f) => f.name === "FCP SOGEFIRST")!.depositary).toBe("SOCIETE GENERALE CAMEROUN");
  });

  it("collects the notices", () => {
    expect(boc.notices.some((n) => /APE ALIOS 2025/.test(n))).toBe(true);
    expect(boc.warnings).toEqual([]);
  });
});
