import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * LE RELIEF DOUX DES DEUX RANGÉES DE TUILES DE TITRES (21 novembre 2026, planche « Tuiles et thèmes », choix 1A).
 *
 * Les trois grandes tuiles (Titres · Fonds · Adjudications) et les icônes de sections avaient un fond plat. Elles lisent
 * maintenant un reflet et une ombre posés par thème (--reflet, --tuile-ombre) ; la tuile active est pleine, à la couleur
 * de la famille (--select / --on-select, qui suivent le thème et l'accent).
 */
describe("le relief doux des tuiles de Titres", () => {
  const css = lire("src/app/globals.css");

  it("chaque thème pose son reflet et son ombre (six blocs, comme --shadow)", () => {
    const ombres = css.match(/^\s*--shadow:/gm)?.length ?? 0;
    expect(css.match(/^\s*--reflet:/gm)?.length, "un thème a perdu son reflet").toBe(ombres);
    expect(css.match(/^\s*--tuile-ombre:/gm)?.length, "un thème a perdu l'ombre des tuiles").toBe(ombres);
  });

  for (const f of ["src/components/GrilleDInstruments.module.css", "src/components/market/OngletsMarche.module.css"]) {
    it(`${f} lit le relief et remplit la tuile active à l'accent`, () => {
      const s = lire(f);
      expect(s, "le reflet n'est plus lu").toContain("var(--reflet)");
      expect(s, "l'ombre n'est plus lue").toContain("var(--tuile-ombre)");
      expect(s, "la tuile active n'est plus pleine").toMatch(/background: var\(--select\)/);
      expect(s, "le texte de la tuile active n'est plus lisible sur le plein").toContain("var(--on-select)");
    });
  }
});
