import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8");

/**
 * LA VARIATION EN TÊTE D'UNE ACTION, PARTOUT (12 novembre 2026, à la demande du client).
 *
 * Le cours passe dessous. Les obligations gardent leur chiffre (le cours en % du nominal, le rendement),
 * et une action sans variation connue garde son cours en tête : un « 0 % » inventé ne remplace rien.
 */
describe("la variation d'une action est le chiffre de tête, partout où une action s'affiche", () => {
  const rangees = lire("src/components/accueil/BlocDeLignes.tsx");

  it("la rangée d'Accueil : variation en tête seulement pour une action dont la variation est connue", () => {
    expect(rangees).toMatch(/variationEnTete: Boolean\(variation\) && o\.instrument === "action"/);
    expect(rangees).toMatch(/l\.variationEnTete && l\.variation && l\.cours \? \(\s*<>\s*<PastilleVariation grande/);
    expect(rangees, "le cours doit rester écrit dessous").toMatch(/<small className=\{styles\.coursSous\}>/);
  });

  it("la pastille sait être grande, et sa période reste petite", () => {
    expect(lire("src/components/PastilleVariation.tsx")).toMatch(/grande = false/);
    expect(lire("src/components/PastilleVariation.module.css")).toMatch(/\.grande \.periode \{\s*font-size: var\(--t-2\)/);
  });

  it("les cartes de lignes similaires et la sélection du desk suivent la même règle", () => {
    expect(lire("src/app/offres/[id]/LignesSimilaires.tsx")).toMatch(/l\.variationEnTete && l\.variation \? \(\s*<span className=\{cartes\.chiffre\}>\s*<PastilleVariation grande/);
    expect(lire("src/components/SelectionDuDesk.tsx")).toMatch(/sobre && o\.instrument === "action" && variationAffichee/);
  });

  it("la carte : variation colorée selon son sens (la règle générale ne la couvre plus), flèche réduite", () => {
    const css = lire("src/components/OfferCard.module.css");
    expect(css).toMatch(/\.variationNb\.hausseC \{\s*color: var\(--good\)/);
    expect(css).toMatch(/\.variationNb\.baisseC \{\s*color: var\(--crit\)/);
    expect(css).toMatch(/\.fleche \{[^}]*font-size: 0\.5em/);
  });

  it("une obligation garde son cours : la règle ne vaut que pour « action »", () => {
    expect(lire("src/components/OfferCard.tsx")).not.toMatch(/estObligation[^;]*variationPct/);
    expect(rangees).not.toMatch(/variationEnTete: Boolean\(variation\)(?! && o\.instrument === "action")/);
  });
});

describe("le menu : les palettes sont une liste de noms, comme les thèmes", () => {
  const src = lire("src/components/PaletteSwitch.tsx");
  const css = lire("src/components/PaletteSwitch.module.css");

  it("plus de petites pages de couleur : deux listes segmentées", () => {
    expect(src).not.toMatch(/styles\.swatch|<i style=\{\{ background: p\.paper/);
    expect(css).not.toMatch(/\.swatch/);
    expect(src.match(/className=\{styles\.seg\}/g)?.length, "une liste pour les palettes, une pour les thèmes").toBe(2);
    expect(src).toMatch(/PALETTES\.map\(\(p\) => \(\s*<button[^>]*styles\.segOn[\s\S]*?\{p\[lang\]\}/);
  });
});

describe("le « i » de Titres explique la nuance entre une action et une obligation cotée", () => {
  const src = lire("src/components/EnBrefInstruments.tsx");
  it("deux lectures et le pourquoi d'un rendement absent", () => {
    expect(src).toMatch(/Actions et obligations cotées : deux lectures/);
    expect(src).toMatch(/<b>\{t\("Une action\."\)\}<\/b>/);
    expect(src).toMatch(/<b>\{t\("Une obligation cotée\."\)\}<\/b>/);
    expect(src).toMatch(/<b>\{t\("Pas de rendement affiché \?"\)\}<\/b>/);
    expect(src, "les risques et la liquidité restent").toMatch(/<b>\{t\("Liquidité\."\)\}<\/b>/);
  });
});
