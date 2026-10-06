import { describe, expect, it } from "vitest";
import { bornesAxe, estMesure, horsDuPair, MESURES, nomCourt, teinteDe } from "@/lib/domain/nuage";

/**
 * LE NUAGE DE LA COTE : ce que ça rapporte contre combien de temps.
 *
 * Mesuré le 6 octobre 2026 sur les trente-deux obligations cotées :
 * vingt-cinq cotent exactement 100,00, donc leur rendement est leur coupon et
 * elles dessinent ensemble le coupon par échéance. Six ont quitté le pair, et
 * s'en écartent de 138 à 452 points de base. Ces six-là sont la raison d'être
 * du tracé.
 */

describe("le prix sous 100 %", () => {
  it("marque les lignes décotées, qui sont celles qui rapportent plus que leur coupon", () => {
    /* Les six que l'ancienne règle du demi-point désignait déjà : on achète
       moins de cent ce qui sera remboursé cent. */
    expect(horsDuPair({ cours: 97 })).toBe(true);
    expect(horsDuPair({ cours: 94.96 })).toBe(true);
    expect(horsDuPair({ cours: 98.5 })).toBe(true);
  });

  it("et les deux que l'écart au coupon laissait passer", () => {
    /* ECMR 7,25 % à 99 ne s'écartait que de 40 pb, sous l'ancien seuil.
       EOCG 6,25 % à 95 n'a pas de rendement calculable faute d'échéancier,
       et c'est pourtant la ligne la plus décotée de la cote : l'ancienne
       règle, qui partait du rendement, ne pouvait rien en dire. */
    expect(horsDuPair({ cours: 99 })).toBe(true);
    expect(horsDuPair({ cours: 95 })).toBe(true);
  });

  it("ne marque pas le pair, ni ce qui le dépasse", () => {
    /* Au pair, l'écart au coupon qui subsiste est de convention, jusqu'à
       +18 pb pour un amortisseur fréquent : ce n'est pas le cours qui parle.
       Au-dessus de cent, le rendement passe sous le coupon : c'est un autre
       fait, qui demandera sa propre marque le jour où il arrivera. */
    expect(horsDuPair({ cours: 100 })).toBe(false);
    expect(horsDuPair({ cours: 103 })).toBe(false);
    expect(horsDuPair({ cours: undefined })).toBe(false);
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
    /* LES CLEFS SONT CELLES DU DOMAINE, et non des codes ISO : « country »
       porte « Cameroun », pas « CM ». Avec les codes, les trente-deux points
       tombaient sur le gris des « autres » tandis que la légende montrait
       quatre couleurs que le tracé n'utilisait pas. */
    expect([teinteDe("Cameroun"), teinteDe("Congo"), teinteDe("Gabon"), teinteDe("Tchad")]).toEqual(["t1", "t2", "t3", "t4"]);
    expect(new Set([teinteDe("Cameroun"), teinteDe("Congo"), teinteDe("Gabon"), teinteDe("Tchad")]).size).toBe(4);
    expect(teinteDe("CM")).toBe("tx");
  });

  it("les deux autres se replient sur un gris nommé, sans teinte fabriquée", () => {
    /* Six teintes distinguables en vision daltonienne dans une bande de
       clarté étroite n'existent pas : trois palettes refusées au validateur,
       la pire paire à ΔE 1,4 pour un plancher de 8. */
    expect(teinteDe("Guinée éq.")).toBe("tx");
    expect(teinteDe("RCA")).toBe("tx");
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
