import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const viewer = () => readFileSync("src/components/SourceViewer.tsx", "utf8");
const css = () => readFileSync("src/components/SourceViewer.module.css", "utf8");

/**
 * LIRE UN DOCUMENT AU TÉLÉPHONE.
 *
 * La visionneuse vient du desk, où le panneau est large et la souris précise.
 * Posée dans la page d'un client, sur un écran de 375 px, elle a révélé quatre
 * défauts le 8 octobre 2026, tous mesurés :
 *
 *   « Ajuster » remettait 1,1, la valeur d'usine du desk, et une page A4 y
 *   faisait 654 px : le bouton promettait un ajustement et rendait un
 *   débordement.
 *
 *   La feuille était centrée par « margin: 0 auto ». Dès qu'elle dépasse, les
 *   marges automatiques se calculent en négatif : son débordement devient
 *   inatteignable des deux côtés. scrollWidth valait clientWidth, donc le
 *   déplacement à un doigt ne pouvait rien déplacer. Le geste marchait ; il n'y
 *   avait rien à bouger.
 *
 *   Le grossissement gardé se lisait dans l'initialisateur d'état : le serveur,
 *   qui n'a pas de stockage, rendait 110 % pendant que le navigateur rendait la
 *   valeur gardée. Échec d'hydratation, arbre régénéré.
 *
 *   Et pdf.js refuse deux rendus concurrents sur le même canevas : un pincement
 *   en produit des dizaines, chaque pas de zoom redessinant.
 */
describe("la visionneuse tient sur un écran de téléphone", () => {
  it("« Ajuster » calcule la largeur au lieu de remettre la valeur d'usine", () => {
    const src = viewer();
    expect(src).toContain("onClick={ajusterALaLargeur}");
    expect(src).not.toContain("onClick={() => setZoom(ZOOM_USINE)}");
    // Il lui faut la largeur de la page, prise au rendu.
    expect(src).toContain("largeurPage.current = p.getViewport({ scale: 1, rotation: rot }).width");
  });

  it("un contenu plus large que son cadre reste atteignable", () => {
    const feuilles = css();
    // « margin: 0 auto » sur un bloc rend le débordement inatteignable ; en flex, « margin: auto » non.
    expect(feuilles).not.toMatch(/\.feuille \{[^}]*margin: 0 auto/);
    expect(feuilles).toMatch(/\.feuille \{[^}]*margin: auto/);
    // Et la chaîne des min-width, sans quoi le cadre s'élargit à son contenu.
    expect(feuilles).toMatch(/\.viewer \{[^}]*min-width: 0/);
    expect(feuilles).toMatch(/\.viewerBox \{[^}]*min-width: 0/);
  });

  it("le stockage ne se lit pas pendant le rendu", () => {
    const src = viewer();
    expect(src).toContain("useState(ZOOM_USINE)");
    // Un getItem dans un initialisateur d'état fait diverger serveur et client.
    expect(src).not.toMatch(/useState\(\(\) => \{[^}]*getItem/);
  });

  it("un seul rendu à la fois sur le même canevas", () => {
    const src = viewer();
    expect(src).toContain("tache.current?.cancel()");
    expect(src).toContain("tache.current = rendu");
  });

  it("le pincement est lu, et suspend le déplacement", () => {
    const src = viewer();
    expect(src).toContain("ecartDesDoigts");
    expect(src).toMatch(/doigts\.current\.size === 2/);
    // Le cadre doit garder le geste pour lui.
    expect(css()).toMatch(/touch-action: none/);
  });
});
