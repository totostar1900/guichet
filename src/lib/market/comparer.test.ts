import { describe, expect, it } from "vitest";
import { comparer, juger, verdict } from "./comparer";
import type { Quote } from "@/lib/domain/market";

/**
 * LE COMPARATEUR DE DEUX COTES.
 *
 * Il portait la mesure la plus utile du dépôt sans porter un seul test : sur
 * 805 couples de séances, 406 disparitions, 398 retours, 8 départs définitifs.
 * Autrement dit 98 % des « sorties de cote » sont des défauts de lecture, et
 * cette distinction décide de ce que le desk va faire : constater un
 * remboursement, ou relancer le lecteur. Une règle de cette portée se garde.
 */
const q = (isin: string, sessionDate: string, close = 100, instrument: Quote["instrument"] = "action"): Quote => ({
  isin,
  sessionDate,
  bulletinNo: 1,
  instrument,
  mnemo: isin.slice(-3),
  issuer: isin,
  designation: isin,
  previousClose: close,
  previousDate: sessionDate,
  open: close,
  close,
  thresholdHigh: close * 1.1,
  thresholdLow: close * 0.9,
  variationPct: 0,
  referenceNext: close,
  volumeTraded: 0,
  valueTraded: 0,
  trades: 0,
  status: "NC",
});

describe("comparer deux séances", () => {
  it("nomme ce qui part, ce qui arrive et ce qui bouge", () => {
    const e = comparer([q("AAA", "2026-01-01"), q("BBB", "2026-01-01", 50)], [q("BBB", "2026-01-02", 55), q("CCC", "2026-01-02")]);
    expect(e.partis.map((x) => x.isin)).toEqual(["AAA"]);
    expect(e.arrivees.map((x) => x.isin)).toEqual(["CCC"]);
    expect(e.communes).toBe(1);
    expect(e.bouges).toHaveLength(1);
    expect(e.bouges[0].variation).toBeCloseTo(10, 6);
  });

  it("ne divise pas par un cours précédent nul", () => {
    const e = comparer([q("AAA", "2026-01-01", 0)], [q("AAA", "2026-01-02", 40)]);
    expect(e.bouges[0].variation).toBeUndefined();
  });

  it("laisse le verdict en suspens : il n'appartient pas à l'écart", () => {
    const e = comparer([q("AAA", "2026-01-01")], []);
    expect(e.partis[0].retour).toBeUndefined();
  });
});

describe("juger par la suite de la série", () => {
  /* La série de chaque ligne, telle que la base la rendrait. */
  const serie: Record<string, string[]> = {
    AAA: ["2026-01-01", "2026-01-05"], // absente le 02, revenue le 05
    DDD: ["2026-01-01"], // jamais revue
    CCC: ["2026-01-02"], // vue pour la première fois le 02
    EEE: ["2025-06-30", "2026-01-02"], // déjà vue : c'est un retour
  };
  const suite = async (isin: string) => (serie[isin] ?? []).map((d) => ({ sessionDate: d }));

  it("une ligne qui revient n'est jamais sortie de la cote", async () => {
    const e = comparer([q("AAA", "2026-01-01"), q("DDD", "2026-01-01")], []);
    await juger(e, "2026-01-02", suite);
    expect(e.partis.find((x) => x.isin === "AAA")!.retour).toBe("2026-01-05");
    expect(e.partis.find((x) => x.isin === "DDD")!.retour).toBeUndefined();
  });

  it("une arrivée déjà vue autrefois est un retour, pas une première cotation", async () => {
    const e = comparer([], [q("CCC", "2026-01-02"), q("EEE", "2026-01-02")]);
    await juger(e, "2026-01-02", suite);
    expect(e.arrivees.find((x) => x.isin === "CCC")!.premiere).toBe(true);
    expect(e.arrivees.find((x) => x.isin === "EEE")!.premiere).toBe(false);
  });

  it("et le verdict distingue alors la lecture du marché", async () => {
    const lecture = comparer([q("AAA", "2026-01-01")], []);
    await juger(lecture, "2026-01-02", suite);
    expect(verdict(lecture)).toBe("lecture");

    const marche = comparer([q("DDD", "2026-01-01")], []);
    await juger(marche, "2026-01-02", suite);
    expect(verdict(marche)).toBe("marche");

    expect(verdict(comparer([q("AAA", "2026-01-01")], [q("AAA", "2026-01-02")]))).toBe("rien");
  });
});

