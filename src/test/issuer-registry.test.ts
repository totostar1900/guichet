import { describe, expect, it } from "vitest";
import { issuerKey, issuerZone, resolveIssuer } from "@/data/issuer-registry";

/** One issuer behind its spellings; the bulletin's own labels untouched. */
describe("issuer registry", () => {
  it("ties a state and its treasury together", () => {
    expect(issuerKey({ isin: "GA0000020511", issuer: "État du Gabon", title: "EOG MT 6,60 % NET 2024-2027" })).toBe("État du Gabon");
    expect(issuerKey({ isin: "", issuer: "Trésor public de la République gabonaise", title: "OTA 6,50 % · 14 févr. 2028" })).toBe("État du Gabon");
    expect(issuerKey({ isin: "", issuer: "Etat du Cameroun", title: "ECMR 6,25 % NET 2023-2028" })).toBe("État du Cameroun");
  });
  it("merges suffix and accent variants of a company", () => {
    expect(issuerKey({ isin: "", issuer: "BGFI Holding Corporation", title: "BGFI Holding (BHC) : action cotée" })).toBe(issuerKey({ isin: "", issuer: "BGFI Holding Corporation S.A.", title: "x" }));
    expect(issuerKey({ isin: "", issuer: "Societe Camerounaise de Palmeraies", title: "x" })).toBe("SOCAPALM");
  });
  it("puts the region's institutions under CEMAC, not the ISIN's country", () => {
    expect(issuerZone({ isin: "CG0000020261", issuer: "BDEAC", title: "BDEAC 5,6 % NET 2021-2028", country: "Congo" })).toBe("CEMAC");
    expect(resolveIssuer({ isin: "CG0000020261", issuer: "BDEAC", title: "x" })?.family).toBe("supranational");
  });
  it("leaves an unknown issuer as the bulletin spells it", () => {
    expect(issuerKey({ isin: "", issuer: "Société Inconnue S.A.", title: "SI 5 % 2030" })).toBe("Société Inconnue S.A.");
    expect(resolveIssuer({ isin: "", issuer: "Société Inconnue S.A.", title: "SI 5 % 2030" })).toBeUndefined();
  });
});
