import { describe, expect, it } from "vitest";
import { isFundsSection, isTitresSection, listForFiche } from "@/lib/nav-section";

/**
 * La fiche d'un fonds appartient aux Fonds, pas aux Titres.
 *
 * Les deux barres lisaient « commence par /offres » et rallumaient donc la
 * première icône dès qu'on ouvrait un fonds. Le cliquet est ici pour que la
 * règle ne se reperde pas : une adresse tombe dans une section et une seule.
 */
describe("la section d'une adresse", () => {
  it("range la fiche d'un fonds avec les fonds", () => {
    expect(isFundsSection("/offres/fund-fcp-corridor-rendement")).toBe(true);
    expect(isTitresSection("/offres/fund-fcp-corridor-rendement")).toBe(false);
  });

  it("laisse les autres fiches aux titres", () => {
    for (const p of ["/offres/boc-cm0000020388", "/offres/ota-2031", "/"]) {
      expect(isTitresSection(p)).toBe(true);
      expect(isFundsSection(p)).toBe(false);
    }
  });

  it("garde la liste des fonds avec les fonds", () => {
    expect(isFundsSection("/fonds")).toBe(true);
    expect(isTitresSection("/fonds")).toBe(false);
  });

  it("ne range une adresse que dans une section", () => {
    for (const p of ["/", "/fonds", "/offres/fund-x", "/offres/autre", "/marche", "/info"]) {
      expect(Number(isTitresSection(p)) + Number(isFundsSection(p))).toBeLessThanOrEqual(1);
    }
  });

  it("remonte vers la bonne liste depuis une fiche", () => {
    expect(listForFiche("/offres/fund-fcp-ab-cash")).toBe("/fonds");
    expect(listForFiche("/offres/boc-cm0000020388")).toBe("/");
  });
});
