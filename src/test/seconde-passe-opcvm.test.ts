import { describe, expect, it } from "vitest";
import { isoDate } from "@/lib/market/boc-parse";

/**
 * LA SECONDE PASSE SUR LE DÉBRIS, ET LA DATE QUI SE TAISAIT.
 *
 * CE QUI A ÉTÉ COMPRIS LE 12 OCTOBRE 2026, en relevant un débris entier par
 * forme plutôt que quatorze de la même. Un cas a tout expliqué :
 *
 *   AFRICA BRIGHT ASSET MANAGEMENT ORABANK GABON FCP ABD KOMO
 *   A 10 000 9 765,78 20/07/2023 9 755,94 03/08/2023 11/08/2022 -2,44% -0,10%
 *
 * Une rangée PARFAITEMENT CONFORME. Elle aurait dû passer. Elle n'est pas
 * passée parce que l'expression de la queue l'exige en FIN de tampon, et que
 * l'aplatissement du PDF colle parfois le nom de la rangée suivante derrière :
 * elle n'est alors jamais testée à cette position. Le défaut n'était pas la
 * forme, c'était la POSITION, et les deux tolérances que j'avais posées la
 * veille sur la forme n'avaient rien rendu, l'une ayant même corrompu douze
 * rangées.
 *
 * isoDate RENDAIT LA CHAÎNE BRUTE SANS LE DIRE, et c'est ce silence qui avait
 * transformé une tolérance inutile en corruption : « 22/11//2024 » ressortait
 * tel quel dans une date, et douze rangées l'ont porté sans que rien ne
 * proteste. Ces cas-là tiennent la réparation.
 */
describe("isoDate reconnaît les séparateurs abîmés du bulletin", () => {
  it("une date saine, inchangée", () => {
    expect(isoDate("20/07/2023")).toBe("2023-07-20");
  });

  it("la barre en trop : « 06/12//2024 », relevée trois fois", () => {
    expect(isoDate("06/12//2024")).toBe("2024-12-06");
  });

  it("la barre manquante : « 1312/2024 », relevée dix-sept fois", () => {
    /* La forme la plus fréquente des soixante débris : le premier séparateur
       de la date précédente ne s'imprime pas. */
    expect(isoDate("1312/2024")).toBe("2024-12-13");
  });

  it("le mois à trois chiffres, qui était déjà toléré", () => {
    expect(isoDate("06/012/2024")).toBe("2024-12-06");
  });

  it("ET CE QUI N'EST PAS UNE DATE RESTE INTACT, sans invention", () => {
    /* Une chaîne qu'on ne sait pas lire ressort telle quelle : c'est le
       comportement d'origine, et il doit survivre à l'élargissement. Ce qui
       change, c'est qu'on ne la rencontre plus pour une barre de trop. */
    expect(isoDate("pas une date")).toBe("pas une date");
    expect(isoDate("2024-12-06")).toBe("2024-12-06");
    expect(isoDate("13/12/24")).toBe("13/12/24");
  });
});
