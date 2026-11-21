import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const regle = (f: string, cls: string) => (sansNotes(lire(f)).match(new RegExp(`(?:^|\\n)\\.${cls}\\s*\\{[^}]*\\}`)) ?? [""])[0];

/**
 * LA LIGNE EN DEUX COLONNES (21 novembre 2026, planche « Mesure des lignes », 1B · 2A · 3A · 4A ; ETALON.md § 8.15).
 *
 * Le texte d'une ligne tient dans une première colonne de 300 px (au-delà, il passe sur deux lignes) ; les commandes sont sur l'arête droite d'une seconde colonne de 72 px. Les largeurs sont des jetons de globals.css : une ligne qui écrirait la sienne rouvrirait les 855 px de vide entre le texte et l'interrupteur.
 */
describe("la ligne en deux colonnes", () => {
  const globals = sansNotes(lire("src/app/globals.css"));
  const LIGNES: Array<[string, string]> = [
    ["src/components/Feuillet.module.css", "ligne"],
    ["src/app/moi/appareil/page.module.css", "reglage"],
  ];

  it("les jetons existent, une fois, avec les valeurs choisies", () => {
    expect(globals, "--texte-max n'est plus 300 px").toMatch(/--texte-max:\s*300px;/);
    expect(globals, "--commande-col n'est plus 72 px").toMatch(/--commande-col:\s*72px;/);
    expect(globals, "--ligne-gap n'est plus 20 px").toMatch(/--ligne-gap:\s*20px;/);
    for (const j of ["--texte-max", "--commande-col", "--ligne-gap", "--ligne-largeur"]) {
      expect((globals.match(new RegExp(`${j}:`, "g")) ?? []).length, `${j} est déclaré plusieurs fois`).toBe(1);
    }
  });

  it.each(LIGNES)("%s .%s lit les jetons et n'écrit aucune largeur", (f, cls) => {
    const r = regle(f, cls);
    expect(r, `.${cls} n'est plus une grille`).toMatch(/display:\s*grid;/);
    expect(r, `.${cls} n'a plus sa première colonne bornée`).toMatch(/grid-template-columns:\s*minmax\(0,\s*var\(--texte-max\)\)\s+var\(--commande-col\);/);
    expect(r, `.${cls} écrit sa propre largeur`).toMatch(/width:\s*var\(--ligne-largeur\);/);
    expect(r, `.${cls} écrit un écart de colonnes en dur`).toMatch(/column-gap:\s*var\(--ligne-gap\);/);
    expect(r, `.${cls} écrit une largeur en pixels`).not.toMatch(/(?:^|[^-\w])(?:width|max-width|flex-basis):\s*\d+px/);
  });

  it("le sélecteur, la boîte et le bouton de sortie occupent les deux colonnes", () => {
    expect(regle("src/components/Feuillet.module.css", "cadre")).toMatch(/width:\s*var\(--ligne-largeur\);/);
    const page = lire("src/app/parametres/page.tsx");
    expect(page).toMatch(/<div className=\{styles\.cadre\}>\s*<SecurityPanel/);
    expect(page).toMatch(/<div className=\{styles\.cadre\}>\s*<DeconnexionPartout/);
    // Le sélecteur à trois choix est la ligne « colonne » : une seule colonne, aussi large que la ligne.
    expect(regle("src/app/moi/appareil/page.module.css", "colonne")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  });
});
