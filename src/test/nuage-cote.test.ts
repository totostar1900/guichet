import { describe, expect, it } from "vitest";
import { bornesAxe, ECART_PAIR, estMesure, horsDuPair, MESURES, nomCourt, teinteDe } from "@/lib/domain/nuage";

/**
 * LE NUAGE DE LA COTE : ce que ça rapporte contre combien de temps.
 *
 * Mesuré le 6 octobre 2026 sur les trente-deux obligations cotées :
 * vingt-cinq cotent exactement 100,00, donc leur rendement est leur coupon et
 * elles dessinent ensemble le coupon par échéance. Six ont quitté le pair, et
 * s'en écartent de 138 à 452 points de base. Ces six-là sont la raison d'être
 * du tracé.
 */

describe("ce qui a quitté le pair", () => {
  it("un écart au coupon de plus d'un demi-point vient du cours", () => {
    /* Les six vraies, telles que la base les donne. */
    expect(horsDuPair({ ytm: 11.12, coupon: 6.6 })).toBe(true);
    expect(horsDuPair({ ytm: 9.85, coupon: 5.95 })).toBe(true);
    expect(horsDuPair({ ytm: 6.98, coupon: 5.6 })).toBe(true);
  });

  it("mais la convention de calcul ne compte pas, amortisseurs compris", () => {
    /* Au pair, le calcul s'écarte de 0 à +18 pb selon la ligne : ACEP 7 %
       rend 7,10, ALIOS-06 7 % rend 7,18. Ce n'est pas le cours qui parle,
       c'est le capital qui revient par tranches et se replace. */
    expect(horsDuPair({ ytm: 7.1, coupon: 7 })).toBe(false);
    expect(horsDuPair({ ytm: 7.18, coupon: 7 })).toBe(false);
    expect(horsDuPair({ ytm: 6.59, coupon: 6.5 })).toBe(false);
    expect(ECART_PAIR).toBe(0.5);
  });

  it("une ligne sans rendement n'est pas déclarée au pair : elle est sans réponse", () => {
    /* EOCG 6,25 % 2026 : son échéancier d'amortissement manque au
       référentiel. Le tiret vaut mieux qu'un chiffre inventé, et surtout
       mieux qu'un anneau qui dirait « celle-ci est normale ». */
    expect(horsDuPair({ ytm: null, coupon: 6.25 })).toBe(false);
    expect(horsDuPair({ ytm: 9, coupon: undefined })).toBe(false);
  });
});

describe("le nom court d'une ligne", () => {
  it("prend ce qui suit le point médian sur une ligne cotée", () => {
    /* Les premiers mots donnaient « État du » sur cinq étiquettes voisines. */
    expect(nomCourt("État du Gabon · EOG MT 6,6 % NET 2024-2027-II", 40)).toBe("EOG MT 6,6 % NET 2024-2027-II");
    expect(nomCourt("BDEAC · BDEAC 5,95 % NET 2024-2029", 40)).toBe("BDEAC 5,95 % NET 2024-2029");
  });

  it("et ce qui le précède sur une séance, qui s'écrit à l'envers", () => {
    expect(nomCourt("OTA Cameroun 6,25 % · 8 juil. 2031 : seconde tranche", 40)).toBe("OTA Cameroun 6,25 %");
  });

  it("coupe au-delà de la longueur demandée, et le dit", () => {
    expect(nomCourt("État du Gabon · EOG MT 6,6 % NET 2024-2027-II", 20)).toBe("EOG MT 6,6 % NET 20…");
  });

  it("rend le titre entier quand il n'a pas de point médian", () => {
    expect(nomCourt("SCGRE", 40)).toBe("SCGRE");
  });
});

describe("les teintes des pays", () => {
  it("quatre pays gardent la leur, et chacun la même quoi qu'on filtre", () => {
    expect([teinteDe("CM"), teinteDe("CG"), teinteDe("GA"), teinteDe("TD")]).toEqual(["t1", "t2", "t3", "t4"]);
    expect(new Set([teinteDe("CM"), teinteDe("CG"), teinteDe("GA"), teinteDe("TD")]).size).toBe(4);
  });

  it("les deux autres se replient sur un gris nommé, sans teinte fabriquée", () => {
    /* Six teintes distinguables en vision daltonienne dans une bande de
       clarté étroite n'existent pas : trois palettes refusées au validateur,
       la pire paire à ΔE 1,4 pour un plancher de 8. */
    expect(teinteDe("GQ")).toBe("tx");
    expect(teinteDe("CF")).toBe("tx");
  });
});

describe("les bornes d'un axe", () => {
  it("laissent une marge de part et d'autre", () => {
    const [bas, haut] = bornesAxe([5, 10]);
    expect(bas).toBeLessThan(5);
    expect(haut).toBeGreaterThan(10);
  });

  it("ne descendent pas sous zéro sur une durée", () => {
    /* L'axe des durées partait à −0,2 an, et une durée négative n'existe
       pas. Le rendement, lui, peut être négatif : rien ne le borne. */
    expect(bornesAxe([0.24, 4.71], 0)[0]).toBe(0);
    expect(bornesAxe([-1.14, 16.89])[0]).toBeLessThan(0);
  });

  it("gardent une marge minimale quand toutes les valeurs se touchent", () => {
    const [bas, haut] = bornesAxe([6, 6]);
    expect(haut - bas).toBeGreaterThan(0.2);
  });
});

describe("les trois mesures", () => {
  it("sont celles-là et pas d'autres", () => {
    expect(MESURES).toEqual(["nuage", "rendement", "duree"]);
  });

  it("une adresse qui dit autre chose retombe sur le défaut", () => {
    expect(estMesure("nuage")).toBe(true);
    expect(estMesure("coupon")).toBe(false);
    expect(estMesure(null)).toBe(false);
  });
});
