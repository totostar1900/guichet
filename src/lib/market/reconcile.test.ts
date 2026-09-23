import { describe, expect, it } from "vitest";
import type { MarketBulletin, Quote } from "@/lib/domain/market";
import type { Offer } from "@/lib/domain/types";
import { reconcileLines, reconcileSummary } from "./reconcile";

/**
 * Ce que le Guichet copie du bulletin se vérifie ligne par ligne. Ce qu'il
 * cesse de copier aussi : une ligne qui quitte la cote reste commandable tant
 * que personne ne la retire.
 */
const quote = (isin: string, close: number, instrument: Quote["instrument"] = "obligation", sessionDate = "2026-09-22"): Quote =>
  ({
    isin,
    sessionDate,
    bulletinNo: 2600,
    instrument,
    mnemo: isin.slice(0, 5),
    issuer: "Émetteur",
    designation: "OBL 6 % 2021-2026",
    previousClose: close,
    previousDate: "2026-09-21",
    open: close,
    close,
    thresholdHigh: close,
    thresholdLow: close,
    variationPct: 0,
    referenceNext: close,
    volumeTraded: 0,
    valueTraded: 0,
    trades: 0,
    status: "NC",
  }) as Quote;

const offer = (isin: string, over: Partial<Offer> = {}): Offer =>
  ({
    id: `boc-${isin.toLowerCase()}`,
    kind: "MARCHE",
    operation: "secondaire",
    country: "CM",
    countryName: "Cameroun",
    issuer: "Émetteur",
    title: `Ligne ${isin}`,
    isin,
    status: "published",
    blurb: "",
    documents: [],
    opensAt: "2026-01-01T09:00:00",
    deadlineAt: "2099-12-31T17:00:00",
    settleOn: "2026-09-22",
    nominal: 10_000,
    commissionPct: 0,
    market: "BVMAC",
    instrument: "obligation",
    lotSize: 1,
    settlementDays: 3,
    version: 0,
    lastPrice: 100,
    lastPriceOn: "2026-09-22",
    ...over,
  }) as Offer;

const bulletin = (sessionDate: string, number = 2600): MarketBulletin =>
  ({ id: sessionDate, number, sessionDate, ingestedAt: `${sessionDate}T19:00:00Z`, ingestedBy: "cron", status: "ok", counts: { equities: 0, bonds: 0, funds: 0 }, warnings: [], anomalies: [], notices: [] }) as MarketBulletin;

/** Cinq séances, la plus récente en tête. */
const DATES = ["2026-09-22", "2026-09-21", "2026-09-18", "2026-09-17", "2026-09-16"];
const bulletins = DATES.map((d) => bulletin(d));
const withQuotes = (perDate: Record<string, Quote[]>) => new Map(DATES.map((d) => [d, perDate[d] ?? []]));

describe("les lignes publiées contre le bulletin", () => {
  const cotee = quote("CM0000020001", 100);
  const toutesLesSeances = withQuotes(Object.fromEntries(DATES.map((d) => [d, [quote("CM0000020001", 100, "obligation", d)]])));

  it("says nothing when every line matches", () => {
    const issues = reconcileLines({ offers: [offer("CM0000020001")], bulletins, quotesByDate: toutesLesSeances });
    expect(issues).toEqual([]);
    expect(reconcileSummary(issues)).toBe("chaque ligne publiée est celle du bulletin");
  });

  it("catches a price that drifted from the bulletin", () => {
    const issues = reconcileLines({ offers: [offer("CM0000020001", { lastPrice: 99 })], bulletins, quotesByDate: toutesLesSeances });
    expect(issues.map((i) => i.kind)).toEqual(["prix"]);
    expect(issues[0].detail).toContain("99");
  });

  it("catches a line the bulletin quotes and we do not publish", () => {
    const issues = reconcileLines({ offers: [], bulletins, quotesByDate: toutesLesSeances });
    expect(issues.map((i) => i.kind)).toEqual(["absente"]);
  });

  it("leaves a line alone when it merely missed one session", () => {
    const perDate = Object.fromEntries(DATES.map((d) => [d, d === "2026-09-22" ? [] : [quote("CM0000020001", 100, "obligation", d)]]));
    // la séance du jour ne la porte pas, mais les précédentes oui
    perDate["2026-09-22"] = [quote("CM0000020002", 100)];
    const issues = reconcileLines({ offers: [offer("CM0000020001"), offer("CM0000020002")], bulletins, quotesByDate: withQuotes(perDate) });
    expect(issues.filter((i) => i.isin === "CM0000020001")).toEqual([]);
  });

  it("names a line gone from every recent session, and retires it only when its maturity has passed", () => {
    const perDate = Object.fromEntries(DATES.map((d) => [d, [quote("CM0000020002", 100, "obligation", d)]]));
    const now = new Date("2026-09-23T12:00:00Z");
    const echue = reconcileLines({ offers: [offer("CM0000020001", { maturityOn: "2026-06-23" }), offer("CM0000020002")], bulletins, quotesByDate: withQuotes(perDate), now });
    expect(echue.map((i) => i.kind)).toEqual(["sortie"]);
    expect(echue[0].retirable).toBe(true);

    const incertaine = reconcileLines({ offers: [offer("CM0000020001", { maturityOn: "2026-12-31" }), offer("CM0000020002")], bulletins, quotesByDate: withQuotes(perDate), now });
    expect(incertaine[0].retirable).toBe(false);
    expect(incertaine[0].detail).toContain("desk");
  });

  it("ignores a line the desk has already withdrawn", () => {
    const perDate = Object.fromEntries(DATES.map((d) => [d, [quote("CM0000020002", 100, "obligation", d)]]));
    const issues = reconcileLines({ offers: [offer("CM0000020001", { status: "withdrawn" }), offer("CM0000020002")], bulletins, quotesByDate: withQuotes(perDate) });
    expect(issues).toEqual([]);
  });

  it("catches two quoted lines for one ISIN, and an instrument that does not match", () => {
    const dup = reconcileLines({ offers: [offer("CM0000020001"), offer("CM0000020001", { id: "boc-doublon" })], bulletins, quotesByDate: toutesLesSeances });
    expect(dup.map((i) => i.kind)).toContain("doublon");
    const wrong = reconcileLines({ offers: [offer("CM0000020001", { instrument: "action" })], bulletins, quotesByDate: toutesLesSeances });
    expect(wrong.map((i) => i.kind)).toEqual(["instrument"]);
  });

  it("stays quiet when no bulletin has been read", () => {
    expect(reconcileLines({ offers: [offer("CM0000020001")], bulletins: [], quotesByDate: new Map() })).toEqual([]);
    expect(reconcileLines({ offers: [offer("CM0000020001")], bulletins, quotesByDate: new Map() })).toEqual([]);
    expect(cotee.close).toBe(100);
  });
});
