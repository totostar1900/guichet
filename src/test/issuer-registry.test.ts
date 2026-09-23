import { describe, expect, it } from "vitest";
import { buildIssuerRegistry, issuerKey, issuersForClient, issuerZone, ISSUER_REGISTRY, resolveIssuer, setIssuerRegistry } from "@/data/issuer-registry";
import type { Company } from "@/data/companies";

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

/**
 * Le registre suit les fiches publiées.
 *
 * C'était le défaut : il se construisait sur les constantes du code, donc une
 * société renommée au desk gardait ici son ancien nom. La page /societes disait
 * une chose et la tête de groupe du navigateur de lignes en disait une autre,
 * sur la même société, au même moment.
 */
describe("le registre suit les fiches du desk", () => {
  const company = (over: Partial<Company> = {}): Company => ({ mnemo: "XYZ", isin: "CM0000099999", name: "Société d'Essai S.A.", shortName: "ESSAI", country: "Cameroun", city: "Douala", sector: "Industrie", activity: "", figures: [], documents: [], ...over }) as unknown as Company;

  it("prend le nom, la zone et les alias de la fiche, pas ceux du code", () => {
    setIssuerRegistry(buildIssuerRegistry([company()], []));
    expect(issuerKey({ isin: "CM0000099999", issuer: "peu importe", title: "x" })).toBe("ESSAI");
    expect(issuerZone({ isin: "CM0000099999", issuer: "", title: "x", country: "Gabon" })).toBe("Cameroun");

    // La même société, renommée et déplacée au desk : le registre suit.
    setIssuerRegistry(buildIssuerRegistry([company({ shortName: "ESSAI HOLDING", country: "Gabon" })], []));
    expect(issuerKey({ isin: "CM0000099999", issuer: "peu importe", title: "x" })).toBe("ESSAI HOLDING");
    expect(issuerZone({ isin: "CM0000099999", issuer: "", title: "x", country: "Cameroun" })).toBe("Gabon");
  });

  it("garde les états et les institutions régionales, qu'aucune fiche ne décrit", () => {
    setIssuerRegistry(buildIssuerRegistry([], []));
    expect(issuerKey({ isin: "", issuer: "Trésor public de la République gabonaise", title: "x" })).toBe("État du Gabon");
    expect(issuerZone({ isin: "", issuer: "BDEAC", title: "x", country: "Congo" })).toBe("CEMAC");
  });

  it("n'emporte vers le navigateur que de quoi reconnaître un émetteur", () => {
    // Les phrases sourcées et les liens ne servent qu'au volet « Émetteur »,
    // rendu sur le serveur : les envoyer alourdirait chaque page pour rien.
    const [p] = issuersForClient(buildIssuerRegistry([company()], []).filter((x) => x.slug === "xyz"));
    expect(p.name).toBe("ESSAI");
    expect(p.isins).toEqual(["CM0000099999"]);
    expect("activity" in p).toBe(false);
    expect("href" in p).toBe(false);
  });

  it("revient au registre du code", () => {
    setIssuerRegistry(ISSUER_REGISTRY);
    expect(issuerKey({ isin: "", issuer: "Etat du Cameroun", title: "x" })).toBe("État du Cameroun");
  });
});
