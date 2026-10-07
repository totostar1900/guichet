import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ampleurVariations, echelonVariations, poserFenetre } from "@/lib/domain/indice-fenetre";

/**
 * LA FENÊTRE DE L'INDICE ET L'ÉCHELLE DES VARIATIONS, 7 octobre 2026.
 *
 * Trois faits mesurés ce jour-là sur les 697 séances du dépôt, et une
 * quatrième règle lue dans la feuille de style, parce qu'elle n'a de preuve
 * qu'à l'écran.
 */

describe("poser la fenêtre", () => {
  it("garde deux séances quand les bornes se croisent", () => {
    /* Les deux champs de dates règlent la même chose, et rien n'empêche de
       mettre « Au » avant « Du ». Une fenêtre d'une seule séance tombait sur
       le « pas assez de séances lues », qui emportait la barre avec laquelle
       on venait de la poser : une commande ne détruit pas sa propre page. */
    expect(poserFenetre(262, 140, 3)).toEqual([140, 141]);
    expect(poserFenetre(262, 200, 200)).toEqual([200, 201]);
  });

  it("ne sort jamais de la série", () => {
    expect(poserFenetre(262, -40, 900)).toEqual([0, 261]);
    expect(poserFenetre(262, 900, 900)).toEqual([260, 261]);
  });

  it("laisse la fenêtre entière passer telle quelle", () => {
    expect(poserFenetre(697, 0, 696)).toEqual([0, 696]);
  });
});

describe("l'ampleur de l'axe des variations", () => {
  it("tient le corps des mouvements, et non le plus grand", () => {
    /* Mesuré sur le dépôt : 136 séances bougées, médiane 0,415 %, quinze
       au-delà de 3 %, maximum 6,78 %. Tendu sur le maximum, l'axe donnait
       sept pixels au mouvement médian : cinq pics et une ligne plate. */
    const corps = Array.from({ length: 100 }, (_, i) => (i % 2 ? 1 : -1) * (0.1 + i * 0.02));
    const avecPics = [...corps, 6.78, -5.46, 3.46];
    expect(ampleurVariations(avecPics)).toBeLessThan(6.78);
    expect(ampleurVariations(avecPics)).toBeGreaterThan(1);
  });

  it("ne compte pas les séances immobiles, qui sont les trois quarts", () => {
    /* 561 séances sur 697 cotent exactement la veille. Les compter tirerait
       le décile vers zéro et l'axe se refermerait sur son plancher. */
    const immobiles = Array.from({ length: 500 }, () => 0);
    expect(ampleurVariations([...immobiles, 1.8, 2.2, 2.6, 3])).toBeGreaterThan(1);
  });

  it("garde un plancher quand rien n'a bougé dans la fenêtre", () => {
    expect(ampleurVariations([0, 0, 0])).toBe(0.5);
    expect(ampleurVariations([])).toBe(0.5);
  });

  it("suit la fenêtre, parce que le marché a changé d'amplitude", () => {
    /* Mouvement médian : 0,06 % en 2024, 0,99 % en 2026. Une échelle fixée
       une fois pour toutes écraserait 2024 autant que le maximum écrasait
       l'ensemble. */
    const en2024 = [0.04, 0.06, 0.06, 0.08, 0.12, 3.46];
    const en2026 = [0.5, 0.99, 1.4, 2.2, 5.3, 6.78];
    expect(ampleurVariations(en2024)).toBeLessThan(ampleurVariations(en2026));
  });
});

describe("le pas des graduations", () => {
  it("tombe sur des valeurs rondes, quelle que soit l'ampleur", () => {
    expect(echelonVariations(0.73)).toBeCloseTo(0.2, 10);
    expect(echelonVariations(3.32)).toBe(1);
    expect(echelonVariations(0.5)).toBeCloseTo(0.2, 10);
  });

  it("laisse entre trois et neuf graduations de part et d'autre du zéro", () => {
    for (const amp of [0.5, 0.73, 1.2, 3.32, 5.3, 6.78]) {
      const n = Math.floor(amp / echelonVariations(amp));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe("les barres des variations n'ont pas de filet", () => {
  it("sinon elles sont peintes à la couleur du fond, sur le fond", () => {
    /* LE DÉFAUT QUI RENDAIT LA VUE VIDE, et qu'aucun essai ne disait : les
       aplats de la plateforme portent un filet de 1,5 px à la couleur de la
       surface, pour séparer deux voisins. Une barre de variation fait 1,5 px
       de large — 262 séances dans 702 px — et le filet recouvrait exactement
       sa surface. Mesuré dans le navigateur : fill rgb(92,196,140), stroke
       rgb(22,35,58), stroke-width 1,5. Chaque barre était bleu nuit sur bleu
       nuit. L'écart entre deux barres les sépare déjà, il est réservé dans
       leur largeur. */
    const css = readFileSync("src/components/IndexChart.module.css", "utf8");
    for (const classe of ["varUp", "varDown", "varPlat"]) {
      const bloc = css.match(new RegExp(`\\.${classe}\\s*\\{([^}]*)\\}`));
      expect(bloc, `.${classe} doit exister dans la feuille`).toBeTruthy();
      expect(bloc![1]).toMatch(/fill:/);
      expect(bloc![1]).not.toMatch(/stroke/);
    }
  });
});
