import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const css = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * LES EN-TÊTES DE L'ACCUEIL SONT DES BANDEAUX DE LA CARTE (8 novembre 2026, planche « En-têtes de l'Accueil », choix 1B · 2A).
 * Un vrai titre (--t-6, casse normale), une ligne de 1 px dessous, « Tout voir › » en or à droite, la rangée entière en lien d'au moins 44 px. Le bandeau est DANS la carte : fond, bord et rayon
 * sont à la section. La fiche d'une ligne (`fort`) garde son titre à plat.
 */
describe("les en-têtes de l'Accueil", () => {
  const bandeau = css("src/components/TitreDeBloc.module.css");
  const regle = (sel: string) => new RegExp(`\\.bandeau${sel} \\{([^}]*)\\}`).exec(bandeau)?.[1] ?? "";

  it("le bandeau a son titre à --t-6, sa ligne dessous et une cible d'au moins 44 px", () => {
    expect(regle(""), "plus de ligne sous le bandeau").toMatch(/border-bottom:\s*1px solid var\(--line\)/);
    expect(regle(""), "la cible du lien n'atteint plus 44 px").toMatch(/min-height:\s*44px/);
    expect(regle(" \\.titre"), "le titre n'est plus à --t-6 en casse normale").toMatch(/font-size:\s*var\(--t-6\)[\s\S]*text-transform:\s*none/);
    expect(regle(" \\.tout"), "« Tout voir » n'est plus sur l'échelle").toMatch(/font-size:\s*var\(--t-4\)/);
  });

  it("le composant écrit le chevron et laisse la fiche à plat", () => {
    const tsx = lire("src/components/TitreDeBloc.tsx");
    expect(tsx).toMatch(/bandeau = !fort/);
    expect(tsx).toMatch(/t\(tout\)\}\{bandeau \? " ›" : ""\}/);
  });

  it("chaque bloc de l'Accueil porte fond, bord et rayon à la section, pas aux rangées", () => {
    const sections: [string, RegExp][] = [
      ["src/components/accueil/BlocPlat.module.css", /\.bloc \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/accueil/BlocDeLignes.module.css", /\.enBandeau \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/SelectionDuDesk.module.css", /\.sobre \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/CeQuiFermeBientot.module.css", /\.sobre \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/IndexPulse.module.css", /\.enBandeau \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/components/CeQuiPerforme.module.css", /\.bloc \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
      ["src/app/Console.module.css", /\.blocUne \{[^}]*background: var\(--tuile-fond\)[^}]*border: var\(--tuile-bord\)/],
    ];
    for (const [f, motif] of sections) expect(css(f), `${f} : la section ne porte plus la carte`).toMatch(motif);
  });

  it("la fiche garde son titre à plat, et « À la une » et « Ce qui performe » lisent le même composant", () => {
    expect(lire("src/components/accueil/BlocDeLignes.tsx")).toMatch(/const enBandeau = !fort && !plat;/);
    expect(lire("src/components/CeQuiPerforme.tsx")).toMatch(/<TitreDeBloc id="ce-qui-performe"/);
    expect(lire("src/app/Console.tsx")).toMatch(/<TitreDeBloc id="a-la-une"/);
  });
});
