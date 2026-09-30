import { describe, expect, it } from "vitest";
import { estPublic } from "@/lib/porte";

/**
 * La porte est une liste blanche : une page neuve est fermée tant que personne
 * ne l'a écrite. Ce cliquet tient les deux côtés de la règle, parce qu'une
 * erreur d'un côté est une gêne et de l'autre une décision de la maison
 * contournée sans qu'on s'en aperçoive.
 */
describe("la porte", () => {
  it("laisse entrer la colonne vertébrale publique", () => {
    for (const p of ["/", "/connexion", "/connexion/mfa", "/ouvrir-un-compte", "/ne-plus-recevoir", "/info", "/info/aide", "/info/mentions", "/info/risques", "/info/obligations", "/auth/callback", "/api/cron/beac", "/robots.txt", "/manifest.webmanifest"]) {
      expect(estPublic(p), p).toBe(true);
    }
  });

  it("laisse lire les notes de marché publiées, page et PDF", () => {
    expect(estPublic("/indice/notes")).toBe(true);
    expect(estPublic("/indice/note/2026-T2")).toBe(true);
    expect(estPublic("/indice/note/2026-T2/pdf")).toBe(true);
  });

  it("ferme l'indice lui-même, qui porte des chiffres", () => {
    expect(estPublic("/indice")).toBe(false);
    expect(estPublic("/indice/serie.csv")).toBe(false);
  });

  it("laisse l'aperçu d'une ligne partagée, et son image de partage", () => {
    expect(estPublic("/offres/CM1200000808")).toBe(true);
    expect(estPublic("/offres/fund-12/opengraph-image")).toBe(true);
  });

  it("ferme ce qui pend sous une fiche : les chiffres et l'engagement", () => {
    expect(estPublic("/offres/CM1200000808/intention")).toBe(false);
    expect(estPublic("/offres/CM1200000808/fiche")).toBe(false);
    expect(estPublic("/offres/CM1200000808/doc/1")).toBe(false);
  });

  it("ferme tout le reste, catalogues et espace compris", () => {
    for (const p of ["/titres", "/fonds", "/marche", "/actualites", "/calendrier", "/comparer", "/societes", "/societes/SEMC", "/emetteurs/cameroun", "/moi", "/moi/services", "/moi/performance", "/desk", "/desk/analyses", "/services"]) {
      expect(estPublic(p), p).toBe(false);
    }
  });

  it("ne se laisse pas ouvrir par un préfixe qui ressemble", () => {
    // « /information » n'est pas « /info », et « /offresX » n'est pas une fiche.
    expect(estPublic("/informations-financieres")).toBe(false);
    expect(estPublic("/offresecretes")).toBe(false);
    expect(estPublic("/indice-maison")).toBe(false);
  });

  it("traite la barre finale comme son absence", () => {
    expect(estPublic("/info/")).toBe(true);
    expect(estPublic("/titres/")).toBe(false);
  });
});
