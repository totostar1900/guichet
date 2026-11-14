import { describe, expect, it } from "vitest";
import { dividendeBrut } from "./dividende-brut";

const socap = [{ year: 2023, dividendPerShare: 2600 }, { year: 2024, dividendPerShare: 2500 }, { year: 2025, dividendPerShare: 2325 }];

describe("dividendeBrut", () => {
  it("écrit le brut publié quand le bulletin porte le montant net du même exercice (89 % et 90 %)", () => {
    expect(dividendeBrut({ lastDividend: 2225, dividendYear: 2024 }, socap)).toBe(2500);
    expect(dividendeBrut({ lastDividend: 433.16, dividendYear: 2024 }, [{ year: 2024, dividendPerShare: 481.3 }])).toBe(481.3);
    expect(dividendeBrut({ lastDividend: 4025.33, dividendYear: 2024 }, [{ year: 2024, dividendPerShare: 4472.59 }])).toBe(4472.59);
    expect(dividendeBrut({ lastDividend: 1780, dividendYear: 2024 }, [{ year: 2024, dividendPerShare: 2000 }])).toBe(2000);
  });
  it("garde le montant quand il est déjà le brut", () => {
    expect(dividendeBrut({ lastDividend: 2325, dividendYear: 2025 }, socap)).toBe(2325);
    expect(dividendeBrut({ lastDividend: 2500, dividendYear: 2025 }, [{ year: 2025, dividendPerShare: 2500 }])).toBe(2500);
  });
  it("prend le brut publié quand le bulletin le diffère de quelques unités (724 contre 728)", () => {
    expect(dividendeBrut({ lastDividend: 724, dividendYear: 2023 }, [{ year: 2023, dividendPerShare: 728 }])).toBe(728);
  });
  it("garde le montant du bulletin quand la société n'a rien publié pour cet exercice, ou quand les deux montants ne se ressemblent pas", () => {
    expect(dividendeBrut({ lastDividend: 540, dividendYear: 2026 }, socap)).toBe(540);
    expect(dividendeBrut({ lastDividend: 540, dividendYear: 2024 }, socap), "un versement d'une autre société a été pris pour du net").toBe(540);
    expect(dividendeBrut({ lastDividend: 540 }, undefined)).toBe(540);
  });
  it("ne répond rien quand le bulletin ne porte aucun dividende", () => {
    expect(dividendeBrut({ lastDividend: null }, socap)).toBeUndefined();
    expect(dividendeBrut({}, socap)).toBeUndefined();
  });
  it("sans exercice nommé, compare au dernier exercice publié", () => {
    expect(dividendeBrut({ lastDividend: 2225 }, [{ year: 2023, dividendPerShare: 2600 }, { year: 2024, dividendPerShare: 2500 }])).toBe(2500);
  });
});
