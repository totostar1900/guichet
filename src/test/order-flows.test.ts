import { describe, expect, it } from "vitest";
import { orderFlows } from "@/components/OrderFlows";
import type { Offer } from "@/lib/domain/types";

/**
 * L'échéancier ne paraît que là où l'instrument en a un.
 *
 * Une action ne verse pas selon un calendrier : son dividende est décidé chaque
 * année par une assemblée, et l'afficher comme un flux daté serait une promesse.
 * Une part de fonds n'en verse pas davantage : sa valeur bouge, elle ne tombe
 * pas. Un tableau vide, ou pire, un tableau plausible, vaut moins que rien sur
 * un écran qui précède un ordre.
 */
const base: Offer = {
  id: "o1",
  kind: "OTA",
  operation: "nouvelle_ligne",
  country: "Cameroun",
  countryName: "Cameroun",
  issuer: "État du Cameroun",
  title: "OTA 6,25 % 2028",
  isin: "CM1L",
  status: "published",
  blurb: "",
  documents: [],
  opensAt: "2026-09-01T09:00:00",
  deadlineAt: "2026-09-30T12:00:00",
  settleOn: "2026-10-02",
  maturityOn: "2028-10-02",
  lastCouponOn: null,
  nominal: 10_000,
  couponRate: 6.25,
  pricePct: 96,
  commissionPct: 0.5,
  minTitles: 100,
  version: 1,
};
const listedBond: Offer = { ...base, id: "m1", kind: "MARCHE", operation: "secondaire", instrument: "obligation", title: "ECMR 7,25 % 2031", lastPrice: 97, ask: 97, bid: 96, lotSize: 1 };
const share: Offer = { ...listedBond, id: "m2", instrument: "action", title: "SIAT Gabon", lastPrice: 28_500, ask: 28_500, bid: 28_000, lotSize: 10, dividendPerShare: 1_500 };
const fund: Offer = { ...base, id: "f1", kind: "FONDS", operation: "secondaire", title: "FCP Monétaire", fund: { nav: 10_500, navDate: "2026-09-20", manager: "SGO", depositary: "Banque", entryFeePct: 1, exitFeePct: 0, minAmount: 100_000, distributed: true } as Offer["fund"] };

describe("l'échéancier d'un ordre", () => {
  it("existe pour une obligation cotée, un OTA et un BTA", () => {
    expect(orderFlows(listedBond, 100, 0, null).length).toBeGreaterThan(0);
    expect(orderFlows(base, 0, 1_000_000, null).length).toBeGreaterThan(0);
    const bta: Offer = { ...base, id: "b1", kind: "BTA", couponRate: undefined, precountRate: 5.5, nominal: 1_000_000, maturityOn: "2027-09-16" };
    // Un bon ne verse qu'une fois, à son terme : une ligne, et c'est l'information.
    expect(orderFlows(bta, 0, 5_000_000, null)).toHaveLength(1);
    expect(orderFlows(bta, 0, 5_000_000, null)[0].label).toBe("Remboursement");
  });

  it("n'existe pas pour une action ni pour un fonds", () => {
    expect(orderFlows(share, 100, 0, null)).toEqual([]);
    expect(orderFlows(share, 0, 2_850_000, null)).toEqual([]);
    expect(orderFlows(fund, 0, 1_000_000, null)).toEqual([]);
  });

  it("n'existe pas sans quantité, sans somme, ni sans échéance", () => {
    expect(orderFlows(listedBond, 0, 0, null)).toEqual([]);
    expect(orderFlows(base, 0, 0, null)).toEqual([]);
    expect(orderFlows({ ...base, maturityOn: undefined }, 0, 1_000_000, null)).toEqual([]);
  });

  it("suit le prix limite quand il y en a un", () => {
    // Le prix change le décaissement, jamais les versements : même échéancier.
    const atRef = orderFlows(listedBond, 100, 0, null);
    const atLimit = orderFlows(listedBond, 100, 0, 92);
    expect(atLimit.map((f) => Math.round(f.amount))).toEqual(atRef.map((f) => Math.round(f.amount)));
  });
});
