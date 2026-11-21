import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const regle = (f: string, sel: string) => (sansNotes(lire(f)).match(new RegExp(`(?:^|\\n)${sel.replace(/[.\\]/g, "\\$&")}\\s*\\{[^}]*\\}`)) ?? [""])[0];

/**
 * UN TITRE DE SECTION, UNE GRAISSE (21 novembre 2026, planche « Cohérence des pages », 1A · 2A).
 *
 * Mesuré sur douze pages : 800, 700, 600 et 400 selon la page, pour le même geste. La graisse est un jeton (`--titre-section-poids`, 700) et la taille celle de l'échelle (`--t-6`) ; une page qui écrirait la sienne rouvrirait l'écart.
 * Marché n'a plus de surtitre : une racine n'en prend pas, et la provenance des chiffres descend sous le titre.
 */
describe("le titre d'une section", () => {
  const TITRES: Array<[string, string]> = [
    ["src/components/TitreDeBloc.module.css", ".titre"],
    ["src/app/moi/argent/page.module.css", ".titre"],
    ["src/components/Feuillet.module.css", ".bloc h2"],
    ["src/app/globals.css", ".panel-h h2"],
  ];
  it("le jeton est déclaré une fois, à 700", () => {
    const g = sansNotes(lire("src/app/globals.css"));
    expect(g).toMatch(/--titre-section-poids:\s*700;/);
    expect((g.match(/--titre-section-poids:/g) ?? []).length).toBe(1);
  });
  it.each(TITRES)("%s %s lit le jeton et la taille de l'échelle", (f, sel) => {
    const r = regle(f, sel);
    expect(r, `${sel} de ${f} introuvable`).not.toBe("");
    expect(r, `${sel} écrit sa propre graisse`).toMatch(/font-weight:\s*var\(--titre-section-poids\);/);
    expect(r, `${sel} sort de l'échelle`).toMatch(/font-size:\s*var\(--t-6\);/);
  });
  it("Activité prend le titre de l'Accueil : ses rubriques et ses rayons, et plus de « Les services »", () => {
    const rub = sansNotes(lire("src/app/activite/Rubriques.tsx"));
    expect(rub).toMatch(/<TitreDeBloc titre=\{g\.titre\} \/>/);
    expect(rub).not.toMatch(/<h2/);
    const tu = sansNotes(lire("src/app/activite/Tuiles.tsx"));
    expect(tu).toMatch(/<h2 className=\{titres\.titre\}>/);
    const page = sansNotes(lire("src/app/activite/page.tsx"));
    expect(page, "la mention « Les services » est revenue en titre").not.toMatch(/<h2[^>]*>\{t\("Les services"\)\}<\/h2>/);
  });
  it("Marché ouvre sur son titre seul ; la provenance est sous la phrase", () => {
    const p = lire("src/app/marche/page.tsx");
    const tete = p.slice(p.indexOf("<EnTete"), p.indexOf("/>", p.indexOf("<EnTete")));
    expect(tete, "Marché a retrouvé un surtitre").not.toMatch(/surTitre/);
    expect(p).toMatch(/className=\{styles\.provenance\}>\{`BVMAC · /);
  });
});
