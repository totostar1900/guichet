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
    expect(o.maturityOn).toBe("2029-05-27"); // exact date from the fiche signalétique, not the BOC year
    expect(o.lastPrice).toBe(100);
    expect(o.priceSource).toBe("boc");
    expect(o.commissionPct).toBe(0); // no commission shown for now
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
    expect(fund.hidden).toBe(false); // funds arrive ready for subscription
    expect(fund.fund?.nav).toBe(11184);
    expect(fund.fund?.distributed).toBe(true);
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

/**
 * LE SEUIL COMPTE PAR RAPPORT À HIER, ET NON À UN NOMBRE FIGÉ.
 *
 * « Seulement 16 obligation(s) lue(s) » criait sur toute l'année 2024, où la
 * cote en portait quinze : le seuil était écrit en dur, réglé sur la cote du
 * jour où il a été écrit. Mesuré le 5 octobre 2026, après la remontée de
 * l'historique : 10 obligations cotées en 2023, 15 en 2024, 27 en 2025, 32
 * aujourd'hui. Un seuil absolu transforme la croissance du marché en alarme.
 */
describe("les sections incomplètes, mesurées contre la séance précédente", () => {
  const quotes = [...parsed.equities.map((e) => equityQuote(e, parsed)), ...parsed.bonds.map((b) => bondQuote(b, parsed))];
  const navs = parsed.funds.map((f) => fundNav(f, parsed));
  const incompletes = (out: string[]) => out.filter((a) => /semble incomplète/.test(a));
  /** La veille d'une cote plus petite : autant de lignes qu'aujourd'hui, un jour plus tôt. */
  const veille = (nAction: number, nObligation: number) =>
    [
      ...quotes.filter((q) => q.instrument === "action").slice(0, nAction),
      ...quotes.filter((q) => q.instrument === "obligation").slice(0, nObligation),
    ].map((q) => ({ ...q, sessionDate: "2026-08-03" }));

  it("se tait quand la séance rend autant que la précédente", () => {
    const hier = veille(quotes.filter((q) => q.instrument === "action").length, quotes.filter((q) => q.instrument === "obligation").length);
    expect(incompletes(validate(parsed, quotes, navs, hier, navs.length))).toEqual([]);
  });

  it("se tait sur une cote plus petite qu'aujourd'hui, si elle ne rétrécit pas", () => {
    /* Le cas de 2024 : quinze obligations, et c'était le marché entier. */
    const petite = { ...parsed, bonds: parsed.bonds.slice(0, 15), funds: parsed.funds.slice(0, 32) };
    const cotes = [...petite.equities.map((e) => equityQuote(e, petite)), ...petite.bonds.map((b) => bondQuote(b, petite))];
    const vl = petite.funds.map((f) => fundNav(f, petite));
    const hier = cotes.map((q) => ({ ...q, sessionDate: "2026-08-03" }));
    expect(incompletes(validate(petite, cotes, vl, hier, vl.length))).toEqual([]);
  });

  /** Une ligne de plus hier qu aujourd hui : on en fabrique une, avec son propre ISIN. */
  const enPlus = (q, n) => Array.from({ length: n }, (_, i) => ({ ...q, isin: `ZZ${String(i).padStart(10, "0")}`, sessionDate: "2026-08-03" }));

  it("crie quand une action disparaît, même une seule", () => {
    const action = quotes.find((q) => q.instrument === "action");
    const hier = [...veille(quotes.filter((q) => q.instrument === "action").length, quotes.filter((q) => q.instrument === "obligation").length), ...enPlus(action, 1)];
    const out = incompletes(validate(parsed, quotes, navs, hier, navs.length));
    expect(out.join(" ")).toMatch(/action\(s\) lue\(s\) contre/);
  });

  it("tolère qu'une obligation arrive à échéance, pas que trois disparaissent", () => {
    const base = quotes.filter((q) => q.instrument === "obligation").length;
    const obl = quotes.find((q) => q.instrument === "obligation");
    const tout = veille(quotes.filter((q) => q.instrument === "action").length, base);
    const une = [...tout, ...enPlus(obl, 1)];
    expect(incompletes(validate(parsed, quotes, navs, une, navs.length))).toEqual([]);
    const trois = [...tout, ...enPlus(obl, 3)];
    expect(incompletes(validate(parsed, quotes, navs, trois, navs.length)).join(" ")).toMatch(/obligation\(s\) lue\(s\) contre/);
  });
});
