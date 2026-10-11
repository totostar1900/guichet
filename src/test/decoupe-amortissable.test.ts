import { describe, expect, it } from "vitest";
import { splitPriceNominal } from "@/lib/market/boc-parse";
import { lireValeurs } from "@/lib/market/boc-geometrie";

/**
 * LE PRIX D'UNE LIGNE AMORTISSABLE N'EST PAS RAPPORTÉ AU NOMINAL DU JOUR.
 *
 * C'est la cause de la famille « prix / nominal ambigus » : 78 remarques sur
 * 66 séances, et le lecteur renonçait alors que les trois nombres étaient
 * imprimés en clair. Relevé le 11 octobre 2026 sur le texte brut de trois
 * lignes, que la base ne gardait pas avant ce jour-là :
 *
 *   CM0000020354   98,40 %   prix 9 840,00    nominal imprimé 0,000
 *   GA0000020248   99,50 %   prix 2 487,50    nominal imprimé 0,000
 *   CM0000020362  100,00 %   prix 10 000,00   nominal imprimé 5 000,000
 *
 * Le prix est rapporté au DERNIER NOMINAL NON NUL de la ligne, celui qui
 * courait avant que le capital ne soit remboursé.
 */
describe("la première identité ne bouge pas", () => {
  it("une ligne ordinaire se tranche sans aucune référence", () => {
    /* Le prix vaut le pourcentage du nominal imprimé : rien à savoir d'ailleurs. */
    expect(splitPriceNominal("10000,0010000,000", 100)).toEqual({ price: 10000, nominal: 10000 });
    expect(splitPriceNominal("9840,0010000,000", 98.4)).toEqual({ price: 9840, nominal: 10000 });
  });

  it("et elle garde la priorité quand une référence est fournie", () => {
    /* UNE RÉFÉRENCE N'EST PAS UNE PERMISSION. Si la découpe se justifie toute
       seule, c'est elle qui sort, même si la référence en désignait une autre :
       un nombre imprimé se croit sur parole avant un nombre déduit. */
    expect(splitPriceNominal("9840,0010000,000", 98.4, 5000)).toEqual({ price: 9840, nominal: 10000 });
  });
});

describe("la seconde identité, et seulement quand la première renonce", () => {
  it("un nominal imprimé nul : le prix tient par la référence", () => {
    /* Les deux cas les plus fréquents du dépôt. Sans référence, « nominal <= 0 »
       rejetait la ligne entière et la séance passait en « partiel ». */
    expect(splitPriceNominal("9840,000,000", 98.4), "sans référence, il renonce").toBeUndefined();
    expect(splitPriceNominal("9840,000,000", 98.4, 10000)).toEqual({ price: 9840, nominal: 0 });
    expect(splitPriceNominal("2487,500,000", 99.5, 2500)).toEqual({ price: 2487.5, nominal: 0 });
  });

  it("un nominal remboursé de moitié : le prix suit l'ancien", () => {
    /* 100 % de 5 000 ferait 5 000, et le bulletin imprime 10 000 : la
       première identité ne peut pas tenir, et elle a raison de ne pas tenir. */
    expect(splitPriceNominal("10000,005000,000", 100), "sans référence, il renonce").toBeUndefined();
    expect(splitPriceNominal("10000,005000,000", 100, 10000)).toEqual({ price: 10000, nominal: 5000 });
  });

  it("une référence qui ne colle pas ne force rien", () => {
    /* C'est une identité, pas un laissez-passer : si le prix attendu ne se
       retrouve dans aucune découpe, le lecteur renonce comme avant, et la
       remarque reste. Une référence fausse ne doit jamais fabriquer une
       ligne. */
    expect(splitPriceNominal("9840,000,000", 98.4, 777)).toBeUndefined();
    expect(splitPriceNominal("9840,000,000", 98.4, 0), "une référence nulle n'est pas une référence").toBeUndefined();
  });

  it("et la tolérance reste celle de la maison : un franc et demi", () => {
    expect(splitPriceNominal("9841,000,000", 98.4, 10000), "un franc d'écart passe").toEqual({ price: 9841, nominal: 0 });
    expect(splitPriceNominal("9842,000,000", 98.4, 10000), "deux francs, non").toBeUndefined();
  });
});

describe("le lecteur géométrique porte la même seconde identité", () => {
  it("il refusait les lignes amortissables pour la même raison", () => {
    /* 81 des refus mesurés le 11 octobre 2026 sur les 48 séances de la
       famille « ligne de cours non reconnue » étaient « aucune découpe
       n'accorde le prix, le nominal et la bande de six pour cent ». La même
       identité que le lecteur aplati, dans l'autre lecteur. */
    const avant = ["98,40", "9 840,00", "0,000", "0,00"];
    const apres = ["98,40", "98,40", "104,30", "92,50", "0,00%", "0,00"];
    expect(lireValeurs(avant, apres), "sans référence, il renonce").toBeUndefined();
    const lu = lireValeurs(avant, apres, false, 10000);
    expect(lu?.prix).toBe(9840);
    expect(lu?.nominal).toBe(0);
    expect(lu?.pct).toBe(98.4);
  });

  it("et une référence fausse ne fabrique rien", () => {
    const avant = ["98,40", "9 840,00", "0,000", "0,00"];
    const apres = ["98,40", "98,40", "104,30", "92,50", "0,00%", "0,00"];
    expect(lireValeurs(avant, apres, false, 777)).toBeUndefined();
  });

  it("la bande de six pour cent reste exigée, référence ou pas", () => {
    /* Les deux vérifications sont indépendantes : la seconde identité ne
       dispense pas de la première bande, sinon une rangée fausse passerait. */
    const avant = ["98,40", "9 840,00", "0,000", "0,00"];
    const faux = ["98,40", "98,40", "120,00", "80,00", "0,00%", "0,00"];
    expect(lireValeurs(avant, faux, false, 10000)).toBeUndefined();
  });
});
