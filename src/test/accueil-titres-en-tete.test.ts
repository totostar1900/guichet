import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/* LE BLOC « TITRES » PORTE « CE QUI PERFORME », À SA PLACE (22 novembre 2026, le client : « remplacer le bloc Titres par celui de Ce qui performe, en conservant le titre Titres et le lien Tout voir ; sans changer de position ; Ce qui performe n'est plus ailleurs »).
   Une première version avait déplacé le bloc en tête de page : ce n'était pas la demande. */
const lire = (f: string) => readFileSync(f, "utf8");
const console_ = lire("src/app/Console.tsx");
const bloc = lire("src/components/CeQuiPerforme.tsx");
const grille = lire("src/components/accueil/GrilleInvestir.tsx");

describe("le bloc Titres de l'accueil", () => {
  it("garde le titre « Titres » et le lien « Tout voir » vers la liste des titres", () => {
    expect(bloc).toMatch(/<TitreDeBloc id="ce-qui-performe" titre="Titres" href="\/titres" tout="Tout voir" \/>/);
    expect(bloc, "l'ancien titre est revenu").not.toMatch(/titre="Ce qui performe"/);
  });
  it("est à sa place d'origine, en première place d'« Investir », et « Ce qui performe » n'est plus posé ailleurs", () => {
    expect(grille).toMatch(/\{trois \? <CeQuiPerforme classement=\{trois\} \/> : <BlocDeCartes id="investir-titres"/);
    expect(grille.indexOf("<CeQuiPerforme"), "le bloc Titres n'est plus avant Fonds").toBeLessThan(grille.indexOf('id="investir-fonds"'));
    expect(console_, "Ce qui performe est reposé sur l'accueil").not.toMatch(/<CeQuiPerforme/);
    expect(console_, "le bloc est repassé en tête de page").not.toMatch(/import \{ CeQuiPerforme \}/);
  });
  it("le classement n'est lu qu'une fois pour la page", () => {
    expect((console_.match(/performanceSur\(/g) ?? []).length).toBe(0);
    expect((grille.match(/performanceSur\(/g) ?? []).length).toBe(1);
  });
});
