import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (p: string) => readFileSync(`${__dirname}/../../${p}`, "utf8");
const sansCommentaires = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Les tableaux des listes sur grand écran (6 novembre 2026).
 *
 * Relevé à 1 280 px : le menu de gauche prend 290 px, donc le tableau des adjudications n'avait que 964 px pour 1 057 demandés et « Voir la fiche » était coupé au
 * bord ; un sous-titre sur une seule ligne passait sous la pastille d'état ; « +0,08 % » se coupait en deux dans la colonne des fonds.
 */
describe("les tableaux des listes tiennent sur grand écran", () => {
  it("les colonnes optionnelles se retirent selon la largeur du tableau, non celle de la fenêtre", () => {
    const css = sansCommentaires("src/components/OfferBrowser.module.css");
    expect(css, "le tableau n'est plus un conteneur").toMatch(/\.tableWrap \{[^}]*container: tableau \/ inline-size;/);
    expect(css, "Échéance et Durée ne se retirent plus selon la largeur du tableau").toMatch(/@container tableau \(max-width: 1080px\) \{\s*\.hideMd \{\s*display: none;/);
    expect(css, "Échéance et Durée se retirent de nouveau selon la fenêtre").not.toMatch(/@media \(max-width: 1180px\) \{\s*\.hideMd/);
  });

  it("le sous-titre d'une ligne passe à la ligne dans sa colonne", () => {
    expect(sansCommentaires("src/components/OfferBrowser.module.css"), "le sous-titre ne passe plus à la ligne").toMatch(/\.table td\.line small \{\s*white-space: normal;/);
  });

  it("la variation du jour d'un fonds tient sur une ligne", () => {
    expect(sansCommentaires("src/app/fonds/page.module.css")).toMatch(/\.nw \{\s*white-space: nowrap;/);
    expect(lire("src/app/fonds/FundsBrowser.tsx"), "la cellule de variation a perdu sa classe").toMatch(/<td className=\{`\$\{styles\.r\} \$\{styles\.nw\} \$\{cls\(r\.variationPct\)\}`\}>/);
  });
});
