import { describe, expect, it } from "vitest";
import { isEspaceSection, isFundsSection, isTitresSection, listForFiche, TITRES } from "@/lib/nav-section";

/**
 * La fiche d'un fonds appartient aux Fonds, pas aux Titres.
 *
 * Les deux barres lisaient « commence par /offres » et rallumaient donc la
 * première icône dès qu'on ouvrait un fonds. Le cliquet est ici pour que la
 * règle ne se reperde pas : une adresse tombe dans une section et une seule.
 *
 * S'y ajoute depuis le 29 septembre 2026 la règle de la racine. « / » n'est
 * plus la liste des titres : c'est l'accueil, qui présente ou qui accueille
 * selon la session. La liste vit à « /titres », et aucun onglet d'instrument
 * ne doit s'allumer sur la racine.
 */
describe("la section d'une adresse", () => {
  it("range la fiche d'un fonds avec les fonds", () => {
    expect(isFundsSection("/offres/fund-fcp-corridor-rendement")).toBe(true);
    expect(isTitresSection("/offres/fund-fcp-corridor-rendement")).toBe(false);
  });

  it("laisse les autres fiches aux titres, avec leur liste", () => {
    for (const p of ["/offres/boc-cm0000020388", "/offres/ota-2031", "/titres"]) {
      expect(isTitresSection(p)).toBe(true);
      expect(isFundsSection(p)).toBe(false);
    }
  });

  it("garde la liste des fonds avec les fonds", () => {
    expect(isFundsSection("/fonds")).toBe(true);
    expect(isTitresSection("/fonds")).toBe(false);
  });

  it("ne range une adresse que dans une section", () => {
    for (const p of ["/", "/titres", "/fonds", "/offres/fund-x", "/offres/autre", "/marche", "/info", "/moi"]) {
      expect(Number(isTitresSection(p)) + Number(isFundsSection(p)) + Number(isEspaceSection(p))).toBeLessThanOrEqual(1);
    }
  });

  it("remonte vers la bonne liste depuis une fiche", () => {
    expect(listForFiche("/offres/fund-fcp-ab-cash")).toBe("/fonds");
    expect(listForFiche("/offres/boc-cm0000020388")).toBe(TITRES);
  });
});

/**
 * La racine n'est plus un instrument.
 *
 * C'est la règle que ce cliquet garde : un visiteur qui arrive sur l'accueil
 * ne doit voir aucun onglet de marché allumé, sans quoi il se croit dans une
 * liste. Et la racine appartient à l'espace du client, parce qu'un client
 * connecté y trouve le sien.
 */
describe("la racine, depuis qu'elle est l'accueil", () => {
  it("n'appartient à aucune section d'instrument", () => {
    expect(isTitresSection("/")).toBe(false);
    expect(isFundsSection("/")).toBe(false);
  });

  it("appartient à l'espace du client, avec Mon espace", () => {
    expect(isEspaceSection("/")).toBe(true);
    expect(isEspaceSection("/moi")).toBe(true);
    expect(isEspaceSection("/moi/reinvestir")).toBe(true);
  });

  it("ne réclame ni la liste des titres ni celle des fonds", () => {
    /* Y allumer « Mon espace » est juste ; y allumer « Titres » ferait croire
       à un catalogue. */
    expect(isEspaceSection("/titres")).toBe(false);
    expect(isEspaceSection("/fonds")).toBe(false);
  });
});
