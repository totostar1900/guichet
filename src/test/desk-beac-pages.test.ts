import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { estRouteLarge } from "@/lib/nav-colonne";

const lire = (...p: string[]) => fs.readFileSync(path.join(__dirname, "../..", ...p), "utf8");
const beac = lire("src/app/desk/beac/page.tsx");
const beacCss = lire("src/app/desk/beac/page.module.css");
const courbes = lire("src/app/desk/courbes-beac/page.tsx");
const auto = lire("src/components/desk/ReglageAuto.tsx");

describe("Marché des valeurs du Trésor : une page du desk comme les autres", () => {
  it("la colonne de la maison s'y ouvre : la page a son rail, elle n'est plus une « route large »", () => {
    expect(estRouteLarge("/desk/beac")).toBe(false);
    expect(beac).toMatch(/<Sommaire label=\{t\("Sur cette page"\)\} sections=\{rail\}>/);
  });

  it("chaque entrée du rail désigne un panneau qui existe", () => {
    for (const [, id] of beac.matchAll(/\{ id: "([a-z]+)", title:/g)) expect(beac, `le panneau « ${id} » n'existe pas`).toMatch(new RegExp(`<section id="${id}"`));
  });

  it("le tableau et le graphe d'une fiche sont côte à côte, et s'empilent sous 760 px", () => {
    expect(beacCss).toMatch(/\.fiche \{[^}]*grid-template-columns: minmax\(15rem, 22rem\) minmax\(0, 1fr\)/);
    expect(beacCss).toMatch(/@media \(max-width: 760px\) \{\s*\.fiche \{\s*grid-template-columns: minmax\(0, 1fr\)/);
    expect(beacCss).toMatch(/\.fiches \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  });

  it("tous les graphes de taux partagent UNE échelle verticale", () => {
    expect(beac.match(/\.\.\.echelleTaux|\? \{\} : echelleTaux\)/g)?.length, "courbe, rendement à une durée et fiches").toBe(3);
    expect(beac).toMatch(/pas: 2 \}/);
    expect(beac).not.toMatch(/pas: 5/);
  });

  it("la vue « BEAC contre nous » n'existe plus : la page ne lit aucune de nos séances ni de notre couverture", () => {
    expect(beac).not.toMatch(/listAuctionResults|rapprocher\(|couverture\(|name="vue"|t\("BEAC contre nous"\)|name="instrument"/);
    expect(beac).toMatch(/Cette vue ne contient que des chiffres de la BEAC/);
  });

  it("tous les « pays= » de l'adresse se lisent, pas le premier seulement", () => {
    expect(beac).not.toMatch(/un\(p, "pays"\)/);
    expect(beac).toMatch(/Array\.isArray\(p\.pays\)/);
  });
});

describe("les réglages ne font pas bouger la page", () => {
  it("le réglage passe par le routeur sans remonter, et jamais par une navigation complète", () => {
    expect(auto).toMatch(/router\.replace\(.*\{ scroll: false \}\)/);
    expect(auto).not.toMatch(/requestSubmit/);
  });

  it("les liens de réglage ne remontent pas non plus", () => {
    for (const [nom, src] of [["beac", beac], ["courbes-beac", courbes]] as const) {
      expect(src, `${nom} : un lien de réglage en <a href> recharge la page`).not.toMatch(/<a [^>]*href=\{lien\((?!reglages, "\/desk\/courbes-beac\/export")/);
      expect(src).toMatch(/scroll=\{false\}/);
    }
  });

  it("le formulaire se remonte quand les réglages changent : ses listes ne gardent pas l'ancienne valeur", () => {
    expect(beac).toMatch(/<form key=\{lien\(\{\}\)\}/);
    expect(courbes).toMatch(/<form key=\{lien\(reglages\)\}/);
  });

  it("« Appliquer » ne vit que dans un noscript, sur les deux pages", () => {
    for (const src of [beac, courbes]) expect(src).toMatch(/<noscript>[\s\S]*?type="submit"[\s\S]*?<\/noscript>/);
    for (const src of [beac, courbes]) expect(src.replace(/<noscript>[\s\S]*?<\/noscript>/g, "")).not.toMatch(/type="submit"/);
  });
});

describe("Courbes BEAC : la comparaison avec nos courbes est dans la Courbe des taux", () => {
  it("la page ne lit ni nos séances ni notre courbe", () => {
    expect(courbes).not.toMatch(/listAuctionResults|buildCurve|Nous contre|name="src"/);
  });

  it("les deux extractions sont offertes : la sélection et toute la base", () => {
    expect(courbes).toMatch(/lien\(reglages, "\/desk\/courbes-beac\/export"\)/);
    expect(courbes).toMatch(/export\?tout=1/);
  });

  it("la courbe BEAC de la Courbe des taux dit son pays, dans le sélecteur comme sur le trait", () => {
    const f = lire("src/components/market/CourbeFusion.tsx");
    expect(f).toMatch(/Courbe de la BEAC · \{p\}, du/);
    expect(f).toMatch(/`\$\{t\("BEAC"\)\} · \$\{t\(b\.nom\)\}`/);
    expect(f).toMatch(/\.series\.map\(\(s\) => t\(s\.pays\)\)/);
  });
});
