import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { memoryRepository } from "@/lib/data/memory";
import { bocUrl, bondQuote, equityQuote, fundNav, ingestBoc, offerFromQuote, prettyName, validate } from "./boc";
import { parseBoc } from "./boc-parse";

const text = readFileSync(new URL("./__fixtures__/BOC-20260804.txt", import.meta.url), "utf8");
const parsed = parseBoc(text);

describe("bocUrl", () => {
  it("builds the deterministic WordPress upload path", () => {
    expect(bocUrl("2026-08-04")).toBe("https://www.bvm-ac.org/wp-content/uploads/2026/08/BOC-20260804.pdf");
  });
});

describe("validate", () => {
  it("accepts a clean bulletin and flags a jump against the previous session", () => {
    const quotes = [...parsed.equities.map((e) => equityQuote(e, parsed)), ...parsed.bonds.map((b) => bondQuote(b, parsed))];
    const navs = parsed.funds.map((f) => fundNav(f, parsed));
    expect(validate(parsed, quotes, navs, [])).toEqual([]);
    const prev = { ...quotes[0], sessionDate: "2026-08-03", close: quotes[0].close * 2 };
    const out = validate(parsed, quotes, navs, [prev]);
    expect(out.some((a) => a.includes(quotes[0].mnemo) && a.includes("écart"))).toBe(true);
  });
});

describe("offerFromQuote", () => {
  it("creates a listed line with coupon, nominal and provenance", () => {
    const q = bondQuote(parsed.bonds.find((b) => b.isin === "CM0000020305")!, parsed);
    const o = offerFromQuote(q, parsed.bulletinNo);
    expect(o.id).toBe("boc-cm0000020305");
    expect(o.kind).toBe("MARCHE");
    expect(o.instrument).toBe("obligation");
    expect(o.country).toBe("Cameroun");
    expect(o.couponRate).toBe(6.25);
    expect(o.nominal).toBe(6000);
    expect(o.maturityOn).toBe("2029-12-31");
    expect(o.lastPrice).toBe(100);
    expect(o.priceSource).toBe("boc");
    expect(o.commissionPct).toBe(0.5);
  });
  it("refreshes an existing line without losing the desk's settings", () => {
    const q = equityQuote(parsed.equities.find((e) => e.isin === "GA0000010074")!, parsed);
    const existing = { ...offerFromQuote(q, 1), id: "mkt-bhc", commissionPct: 0.8, bid: 89_500, ask: 90_500, version: 3 };
    const o = offerFromQuote({ ...q, close: 91_000 }, parsed.bulletinNo, existing);
    expect(o.id).toBe("mkt-bhc");
    expect(o.commissionPct).toBe(0.8);
    expect(o.bid).toBe(89_500);
    expect(o.lastPrice).toBe(91_000);
    expect(o.version).toBe(4);
  });
});

describe("ingestBoc (memory repository, real PDF when present)", () => {
  let pdf: Uint8Array | undefined;
  beforeAll(() => {
    try {
      pdf = new Uint8Array(readFileSync(new URL("../../../.uploads/BOC-20260804.pdf", import.meta.url)));
    } catch {
      pdf = undefined;
    }
  });
  it("reads the PDF, stores quotes, NAVs and lines, and is idempotent", async () => {
    if (!pdf) return; // fixture PDF not downloaded on this machine
    const first = await ingestBoc({ sessionDate: "2026-08-04", bytes: pdf, by: "desk", sourceUrl: "test" });
    expect(first.found).toBe(true);
    expect(first.bulletin?.number).toBe(2565);
    expect(first.bulletin?.counts).toEqual({ equities: 7, bonds: 32, funds: 41 });
    expect(first.bulletin?.anomalies).toEqual([]);
    expect([...first.created, ...first.refreshed].filter((id) => !id.startsWith("fund-")).length).toBe(39);
    expect(first.created.filter((id) => id.startsWith("fund-")).length).toBe(41);
    expect(first.refreshed).toContain("mkt-bhc"); // seeded line refreshed, not duplicated
    const again = await ingestBoc({ sessionDate: "2026-08-04", bytes: pdf, by: "desk", sourceUrl: "test" });
    expect(again.created).toEqual([]);
    expect(again.refreshed.length).toBe(39 + 41);
    const fund = (await memoryRepository.listOffers()).find((o) => o.id === "fund-fcp-sogefirst")!;
    expect(fund.kind).toBe("FONDS");
    expect(fund.hidden).toBe(true);
    expect(fund.fund?.nav).toBe(11184);
    expect(fund.fund?.distributed).toBe(false);
    const bhc = await memoryRepository.listQuotes("GA0000010074");
    expect(bhc.length).toBe(1);
    expect(bhc[0].close).toBe(90_000);
    const navs = await memoryRepository.latestFundNavs();
    expect(navs.length).toBe(41);
    const offers = await memoryRepository.listOffers();
    const line = offers.find((o) => o.id === "boc-cm0000020305")!;
    expect(line.lastPrice).toBe(100);
    expect(line.priceSource).toBe("boc");
  }, 60_000);
});

describe("prettyName", () => {
  it("keeps acronyms and lowers the small words", () => {
    expect(prettyName("SOCIETE DES EAUX MINERALES DU CAMEROUN")).toBe("Societe des Eaux Minerales du Cameroun");
    expect(prettyName("BGFI HOLDING CORPORATION")).toBe("BGFI Holding Corporation");
    expect(prettyName("ETAT DU GABON")).toBe("État du Gabon");
    expect(prettyName("BDEAC")).toBe("BDEAC");
  });
});
