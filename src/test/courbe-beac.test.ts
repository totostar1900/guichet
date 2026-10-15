import { describe, expect, it } from "vitest";
import { anneesDuTenor, moisDuTitre, paysDuTitre } from "@/lib/market/courbe-beac";

/**
 * LA BEAC PUBLIE SA COURBE EN DESSIN, ET IL A FALLU LA LIRE.
 *
 * Deux cent soixante-dix-sept feuilles depuis 2015, dont la feuille de zone qui
 * porte trois courbes à la fois. Ce fichier tient les trois fonctions qui
 * nomment une pièce : son mois, son pays et ses durées. Le reste est de la
 * géométrie, et c'est le document lui-même qui l'a vérifiée, 809 points lus
 * deux fois par le tracé et par le chiffre imprimé, écart maximum de 0,01 point
 * de pourcentage.
 */
describe("ce que le titre d'une courbe dit", () => {
  it("rend le mois, quelle que soit la façon dont la BEAC écrit le titre", () => {
    expect(moisDuTitre("Courbe des taux de rendement des titres publics de la CEMAC - juillet 2026")).toBe("2026-07");
    expect(moisDuTitre("Courbe de rendements des titres publics camerounais - novembre 2019")).toBe("2019-11");
    expect(moisDuTitre("Courbe des taux de rendement des titres publics gabonais pour le mois de decembre 2015")).toBe("2015-12");
    expect(moisDuTitre("CBT Cameroun et Gabon Octobre 2016")).toBe("2016-10");
  });

  it("ne rend pas de mois quand le titre n'en porte pas", () => {
    expect(moisDuTitre("Note méthodologique - Elaboration de la courbe de rendement")).toBeUndefined();
    expect(moisDuTitre("")).toBeUndefined();
  });

  it("LIT LE PAYS DANS SON ADJECTIF, qui est souvent la seule forme du titre", () => {
    /* Une feuille par pays n'a pas de légende : « camerounais » est le seul
       endroit où le pays figure, et sans lui la courbe serait anonyme. */
    expect(paysDuTitre("Courbe de rendements des titres publics camerounais - novembre 2019")).toBe("Cameroun");
    expect(paysDuTitre("Courbe des rendements des titres publics gabonais - juin 2019")).toBe("Gabon");
    expect(paysDuTitre("Courbe de rendements des titres publics du Congo - fevrier 2026")).toBe("Congo");
    expect(paysDuTitre("Courbe des taux de rendement des titres publics tchadiens pour le mois de juin 2016")).toBe("Tchad");
  });

  it("LA ZONE PASSE AVANT LE PAYS, la feuille CEMAC nommant les trois", () => {
    /* « Courbes de rendements des titres publics de la CEMAC » ne doit pas être
       attribuée au premier pays que son texte mentionne. */
    expect(paysDuTitre("Courbe des taux de rendement des titres publics de la CEMAC - juillet 2026")).toBe("CEMAC");
  });

  it("rend les durées de l'axe en années, y compris l'abréviation", () => {
    expect(anneesDuTenor("3 mois")).toBeCloseTo(0.25, 6);
    expect(anneesDuTenor("6 mois")).toBeCloseTo(0.5, 6);
    expect(anneesDuTenor("1 an")).toBe(1);
    expect(anneesDuTenor("1,5 ans")).toBe(1.5);
    /* « 3,5A » : la BEAC abrège « ans » en « A » à un seul endroit de l'axe,
       toujours le même, et l'oublier perdait un point de chaque courbe. */
    expect(anneesDuTenor("3,5A")).toBe(3.5);
    expect(anneesDuTenor("15 ans")).toBe(15);
  });

  it("refuse ce qui n'est pas une durée, un montant compris", () => {
    expect(anneesDuTenor("11,60")).toBeUndefined();
    expect(anneesDuTenor("Maturités")).toBeUndefined();
    expect(anneesDuTenor("")).toBeUndefined();
  });
});
