import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (f: string) => fs.readFileSync(path.join(__dirname, "../..", f), "utf8");

/**
 * LES PASTILLES FLOTTANTES (10 novembre 2026, planche « Pastilles flottantes » : 1B, 2A).
 * Une taille (34 px), une couleur (or doux), un geste (appui long puis glisser).
 */
const PASTILLES = [
  ["src/components/mobile/MarketFab.tsx", "src/components/mobile/MarketFab.module.css"],
  ["src/components/mobile/PlusFab.tsx", "src/components/mobile/MarketFab.module.css"],
  ["src/components/FilterFab.tsx", "src/components/FilterFab.module.css"],
  ["src/components/BackToTop.tsx", "src/components/BackToTop.module.css"],
  ["src/app/info/GuideBar.tsx", "src/app/info/GuideBar.module.css"],
] as const;

describe("les pastilles flottantes", () => {
  it("se déplacent toutes à l'appui long", () => {
    for (const [tsx] of PASTILLES) expect(lire(tsx), `${tsx} ne se déplace pas`).toMatch(/useDeplacable\("[a-z]+"\)[\s\S]*ref=\{deplacable\}/);
  });
  it("portent l'or doux, sur 34 px", () => {
    for (const css of new Set(PASTILLES.map((p) => p[1]))) {
      const s = lire(css);
      expect(s, `${css} a perdu l'or doux`).toMatch(/background:\s*var\(--gold-soft\)/);
      expect(s, `${css} n'est plus à 34 px`).toMatch(/(width|height):\s*34px/);
    }
  });
  it("ne se déplacent pas au défilement : 0,4 s d'appui, et le bord le plus proche", () => {
    const h = lire("src/lib/ui/deplacable.ts");
    expect(h).toMatch(/DELAI = 400/);
    expect(h).toMatch(/> 10\) fin\(\)/);
    expect(h).toMatch(/clientX < window\.innerWidth \/ 2/);
  });
});
