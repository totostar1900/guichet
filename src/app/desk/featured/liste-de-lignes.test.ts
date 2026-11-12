import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, p), "utf8");

/**
 * LA LISTE DES LIGNES DE « À LA UNE » DOIT SE VOIR (12 novembre 2026).
 *
 * Mesuré dans le navigateur : la liste (300 px de haut, positionnée sous le champ) était ouverte, mais le panneau, qui coupe son débordement, n'en laissait voir que 11 px.
 * Le panneau doit donc laisser déborder ce que le champ ouvre.
 */
describe("le choix d'une ligne à mettre à la une", () => {
  it("le panneau laisse déborder la liste que le champ ouvre", () => {
    expect(lire("FeaturePanel.tsx")).toMatch(/className=\{`panel \$\{styles\.panneau\}`\}/);
    expect(lire("FeaturePanel.module.css")).toMatch(/div\.panneau \{\s*overflow: visible;/);
  });

  it("la liste reste posée sous le champ, au-dessus du reste", () => {
    expect(lire("FeaturePanel.module.css")).toMatch(/\.hits \{[^}]*position: absolute;[^}]*z-index: 30;/);
  });
});

describe("la recherche d'une ligne par son ISIN", () => {
  it("le champ promet un ISIN : il le cherche, et la liste l'écrit sous chaque ligne", () => {
    const f = lire("FeaturePanel.tsx");
    expect(f).toMatch(/fold\(c\.isin \?\? ""\)\.includes\(q\)/);
    expect(f).toMatch(/\{c\.isin \? ` · \$\{c\.isin\}` : ""\}/);
    expect(lire("../a-la-une/page.tsx")).toMatch(/isin: o\.isin/);
  });
});
