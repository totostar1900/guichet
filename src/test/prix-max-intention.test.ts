import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const code = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Le prix max d'une intention sur une dette se montre toujours, y compris à 100 % (7 novembre 2026). */
describe("le prix max d'une intention", () => {
  it("se montre sur l'accueil pour un OTA et un emprunt, sans seuil", () => {
    const s = code("src/components/accueil/DossierAccueil.tsx");
    expect(s, "le prix max n'est plus montré pour un OTA").toMatch(/o\?\.kind === "OTA" \|\| o\?\.kind === "APE" \|\| o\?\.instrument === "obligation"/);
    expect(s, "un plafond au pair est caché").not.toMatch(/limitPrice (>|<|!==|===) 100/);
  });
  it("se montre dans la liste des intentions, en % du nominal et non en francs", () => {
    const s = code("src/app/moi/ordres/page.tsx");
    expect(s, "le prix max d'une dette n'est plus écrit en % du nominal").toMatch(/Prix maximum[\s\S]{0,80}fmtPrice\(i\.limitPrice\)/);
    expect(s, "un plafond au pair est caché").not.toMatch(/limitPrice (>|<|!==|===) 100/);
  });
});
