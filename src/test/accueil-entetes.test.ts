import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const css = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * LE TITRE D'UN BLOC DE L'ACCUEIL EST HORS DE LA CARTE, FORT, AVEC UN TRAIT JAUNE À GAUCHE (17 novembre 2026, planche « Accueil », 1A).
 * Avant : un bandeau dans la carte (8 novembre, 1B · 2A), dont le titre et la première rangée avaient la même encre. Le titre est maintenant le même partout, y compris sur Titres, Fonds et
 * Adjudications ; la carte porte fond, bord et rayon, et ne contient que des rangées. La fiche d'une ligne (`fort`) garde son titre sans trait.
 */
describe("les en-têtes de l'Accueil", () => {
  const titres = css("src/components/TitreDeBloc.module.css");
  const regle = (sel: string) => new RegExp(`${sel} \\{([^}]*)\\}`).exec(titres)?.[1] ?? "";

  it("le titre est à --t-6, en 800, avec un trait jaune de 3 px à gauche, et la ligne entière fait au moins 44 px", () => {
    expect(regle("\\.titre"), "le titre n'est plus à --t-6 en 800").toMatch(/font-size:\s*var\(--t-6\)[\s\S]*font-weight:\s*800/);
    expect(regle("\\.titre"), "le trait jaune a disparu").toMatch(/border-left:\s*3px solid var\(--gold\)/);
    expect(regle("\\.tete"), "la cible du lien n'atteint plus 44 px").toMatch(/min-height:\s*44px/);
    expect(regle("\\.tout"), "« Tout voir » n'est plus sur l'échelle").toMatch(/font-size:\s*var\(--t-4\)/);
    expect(titres, "il reste un bandeau dans la carte").not.toMatch(/\.bandeau/);
  });

  it("le composant écrit le chevron et laisse la fiche sans trait", () => {
    const tsx = lire("src/components/TitreDeBloc.tsx");
    expect(tsx).not.toMatch(/bandeau/);
    expect(tsx).toMatch(/t\(tout\)\}\{fort \? "" : " ›"\}/);
  });

  it("chaque bloc de l'Accueil porte fond, bord et rayon à sa carte, jamais à la section qui porte aussi le titre", () => {
    const cartes: [string, RegExp][] = [
      ["src/components/accueil/BlocPlat.module.css", /\.carte \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/accueil/BlocDeLignes.module.css", /\.carte \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/CeQuiFermeBientot.module.css", /\.groupe \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/IndexPulse.module.css", /\.pulse \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/accueil/BlocApprendre.module.css", /\.liste \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/CeQuiPerforme.module.css", /\.corps \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
    ];
    for (const [f, motif] of cartes) expect(css(f), `${f} : la carte ne porte plus son fond`).toMatch(motif);
    const sections: [string, RegExp][] = [
      ["src/components/accueil/BlocPlat.module.css", /\.bloc \{[^}]*gap: var\(--titre-gap\)/],
      ["src/components/accueil/BlocApprendre.module.css", /\.bloc \{[^}]*gap: var\(--titre-gap\)/],
      ["src/app/Console.module.css", /\.blocUne \{[^}]*gap: var\(--titre-gap\)/],
    ];
    for (const [f, motif] of sections) expect(css(f), `${f} : le titre n'est plus à --titre-gap de sa carte`).toMatch(motif);
    expect(css("src/components/accueil/BlocPlat.module.css"), "BlocPlat : la section porte de nouveau le fond").not.toMatch(/\.bloc \{[^}]*background/);
  });

  it("À la une de l'Accueil : une carte par ligne, filet d'or tout autour, qui défilent côte à côte", () => {
    const c = css("src/components/SelectionDuDesk.module.css");
    expect(c).toMatch(/\.groupe \{[^}]*flex-direction: row[^}]*overflow-x: auto[^}]*scroll-snap-type: x mandatory/);
    expect(c).toMatch(/\.groupe > li \{[^}]*flex: 0 0 86%/);
    expect(c).toMatch(/\.groupe \.lien \{[^}]*border: 1px solid var\(--gold\)/);
    expect(c).not.toMatch(/\.sobre \{[^}]*background/);
  });

  it("les « ··· » d'une tuile Titres ou Fonds tombent sur la marge de droite des autres tuiles", () => {
    expect(css("src/components/OfferCard.module.css"), "la tuile d'un titre reprend 24 px à droite").toMatch(/\.compact \{[^}]*padding: 8px 8px 8px 24px/);
    expect(css("src/app/fonds/FundCard.module.css"), "la tuile d'un fonds reprend 24 px à droite").toMatch(/\.compacte \{[^}]*padding: 8px 8px 8px 24px/);
  });

  it("la fiche garde son titre à plat, et « À la une » et « Ce qui performe » lisent le même composant", () => {
    expect(lire("src/components/accueil/BlocDeLignes.tsx")).toMatch(/<TitreDeBloc id=\{id\} titre=\{titre\} href=\{href\} tout=\{tout\} fort=\{fort\} \/>/);
    expect(lire("src/components/CeQuiPerforme.tsx")).toMatch(/<TitreDeBloc id="ce-qui-performe"/);
    expect(lire("src/app/Console.tsx")).toMatch(/<TitreDeBloc id="a-la-une"/);
  });
});

/**
 * LA PAGE TRADE PARLE COMME L'ACCUEIL (9 novembre 2026, planche « La page Trade », choix 4A · 2A · 1A ; le compte non ouvert, point 3, est laissé tel quel).
 */
describe("la page Trade", () => {
  const trade = css("src/app/activite/page.module.css");
  const regle = (sel: string) => new RegExp(`(?:^|\\n)\\${sel} \\{([^}]*)\\}`).exec(trade)?.[1] ?? "";

  it("« Ce qui ferme bientôt » n'est plus sur cette page : l'Activité ne le redit pas, la liste des adjudications et l'Accueil le disent (10 novembre 2026)", () => {
    expect(lire("src/app/activite/page.tsx")).not.toMatch(/<CeQuiFermeBientot/);
  });

  it("une tuile de service a son bandeau : icône, nom en encre à --t-6, « Ouvrir › » en or, une ligne, 44 px", () => {
    expect(regle(".entete"), "plus de ligne sous le bandeau").toMatch(/border-bottom:\s*1px solid var\(--line\)/);
    expect(regle(".entete"), "le bandeau n'atteint plus 44 px").toMatch(/min-height:\s*44px/);
    expect(regle(".nom"), "le nom n'est plus à --t-6 en encre").toMatch(/color:\s*var\(--ink\)[\s\S]*font-size:\s*var\(--t-6\)|font-size:\s*var\(--t-6\)[\s\S]*color:\s*var\(--ink\)/);
    expect(regle(".ouvrir"), "« Ouvrir › » n'est plus en or").toMatch(/color:\s*var\(--gold-ink\)/);
    expect(lire("src/app/activite/Tuiles.tsx")).toMatch(/<span className=\{styles\.ouvrir\}>\{t\("Ouvrir"\)\} ›<\/span>/);
  });

  it("le solde : montant à --t-7, « Rien en provision » à --t-5, geste écrit dans un bouton de 44 px", () => {
    expect(regle(".montant")).toMatch(/font-size:\s*var\(--t-7\)/);
    expect(regle(".vide")).toMatch(/font-size:\s*var\(--t-5\)/);
    expect(regle(".geste"), "le geste n'est plus un bouton de 44 px").toMatch(/min-height:\s*44px[\s\S]*border-radius:\s*999px/);
    expect(regle(".geste b"), "le geste est repassé sous la taille de lecture").toMatch(/font-size:\s*var\(--t-3\)/);
  });
});
