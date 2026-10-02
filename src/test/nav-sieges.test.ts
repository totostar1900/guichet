import { describe, expect, it } from "vitest";
import { isEspaceSection, isInstrumentsSection, isMarcheSection } from "@/lib/nav-section";
import { INSTRUMENTS_PAGES, MARCHE_PAGES, PORTEFEUILLE_PAGES } from "@/lib/nav-groups";

/**
 * MARCHÉ SE LIT, INSTRUMENTS S'ACHÈTE, TRADER FAIT.
 *
 * C'est la règle de la navigation, et elle se perd vite : « Marché » portait
 * les deux à la fois, l'indice et les bons du Trésor, et demandait donc au
 * lecteur de faire lui-même un tri que la navigation doit faire à sa place.
 *
 * Ce cliquet tient deux choses : qu'une adresse tombe dans un seul siège, et
 * que chaque page annoncée par un siège y tombe bien. Une liste qui pointe
 * ailleurs que son siège rallume le mauvais onglet, et le lecteur se voit
 * ailleurs qu'où il est.
 */
describe("les sièges de la navigation", () => {
  it("range les adjudications avec ce qui s'achète, et non avec ce qui se lit", () => {
    expect(isInstrumentsSection("/calendrier")).toBe(true);
    expect(isMarcheSection("/calendrier")).toBe(false);
  });

  it("garde l'indice, les sociétés et les actualités du côté de la lecture", () => {
    for (const p of ["/indice", "/societes", "/actualites", "/marche", "/comparer"]) {
      expect(isMarcheSection(p)).toBe(true);
      expect(isInstrumentsSection(p)).toBe(false);
    }
  });

  it("ne range une adresse que dans un seul siège", () => {
    for (const p of ["/", "/titres", "/fonds", "/calendrier", "/marche", "/indice", "/societes", "/actualites", "/comparer", "/moi/performance", "/offres/fund-x", "/offres/autre"]) {
      expect(Number(isEspaceSection(p)) + Number(isInstrumentsSection(p)) + Number(isMarcheSection(p))).toBeLessThanOrEqual(1);
    }
  });

  it("fait pointer chaque liste vers son propre siège", () => {
    for (const p of PORTEFEUILLE_PAGES) expect(isEspaceSection(p.href), p.href).toBe(true);
    for (const p of INSTRUMENTS_PAGES) expect(isInstrumentsSection(p.href), p.href).toBe(true);
    // Le Guide est servi sous les deux domaines : il est de la famille sans
    // être du siège, et c'est la seule exception, nommée.
    for (const p of MARCHE_PAGES.filter((x) => !x.href.startsWith("/info"))) expect(isMarcheSection(p.href), p.href).toBe(true);
  });

  it("ouvre chaque siège sur son ancienne racine, nommée", () => {
    expect(PORTEFEUILLE_PAGES[0].href).toBe("/");
    expect(MARCHE_PAGES[0].href).toBe("/marche");
  });
});
