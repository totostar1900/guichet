import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * LE BOUTON RETOUR NE SE BALADE PLUS SUR LE DOCUMENT (19 novembre 2026).
 * Chaque `href="#section"` d'un menu collant ajoutait une entrée à l'historique : la flèche de retour revenait de rubrique en rubrique. Les menus de page passent par `LienDAncre`, qui défile et remplace l'adresse.
 */
describe("les menus d'ancres d'une page de lecture", () => {
  it("ne laissent aucune entrée d'historique", () => {
    const lien = lire("src/components/LienDAncre.tsx");
    expect(lien).toMatch(/history\.replaceState/);
    expect(lien).not.toMatch(/pushState/);
    for (const f of ["src/app/info/mentions/BandeDeLaPage.tsx", "src/components/PageOutline.tsx", "src/app/info/risques/page.tsx"]) {
      const src = lire(f);
      expect(src, `${f} n'utilise plus LienDAncre`).toMatch(/<LienDAncre\b/);
      expect(src, `${f} a de nouveau un « <a href="#… » qui pousse l'historique`).not.toMatch(/<a\b[^>]*href=\{`#/);
    }
  });
});
