import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parentDe } from "@/lib/nav-parent";

const lire = (f: string) => readFileSync(f, "utf8");

/**
 * L'ÉPARGNE PROGRAMMÉE EST SA PROPRE LISTE (décision du 15 novembre 2026, maquette « Épargne » : 1A · 2A · 3 OK · 4 28) : la liste sur la page, un bouton collé en bas,
 * le « i » qui porte l'explication, un retrait à la place de la modification.
 */
describe("la page de l'épargne programmée", () => {
  const p = lire("src/app/moi/epargne/page.tsx");

  it("porte la liste, sans pli ni tuile-lien", () => {
    expect(p).not.toMatch(/<Pli\b|components\/Pli/);
    expect(p).not.toMatch(/styles\.tuile/);
    expect(p).toMatch(/<StandingList/);
    expect(p).toMatch(/x\.state === "active" \|\| x\.state === "suspendue"/);
  });

  it("le bouton jaune est collé en bas et mène au formulaire", () => {
    expect(p).toMatch(/<BarreDEtape>/);
    expect(p).toMatch(/className=\{`btn primary \$\{barre\.suivant\}`\} href="\/moi\/epargne\/nouvelle"/);
  });

  it("le « i » porte l'explication, et les deux anciennes pages renvoient ici", () => {
    expect(p).toMatch(/<EnBref brief="epargne" \/>/);
    for (const f of ["en-place", "fonctionnement"]) expect(lire(`src/app/moi/epargne/${f}/page.tsx`), f).toMatch(/redirect\("\/moi\/epargne"\)/);
    const brief = lire("src/lib/domain/services.ts");
    expect(brief).toMatch(/Retirer l'épargne ne révoque pas le mandat, et révoquer le mandat ne retire pas l'épargne/);
  });

  it("le formulaire sait atterrir sur la liste, sauf quand un mandat reste à signer", () => {
    expect(lire("src/app/moi/epargne/nouvelle/page.tsx")).toMatch(/apres="\/moi\/epargne"/);
    const s = lire("src/components/Standing.tsx");
    expect(s).toMatch(/if \(state\?\.ok && apres && !state\.versLeMandat\) router\.replace\(apres\);/);
    expect(s).toMatch(/if \(state\?\.ok && !apres && window\.location\.search\.includes\("etape="\)\) router\.back\(\);/);
  });
});

describe("la liste des instructions", () => {
  const s = lire("src/components/Standing.tsx");
  const css = lire("src/components/Standing.module.css");

  it("retire au lieu de modifier, avec une confirmation qui dit ce qui reste", () => {
    expect(s).not.toMatch(/ModifierInstruction|t\("Modifier"\)|Voir les \{n\} instructions arrêtées/);
    expect(s).toMatch(/t\("Retirer"\)/);
    expect(s).toMatch(/Les ordres déjà passés restent dans Mes ordres, et votre mandat de prélèvement n'est pas révoqué/);
  });

  it("ne montre que ce qui court et ce qui est suspendu, avec sa raison", () => {
    expect(s).toMatch(/rows\.filter\(\(x\) => x\.state === "active" \|\| x\.state === "suspendue"\)/);
    expect(s).toMatch(/s\.state === "suspendue" &&/);
  });

  it("espace les épargnes de l'écart de deux sections, et les pose sur la tuile de la maison", () => {
    expect(css).toMatch(/\.list \{[^}]*gap: var\(--sections-gap\);/);
    expect(css).toMatch(/\.item \{[^}]*background: var\(--tuile-fond\);/);
  });

  it("la modification n'existe plus côté serveur", () => {
    expect(() => readFileSync("src/app/moi/modifier-actions.ts", "utf8")).toThrow();
  });
});

describe("les adresses", () => {
  it("le retour de l'épargne reste Mon argent", () => {
    expect(parentDe("/moi/epargne")).toBe("/moi/argent");
  });
});
