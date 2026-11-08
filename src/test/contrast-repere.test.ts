import { describe, expect, it } from "vitest";
import { contraste, ecrans, resoudre } from "./couleurs";

/**
 * LE REPÈRE DE DÉBUT SE VOIT SOUS CHAQUE PALETTE (8 novembre 2026).
 * Le trait qui marque le début d'une période sur une barre de fin porte `--repere`, cerné d'un liseré de la couleur du fond. Il doit se détacher du FOND à 3:1 au moins (seuil des objets
 * graphiques, WCAG 1.4.11) dans tous les écrans que l'application sait rendre (quatre palettes, quatre états de thème), et se distinguer de la teinte des barres.
 */
const SEUIL_OBJET = 3;
describe("le repère de début", () => {
  const tous = ecrans();
  it("existe dans chaque écran, et se détache du fond à 3:1", () => {
    const fautes: string[] = [];
    for (const [nom, vars] of Object.entries(tous)) {
      const r = vars["--repere"] ? resoudre(vars["--repere"], vars) : null;
      const f = vars["--surface"] ? resoudre(vars["--surface"], vars) : null;
      if (!r || !f) {
        fautes.push(`${nom} : jeton absent`);
        continue;
      }
      const c = contraste(r, f);
      if (c < SEUIL_OBJET) fautes.push(`${nom} : ${c.toFixed(2)}:1`);
    }
    expect(fautes, "écrans où le repère ne se voit pas sur le fond").toEqual([]);
  });
  it("n'est ni la couleur des barres ni celle du flottant (assez d'écart de teinte)", () => {
    for (const [nom, vars] of Object.entries(tous)) {
      const r = resoudre(vars["--repere"], vars);
      for (const autre of ["--chart-out", "--chart-in"]) {
        const o = vars[autre] ? resoudre(vars[autre], vars) : null;
        if (!r || !o) continue;
        const d = Math.abs(r[0] - o[0]) + Math.abs(r[1] - o[1]) + Math.abs(r[2] - o[2]);
        expect(d, `${nom} : le repère ressemble à ${autre}`).toBeGreaterThan(120);
      }
    }
  });
});
