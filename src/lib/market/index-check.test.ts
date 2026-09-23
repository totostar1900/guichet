import { describe, expect, it } from "vitest";
import type { MarketBulletin, Quote } from "@/lib/domain/market";
import { indexCheck } from "./index";

/**
 * Le contrôle de Santé reconstitue la variation publiée avec les poids de
 * flottant de la séance : c'est la pondération vers laquelle la série pointe.
 * Un écart ne dit pas que la Bourse a tort, il dit qu'une séance est à
 * éclaircir.
 */
const quote = (mnemo: string, close: number, capFloat: number, variationPct = 0): Quote =>
  ({
    isin: `XX${mnemo}`,
    sessionDate: "2026-09-22",
    bulletinNo: 2600,
    instrument: "action",
    mnemo,
    issuer: mnemo,
    designation: mnemo,
    previousClose: close,
    previousDate: "2026-09-21",
    open: close,
    close,
    thresholdHigh: close * 1.1,
    thresholdLow: close * 0.9,
    variationPct,
    referenceNext: close,
    volumeTraded: 0,
    valueTraded: 0,
    trades: 0,
    status: "NC",
    marketCapFloat: capFloat,
  }) as Quote;

const bulletin = (variationPct: number): MarketBulletin =>
  ({
    id: "2026-09-22",
    number: 2600,
    sessionDate: "2026-09-22",
    ingestedAt: "2026-09-22T19:00:00Z",
    ingestedBy: "cron",
    status: "ok",
    indexValue: 1145.46,
    indexVariationPct: variationPct,
    counts: { equities: 2, bonds: 0, funds: 0 },
    warnings: [],
    anomalies: [],
    notices: [],
  }) as MarketBulletin;

describe("indexCheck, pondéré par le flottant", () => {
  it("reconstitutes a published move from the float weights of the session", () => {
    // BHC pèse 40 % du flottant et gagne 1 % : l'indice devrait gagner 0,40 %
    const prev = [quote("BHC", 100_000, 400), quote("SOCAP", 50_000, 600)];
    const now = [quote("BHC", 101_000, 400), quote("SOCAP", 50_000, 600)];
    const chk = indexCheck(bulletin(0.4), prev, now);
    expect(chk.ok).toBe(true);
    expect(chk.detail).toContain("reconstitué au flottant");
    expect(chk.detail).toContain("BHC");
  });

  it("would not reconstitute the same move on capitalisation weights", () => {
    // le même mouvement, publié à la hauteur que donnerait un poids de 12 %
    const prev = [quote("BHC", 100_000, 400), quote("SOCAP", 50_000, 600)];
    const now = [quote("BHC", 101_000, 400), quote("SOCAP", 50_000, 600)];
    expect(indexCheck(bulletin(0.12), prev, now).ok).toBe(false);
  });

  it("names a gap as a session to clear, not as an error", () => {
    const prev = [quote("BHC", 100_000, 400), quote("SOCAP", 50_000, 600)];
    const now = [quote("BHC", 110_000, 400), quote("SOCAP", 50_000, 600)];
    const chk = indexCheck(bulletin(0.5), prev, now);
    expect(chk.ok).toBe(false);
    expect(chk.detail).toContain("séance à éclaircir");
  });

  it("flags a move of the opposite sign", () => {
    const prev = [quote("BHC", 100_000, 400), quote("SOCAP", 50_000, 600)];
    const now = [quote("BHC", 101_000, 400), quote("SOCAP", 50_000, 600)];
    const chk = indexCheck(bulletin(-0.4), prev, now);
    expect(chk.ok).toBe(false);
    expect(chk.detail).toContain("sens contraire");
  });

  it("keeps the two direction checks", () => {
    const prev = [quote("BHC", 100_000, 400)];
    const flat = [quote("BHC", 100_000, 400)];
    expect(indexCheck(bulletin(1.2), prev, flat).ok).toBe(false);
    expect(indexCheck(bulletin(1.2), prev, flat).detail).toContain("Marché des actions");
    const moved = [quote("BHC", 101_000, 400)];
    expect(indexCheck(bulletin(0), prev, moved).ok).toBe(false);
    expect(indexCheck(bulletin(0), prev, moved).detail).toContain("bloc de l'indice");
  });

  it("says so rather than guessing when the float is not read", () => {
    const prev = [quote("BHC", 100_000, 0)];
    const now = [quote("BHC", 101_000, 0)];
    const chk = indexCheck(bulletin(0.4), prev, now);
    expect(chk.ok).toBe(true);
    expect(chk.detail).toContain("reconstitution impossible");
  });

  it("stays quiet when nothing moved, and when the index was not read", () => {
    const prev = [quote("BHC", 100_000, 400)];
    expect(indexCheck(bulletin(0), prev, prev).ok).toBe(true);
    expect(indexCheck(undefined, prev, prev).detail).toContain("non lu");
  });
});
