import { describe, expect, it } from "vitest";
import { blocking, orderChecks } from "@/lib/domain/checks";
import type { Offer } from "@/lib/domain/types";

const ota: Offer = { id: "o1", kind: "OTA", operation: "nouvelle_ligne", country: "Cameroun", countryName: "Cameroun", issuer: "État du Cameroun", title: "OTA 6,25 % 2028", isin: "CM1L", status: "published", blurb: "", documents: [], opensAt: "2026-09-01T09:00:00", deadlineAt: "2026-09-30T12:00:00", settleOn: "2026-10-02", maturityOn: "2028-10-02", lastCouponOn: null, nominal: 10_000, couponRate: 6.25, pricePct: 96, commissionPct: 0.5, minTitles: 100, version: 1 };
const share: Offer = { ...ota, id: "m1", kind: "MARCHE", operation: "secondaire", title: "SIAT Gabon", instrument: "action", lastPrice: 28_500, ask: 28_500, bid: 28_000, lotSize: 10, nominal: 10_000 };

describe("order consistency", () => {
  it("blocks under one title and under the issuer's minimum, warns on rounding", () => {
    expect(blocking(orderChecks(ota, "ferme", 5_000))?.key).toBe("min-unit");
    expect(blocking(orderChecks(ota, "ferme", 500_000))?.key).toBe("min-titles");
    const c = orderChecks(ota, "ferme", 1_005_000);
    expect(blocking(c)).toBeUndefined();
    expect(c.find((x) => x.key === "round")?.text).toMatch(/5.000 FCFA ne seront pas investis/);
  });
  it("secondary market: whole shares, quotité, limit price bounds", () => {
    expect(blocking(orderChecks(share, "achat", 0.5))?.key).toBe("min-unit");
    expect(blocking(orderChecks(share, "achat", 5))?.key).toBe("lot");
    expect(orderChecks(share, "achat", 15).some((x) => x.key === "lot-mult")).toBe(true);
    expect(blocking(orderChecks(share, "achat", 10, 10_000))?.key).toBe("limit-far");
    expect(orderChecks(share, "achat", 10, 25_000).some((x) => x.key === "limit-away")).toBe(true);
    expect(blocking(orderChecks(share, "vente", 20, null, { held: 10 }))?.key).toBe("held");
    expect(blocking(orderChecks(share, "achat", 10, 28_000))).toBeUndefined();
  });
});
