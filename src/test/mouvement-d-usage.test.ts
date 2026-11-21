import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");

/** « PLAISIR D'USAGE », point 2 (A + B), 21 novembre 2026 : le solde monte, la courbe de l'indice se trace, tout contrôle enfoncé répond au toucher. */
describe("le mouvement d'usage", () => {
  it("le solde de l'Accueil compte jusqu'à sa valeur, une fois, en moins d'une demi-seconde, sans mouvement demandé = valeur finale", () => {
    const c = lire("src/components/mouvement/Compteur.tsx");
    expect(c, "plus de garde « moins de mouvement »").toContain("prefers-reduced-motion: reduce");
    expect(c, "le compteur se rejoue à chaque visite").toContain("JOUES.has(cle)");
    expect(c, "le compteur dépasse 0,4 s").toMatch(/DUREE_MS = 400/);
    expect(c, "le chiffre est marqué joué avant la fin : le double passage de l'effet en développement le saute").toMatch(/else \{\s*el\.textContent = fmt\(valeur\);\s*JOUES\.add\(cle\)/);
    expect(c, "le texte final n'est plus remis à la fin").toMatch(/\{\s*el\.textContent = fmt\(valeur\);/);
    expect(c, "le premier cadre peut porter un temps négatif : le chiffre passerait sous zéro").toMatch(/Math\.max\(0, \(maintenant - debut\)/);
    expect(lire("src/app/Console.tsx"), "le solde n'est plus un compteur").toMatch(/<Compteur cle="portefeuille" valeur=\{Math\.round\(total\)\}/);
  });
  it("la courbe de l'indice entre dans le cadre du tracé", () => {
    expect(lire("src/components/IndexPulse.tsx")).toMatch(/className=\{styles\.spark\} data-anim="courbe"/);
  });
  it("le retour au toucher couvre aussi menus, interrupteurs, choix et options", () => {
    const css = lire("src/app/globals.css");
    for (const r of ["menuitem", "switch", "radio", "option"]) {
      expect(css, `${r} n'a plus de transition`).toContain(`[role="${r}"],`);
      expect(css, `${r} n'a plus de retour au toucher`).toContain(`[role="${r}"]:active`);
    }
  });
});
