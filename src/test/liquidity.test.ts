import { describe, expect, it } from "vitest";
import type { Quote, QuoteActivity } from "@/lib/domain/market";
import type { AuctionResult } from "@/lib/market/auction-results";
import { pressureByYear, programByYear } from "@/lib/market/auction-stats";
import { freshness, liquidity } from "@/lib/market/liquidity";

/**
 * Les mesures du marché secondaire, et ce qu'elles refusent de laisser croire.
 *
 * « Marché étroit » est une opinion. « Quatre pour cent des lignes-séances ont
 * traité » est une mesure, et c'est elle qui doit accompagner un cours. Les
 * règles ci-dessous tiennent surtout à la dormance : une ligne cotée tous les
 * jours et traitée deux fois l'an porte un cours reporté, et rien dans le
 * bulletin ne le dit à sa place.
 */

const a = (isin: string, date: string, trades = 0, value = 0): QuoteActivity => ({ isin, sessionDate: date, volumeTraded: trades ? 10 : 0, valueTraded: value, trades });
const ligne = (isin: string, mnemo: string, instrument: Quote["instrument"]): Quote =>
  ({ isin, mnemo, instrument, issuer: "X", designation: mnemo, sessionDate: "2026-09-25", bulletinNo: 1, previousClose: 100, previousDate: "2026-09-24", open: 100, close: 100, thresholdHigh: 103, thresholdLow: 97, variationPct: 0, referenceNext: 100, volumeTraded: 0, valueTraded: 0, trades: 0, status: "" }) as Quote;

describe("la liquidité", () => {
  const lignes = [ligne("A", "SOCAP", "action"), ligne("B", "SAF", "action"), ligne("C", "ECM R9", "obligation")];
  const jours = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"];
  const activite = [
    ...jours.map((d) => a("A", d, d === "2026-09-22" ? 2 : 0, d === "2026-09-22" ? 500 : 0)),
    ...jours.map((d) => a("B", d, d === "2026-09-25" ? 1 : 0, d === "2026-09-25" ? 300 : 0)),
    ...jours.map((d) => a("C", d)),
  ];

  it("compte la part traitée sur les couples ligne-séance", () => {
    const l = liquidity(activite, lignes)!;
    expect(l.lineSessions).toBe(15);
    expect(l.traded).toBe(2);
    expect(l.share).toBeCloseTo((2 / 15) * 100, 6);
  });

  it("compte les séances où rien n'a traité sur toute la cote", () => {
    const l = liquidity(activite, lignes)!;
    expect(l.mute).toBe(3);
    expect(l.sessions).toBe(5);
  });

  /**
   * Une obligation qui n'a jamais traité n'a pas une dormance de zéro : elle
   * n'en a pas. Mettre zéro la rangerait parmi les lignes fraîches, ce qui est
   * exactement l'inverse de ce qu'elle est.
   */
  it("laisse sans dormance une ligne qui n'a jamais traité", () => {
    const l = liquidity(activite, lignes)!;
    const c = l.lines.find((x) => x.isin === "C")!;
    expect(c.traded).toBe(0);
    expect(c.lastTrade).toBeUndefined();
    expect(c.staleDays).toBeUndefined();
  });

  it("date la dormance depuis la dernière séance observée", () => {
    const l = liquidity(activite, lignes)!;
    expect(l.on).toBe("2026-09-25");
    expect(l.lines.find((x) => x.isin === "A")!.staleDays).toBe(3);
    expect(l.lines.find((x) => x.isin === "B")!.staleDays).toBe(0);
  });

  it("ne rend rien plutôt qu'un zéro quand il n'y a pas d'activité", () => {
    expect(liquidity([], lignes)).toBeUndefined();
  });
});

describe("la fraîcheur de l'indice", () => {
  const lignes = [ligne("A", "SOCAP", "action"), ligne("B", "SAF", "action"), ligne("C", "ECM R9", "obligation")];
  const jours = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"];
  const activite = [...jours.map((d) => a("A", d, d === "2026-08-01" ? 1 : 0)), ...jours.map((d) => a("B", d, d === "2026-09-25" ? 1 : 0)), ...jours.map((d) => a("C", d))];

  it("ne regarde que les actions : l'indice est un panier d'actions", () => {
    const f = freshness(liquidity(activite, lignes)!)!;
    expect(f.total).toBe(2);
  });

  it("compte les composantes traitées à la dernière séance", () => {
    const f = freshness(liquidity(activite, lignes)!)!;
    expect(f.tradedLast).toBe(1);
  });

  it("nomme les composantes dormantes au-delà du seuil", () => {
    const f = freshness(liquidity(activite, lignes)!, 3)!;
    expect(f.stale.map((s) => s.mnemo)).toEqual(["SOCAP"]);
  });
});

const s = (over: Partial<AuctionResult>): AuctionResult => ({
  id: over.id ?? "x",
  country: "Cameroun",
  instrument: "BTA",
  tenor: "26 semaines",
  sessionOn: "2026-09-15",
  abondement: false,
  sourceUrl: `https://beac.int/${over.id ?? "x"}.pdf`,
  sourceTitle: "RESULTATS",
  createdAt: "2026-09-16T10:00:00Z",
  updatedAt: "2026-09-16T10:00:00Z",
  ...over,
});

describe("la pression de la demande", () => {
  const lot = [
    s({ id: "a", sessionOn: "2020-01-08", announced: 20e9, bid: 41e9, served: 20e9, bidders: 6 }),
    s({ id: "b", sessionOn: "2020-08-05", announced: 15e9, bid: 37e9, served: 15e9, bidders: 8 }),
    s({ id: "c", sessionOn: "2026-08-03", announced: 20e9, bid: 15e9, served: 15e9, bidders: 5 }),
    s({ id: "d", sessionOn: "2026-09-15", announced: 10e9, bid: 0.25e9, served: 0.25e9, bidders: 1 }),
  ];

  it("moyenne par année, et porte le compte des séances", () => {
    const p = pressureByYear(lot);
    expect(p.map((x) => x.year)).toEqual(["2020", "2026"]);
    expect(p[0].n).toBe(2);
    expect(p[0].coverage).toBeGreaterThan(2);
    expect(p[1].coverage).toBeLessThan(1);
  });

  /**
   * Les deux mesures se lisent ensemble. Une couverture qui tombe pendant que
   * la part servie monte vers cent pour cent ne laisse aucune place à
   * l'interprétation : le Trésor ne trie plus.
   */
  it("fait monter la part servie quand la couverture tombe", () => {
    const p = pressureByYear(lot);
    expect(p[0].allotment!).toBeLessThan(p[1].allotment!);
    expect(p[1].allotment!).toBeCloseTo(100, 0);
  });

  it("écarte une séance sans montant : elle ne se moyenne pas", () => {
    expect(pressureByYear([...lot, s({ id: "vide", sessionOn: "2026-01-05" })]).find((x) => x.year === "2026")!.n).toBe(2);
  });
});

describe("l'exécution du programme", () => {
  it("rapporte le servi à l'annoncé, par Trésor et par année", () => {
    const p = programByYear([
      s({ id: "a", country: "Congo", sessionOn: "2026-07-21", announced: 10e9, served: 6.51e9 }),
      s({ id: "b", country: "Congo", sessionOn: "2026-07-28", announced: 10e9, served: 10e9 }),
      s({ id: "c", country: "Cameroun", sessionOn: "2026-08-03", announced: 20e9, served: 15e9 }),
    ]);
    const congo = p.find((x) => x.country === "Congo")!;
    expect(congo.sessions).toBe(2);
    expect(congo.execution).toBeCloseTo(82.55, 2);
    expect(p.find((x) => x.country === "Cameroun")!.execution).toBeCloseTo(75, 6);
  });
});
