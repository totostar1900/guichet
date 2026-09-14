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

describe("BOC n° 2591 du 09/09/2026 — a session where a bond traded", () => {
  const b = parseBoc(readFileSync(new URL("./__fixtures__/BOC-20260909.txt", import.meta.url), "utf8"));
  it("reads every bond even when the next head is glued to a traded row", () => {
    expect(b.bulletinNo).toBe(2591);
    expect(b.warnings).toEqual([]);
    expect(b.bonds.length).toBe(31);
    const ega15 = b.bonds.find((x) => x.isin === "GA0000020552")!;
    expect(ega15.status).toBe("PEq");
    expect(ega15.close).toBe(97);
    expect(ega15.accruedCoupon).toBeCloseTo(466.52, 2);
    const ega16 = b.bonds.find((x) => x.isin === "GA0000020560")!;
    expect(ega16.mnemo).toBe("EGA16");
    expect(ega16.previousPct).toBe(97);
  });
});

describe("capitalisation table", () => {
  const b = parseBoc(readFileSync(new URL("./__fixtures__/BOC-20260909.txt", import.meta.url), "utf8"));
  it("reads shares, dividend and market cap of the 7 equities", () => {
    expect(b.capitalisation.length).toBe(7);
    const semc = b.capitalisation.find((c) => c.isin === "CM0000010009")!;
    expect(semc.mnemo).toBe("SEMC");
    expect(semc.close).toBe(53000);
    expect(semc.sharesFloat).toBe(38367);
    expect(semc.sharesTotal).toBe(192473);
    expect(semc.lastDividend).toBe(800);
    expect(semc.dividendYear).toBe(2025);
    expect(semc.dividendDate).toBe("2026-06-25");
    expect(semc.marketCapFloat).toBe(2_033_451_000);
    expect(semc.marketCapTotal).toBe(10_201_069_000);
    const bhc = b.capitalisation.find((c) => c.mnemo === "BHC")!;
    expect(bhc.sharesTotal).toBe(14_728_385);
    expect(bhc.lastDividend).toBe(2500);
    expect(bhc.marketCapTotal).toBe(1_370_490_952_635);
    const reg = b.capitalisation.find((c) => c.mnemo === "REG")!;
    expect(reg.dividendYear).toBe(2023);
    expect(reg.lastDividend).toBe(894);
  });
});

describe("BOC n° 2421 du 05/01/2026 — older dense layout", () => {
  const b = parseBoc(readFileSync(new URL("./__fixtures__/BOC-20260105.txt", import.meta.url), "utf8"));
  it("reads the six equities from glued rows", () => {
    expect(b.equities.length).toBe(6);
    const semc = b.equities.find((e) => e.isin === "CM0000010009")!;
    expect(semc.mnemo).toBe("SEMC");
    expect(semc.previousClose).toBe(49000);
    expect(semc.close).toBe(49000);
    expect(semc.thresholdHigh).toBe(53900);
    expect(semc.thresholdLow).toBe(44100);
    expect(semc.ytdVariationPct).toBeCloseTo(4.26, 2);
    const bange = b.equities.find((e) => e.isin === "GQ0000010050")!;
    expect(bange.close).toBe(228085);
    const reg = b.equities.find((e) => e.isin === "CM0000010041")!;
    expect(reg.ytdVariationPct).toBeCloseTo(-1.18, 2);
  });
  it("reads the regional and private bonds of the older layout", () => {
    const bdeac = b.bonds.find((x) => x.isin === "CG0000020261")!;
    expect(bdeac.previousPct).toBe(98.5);
    expect(bdeac.nominalRemaining).toBe(6000);
    expect(bdeac.accruedCoupon).toBeCloseTo(28.54, 2);
    expect(b.bonds.some((x) => x.isin === "CM0000020412")).toBe(true);
    expect(b.warnings.filter((w) => /Obligation|Action/.test(w))).toEqual([]);
  });
});

describe("BOC n° 2551 du 15/07/2026 — issuer glued to the ISIN, traded dense rows", () => {
  const b = parseBoc(readFileSync(new URL("./__fixtures__/BOC-20260715.txt", import.meta.url), "utf8"));
  it("reads all seven equities including La Régionale and BHC", () => {
    expect(b.equities.map((e) => e.mnemo).sort()).toEqual(["BANGE", "BHC", "REG", "SAF", "SCGRE", "SEMC", "SOCAP"]);
    const bhc = b.equities.find((e) => e.mnemo === "BHC")!;
    expect(bhc.close).toBe(86000);
    expect(bhc.status).toBe("PEq");
    expect(bhc.valueTraded).toBe(18_748_000);
    expect(bhc.trades).toBe(2);
    expect(bhc.volumeTraded).toBe(218);
    expect(bhc.ytdVariationPct).toBeNull();
    const reg = b.equities.find((e) => e.mnemo === "REG")!;
    expect(reg.close).toBe(39000);
    expect(reg.issuer).toMatch(/REGIONALE/);
  });
});

describe("OPCVM rows the BVMAC prints oddly", () => {
  const head = "BULLETIN OFFICIEL DE LA COTE N° 2400 DU 05/01/2026\nOPCVM :\nhebdomadaires\n";
  it("accepts a three-digit month and keeps the fund name clean", () => {
    const text = `${head}HARVEST ASSET MANAGEMENT BANQUE ATLANTQUE CAMEROUN FCP ATLANTIQUE PERFORMANCE 0 10 000 14 765,39 05/012/2025 14 845,18 09/01/2026 17/09/2021 48,45% 0,54%\nHARVEST ASSET MANAGEMENT BANQUE ATLANTQUE CAMEROUN FCP HARVEST LIQUIDITES M 10 000 12 000,00 02/01/2026 12 010,00 09/01/2026 17/09/2021 20,10% 0,08%\n`;
    const b = parseBoc(text);
    expect(b.funds.map((f) => f.name)).toEqual(["FCP ATLANTIQUE PERFORMANCE", "FCP HARVEST LIQUIDITES"]);
    expect(b.funds[0].previousDate).toBe("2025-12-05");
    expect(b.funds[1].manager).toBe("HARVEST ASSET MANAGEMENT");
  });
  it("drops a row whose figures cannot be read instead of gluing it to the next name", () => {
    const text = `${head}HARVEST ASSET MANAGEMENT BANQUE ATLANTQUE CAMEROUN FCP ATLANTIQUE PERFORMANCE 0 10 000 14 765,39 05/2025 14 845,18 09/01/2026 17/09/2021 48,45% 0,54%\nHARVEST ASSET MANAGEMENT BANQUE ATLANTQUE CAMEROUN FCP HARVEST LIQUIDITES M 10 000 12 000,00 02/01/2026 12 010,00 09/01/2026 17/09/2021 20,10% 0,08%\n`;
    const b = parseBoc(text);
    expect(b.funds.map((f) => f.name)).toEqual(["FCP HARVEST LIQUIDITES"]);
    expect(b.funds[0].manager).toBe("HARVEST ASSET MANAGEMENT");
    expect(b.funds[0].depositary).toBe("BANQUE ATLANTQUE CAMEROUN");
    expect(b.warnings.some((w) => w.startsWith("OPCVM : ligne ignorée"))).toBe(true);
  });
});
