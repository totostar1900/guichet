import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * La page ne bouge pas quand une feuille s'ouvre.
 *
 * LE DÉFAUT MESURÉ. Une feuille verrouille le défilement avec
 * `body { overflow: hidden }`. La barre de défilement disparaissait alors, la
 * page s'élargissait de sa largeur, et tout ce qui est calé à droite ou centré
 * sautait : 15 px, à l'ouverture et à la fermeture. Trois portes y menaient, la
 * pastille du compte, le « ⋮ » et la relecture avant un envoi, pour une seule
 * cause.
 *
 * POURQUOI UN CLIQUET. Trois variantes ont été mesurées sur la page vivante :
 * rien 15 px, `scrollbar-gutter: stable` 15 px, `html { overflow-y: scroll }`
 * 0 px. La deuxième est la règle moderne, `CSS.supports` répond oui, et elle ne
 * fait rien ici : le verrou est posé sur `body` quand la gouttière se réserve
 * sur le conteneur de défilement. Quelqu'un la réécrira de bonne foi, le saut
 * reviendra, et rien ne le dira. Ce cliquet le dit.
 */
const css = readFileSync("src/app/globals.css", "utf8");

/**
 * La déclaration du bloc `html` de tête, sans les autres blocs du fichier.
 *
 * L'accolade se cherche EN DÉBUT DE LIGNE, pas n'importe où : le commentaire de
 * la règle cite `body{overflow:hidden}`, et couper à la première accolade
 * fermante s'arrêtait au milieu de cette citation, deux lignes avant la règle à
 * vérifier. Le cliquet échouait alors sur un bloc tronqué, en disant « absent »
 * d'une ligne bien présente.
 */
const blocHtml = (() => {
  const i = css.indexOf("html {");
  expect(i).toBeGreaterThan(-1);
  const fin = css.indexOf("\n}", i);
  expect(fin).toBeGreaterThan(i);
  return css.slice(i, fin);
})();

describe("la gouttière de défilement", () => {
  it("réserve la barre sur html, donc un verrou sur body ne décale rien", () => {
    expect(blocHtml).toMatch(/overflow-y:\s*scroll/);
  });

  it("garde la mesure à côté de la ligne, pour que personne ne la remplace à l'aveugle", () => {
    // Le nombre, pas le mot : une mesure se relit, une intention se devine.
    expect(blocHtml).toMatch(/15 px/);
    expect(blocHtml).toMatch(/scrollbar-gutter/);
  });

  it("laisse le verrou des feuilles sur body, qui est ce que mesure ce cliquet", () => {
    /* Si le verrou déménageait sur html, la mesure ci-dessus ne dirait plus rien
       de la page : le cliquet veut échouer ce jour-là plutôt que mentir. Il a
       échoué le 4 octobre 2026, à raison : le verrou a quitté Sheet.tsx pour un
       module partagé, après que la page s'est mise à défiler derrière un menu
       sur iOS. Il est toujours posé sur `body`, et la gouttière réservée sur
       `html` le couvre toujours ; seule la sonde a suivi. */
    const verrou = readFileSync("src/components/mobile/verrou-defilement.ts", "utf8");
    expect(verrou, "le verrou n'est plus posé sur document.body").toMatch(/document\.body\.style/);
    expect(verrou).toMatch(/\bb\.overflow = "hidden"/);
  });
});
