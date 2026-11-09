import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * LE RETOUR AU TOUCHER (9 novembre 2026, planche « Gestes et feuilles », 2A). Le rectangle de toucher du navigateur est retiré : un contrôle qu'on enfonce doit répondre. Un seul poseur, global,
 * écrit avec « scale » (qui se compose avec « transform » au lieu de le remplacer).
 */
describe("le retour au toucher", () => {
  it("un bouton, un onglet, un résumé et un lien-tuile répondent à l'enfoncement", () => {
    expect(css, "plus d'enfoncement pour les boutons").toMatch(/button:not\(:disabled\):active,[\s\S]*?\{[^}]*scale:\s*0\.97/);
    expect(css, "plus d'enfoncement pour .btn").toMatch(/\.btn:not\(:disabled\):active \{[^}]*scale:\s*0\.96/);
    expect(css, "plus d'enfoncement pour les liens-tuiles").toMatch(/a:active \{[^}]*scale:\s*0\.985/);
  });
  it("le mouvement est court à l'enfoncement et plus long au relâchement", () => {
    expect(css).toMatch(/transition:\s*scale 0\.2s[^;]*, filter 0\.2s;/);
    expect(css).toMatch(/:active,[\s\S]*?summary:active \{[^}]*transition-duration:\s*0\.09s/);
  });
  it("il n'écrase pas le « transform » d'un composant, et il se tait sous « prefers-reduced-motion »", () => {
    expect(css.match(/:active[^{]*\{[^}]*\btransform:/g) ?? [], "un :active global écrit « transform » et remplacerait celui d'un composant").toEqual([]);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{[\s\S]*?scale:\s*none/);
  });
});
