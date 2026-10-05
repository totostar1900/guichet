import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gouttiere } from "@/components/charts/gouttiere";

/**
 * L'ÉTIQUETTE QUI SORT DU DESSIN NE SE PLAINT PAS.
 *
 * (Celle-ci est la gouttière d'un AXE, pas celle de la barre de défilement :
 * « gouttiere.test.ts » tient l'autre.)
 *
 * Mesuré dans le navigateur le 5 octobre 2026, vue des capitalisations de
 * l'indice à 375 px : « 1 364,8 Md » et « 1 819,7 Md » commençaient à cinq
 * pixels à gauche du bord du SVG, premier chiffre hors du viewBox. Le texte
 * était entier dans le DOM, donc une lecture du DOM ne voyait rien : seule la
 * géométrie du rendu l'a montré, et c'est une capture d'écran qui a nommé le
 * défaut. Le lecteur, lui, voyait un graphique plafonnant à 962,7 quand
 * l'indice valait 1 138,71.
 *
 * Ce cliquet tient les deux moitiés du défaut : la largeur par caractère, et le
 * fait que les deux vues qui écrivent des francs demandent leur gouttière au
 * lieu de l'inscrire en dur.
 */
describe("la gouttière de gauche d'un graphique", () => {
  /* L'étiquette exacte qui s'est fait couper : dix caractères, cinquante unités
     mesurées, plus les six de l'alignement à droite sur padL - 6. */
  it("laisse passer « 1 962,7 Md » en entier", () => {
    expect(gouttiere(["1 962,7 Md"], 52), "l'étiquette la plus longue de la vue des capitalisations déborde encore").toBeGreaterThanOrEqual(56);
  });

  it("ne rétrécit pas sous le plancher que la vue s'est donné", () => {
    expect(gouttiere(["0", "100 %"], 52)).toBe(52);
    expect(gouttiere([])).toBe(46);
  });

  /* Une étiquette vide ne compte pas : la vue principale passe « » quand elle
     ne dessine pas la bande des volumes. */
  it("ignore une étiquette absente", () => {
    expect(gouttiere(["1 139", ""])).toBe(gouttiere(["1 139"]));
  });

  /**
   * LES DEUX VUES QUI ÉCRIVENT DES FRANCS LA CALCULENT.
   *
   * La vue principale écrit le volume d'une séance au-dessus de sa bande, celle
   * des capitalisations écrit des milliards sur chaque graduation. La troisième,
   * la lecture en flottant, ne trace que du base 100, cinq caractères, et garde
   * son plancher.
   */
  it("est calculée et non inscrite en dur, là où les nombres sont longs", () => {
    const src = readFileSync(join(process.cwd(), "src/components/IndexChart.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const calculees = [...src.matchAll(/const padL = gouttiere\(/g)].length;
    expect(calculees, "la vue principale et celle des capitalisations taillent leur gouttière sur leurs étiquettes").toBe(2);
  });
});
