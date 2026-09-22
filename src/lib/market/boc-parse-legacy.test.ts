import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoc } from "./boc-parse";

/**
 * La mise en page d'avant novembre 2025 : le cours précédent, la date de
 * séance et le reste de la ligne sortaient du PDF sur trois lignes séparées,
 * là où le bulletin d'aujourd'hui les colle sur une seule. Le lecteur n'ouvrait
 * sa fenêtre de recollage que sur deux lignes : 31 séances sont restées sans
 * aucun cours d'action jusqu'à ce que la fenêtre passe à quatre.
 */
const text = readFileSync(new URL("./__fixtures__/BOC-20250903.txt", import.meta.url), "utf8");
const boc = parseBoc(text);

describe("BOC n° 2335 du 03/09/2025, ligne éclatée sur trois lignes", () => {
  it("reads the header and the index", () => {
    expect(boc.bulletinNo).toBe(2335);
    expect(boc.sessionDate).toBe("2025-09-03");
    expect(boc.index?.value).toBeCloseTo(1003.38, 2);
  });

  it("reads the six equities of the time, none of which the old window could reach", () => {
    expect(boc.equities.map((e) => e.mnemo)).toEqual(["SEMC", "SAF", "SOCAP", "REG", "BANGE", "SCGRE"]);
    expect(boc.warnings.filter((w) => /ligne dense non reconnue/.test(w))).toEqual([]);
  });

  it("reads the prices of a split row as the glued layout would", () => {
    const semc = boc.equities.find((e) => e.mnemo === "SEMC")!;
    expect(semc.previousClose).toBe(49000);
    expect(semc.previousDate).toBe("2025-09-02");
    expect(semc.close).toBe(49000);
    expect(semc.thresholdHigh).toBe(53900);
    expect(semc.thresholdLow).toBe(44100);
    expect(semc.variationPct).toBe(0);
  });

  it("still reads the capitalisation page of that bulletin", () => {
    expect(boc.capitalisation).toHaveLength(6);
    const socap = boc.capitalisation.find((c) => c.isin === "CM0000010025")!;
    expect(socap.sharesFloat).toBe(787080);
  });
});
