import { describe, expect, it } from "vitest";
import { encoursGeometriques, type Rangee } from "@/lib/market/boc-geometrie";

/**
 * L'ENCOURS DES TITRES DE DETTE, LU PAR LES ABSCISSES.
 *
 * POURQUOI CETTE TABLE COMPTE. Les adjudications donnent des FLUX, et notre
 * collecte n'en couvre qu'un quart : tout ratio bâti dessus est faussement
 * précis. Celle-ci publie le STOCK, ligne par ligne, à chaque séance. Un stock
 * publié est complet par construction, et c'est la seule route honnête vers le
 * mur des échéances tant que la collecte reste partielle.
 *
 * CE QUI SE TESTE ICI EST L'IDENTITÉ, parce que c'est elle qui rend la lecture
 * défendable, et parce que je l'ai posée fausse deux fois avant de la trouver.
 */

const rangee = (page: number, y: number, textes: string[]): Rangee => ({
  page,
  y,
  cellules: textes.map((texte, i) => ({ texte, x: 100 + i * 50, largeur: 45 })),
});

/** L'en-tête à laquelle on reconnaît la table : « Montant levé » n'est nulle part ailleurs. */
const entete = (): Rangee[] => [
  rangee(6, 500, ["Désignation du titre", "Code ISIN", "Mnemo", "Montant levé", "Nominal", "Mat", "Amortiss", "Périod"]),
  rangee(6, 490, ["l'émetteur", "facial", "cotation", "titres cotés", "en %", "précédente", "jour", "net"]),
  rangee(6, 480, ["l'échéance", "(Liquidité)"]),
];

/* La rangée du Tchad au 12 octobre 2026, cotée au pair, cellules nettes. */
const TCHAD = ["ETAT DU TCHAD", "EOTD 6.5% NET 2022-2027", "TD0000020331", "ETD01", "6,5", "24/03/2023", "100 000 000 000", "10 000 000", "5 000", "100,00", "5", "CONSTANT", "AN", "30/12/2025", "30/12/2026", "50 000 000 000", "6,5", "0"];

describe("l'encours des titres de dette", () => {
  it("lit la rangée entière, service compris", () => {
    const out = encoursGeometriques([...entete(), rangee(6, 400, TCHAD)]);
    expect(out).toHaveLength(1);
    const e = out[0];
    expect(e).toMatchObject({
      isin: "TD0000020331",
      mnemo: "ETD01",
      issuer: "ETAT DU TCHAD",
      designation: "EOTD 6.5% NET 2022-2027",
      couponRate: 6.5,
      units: 10_000_000,
      nominalRemaining: 5_000,
      pricePct: 100,
      maturityYears: 5,
      amortisation: "CONSTANT",
      periodicity: "AN",
      previousCouponOn: "2025-12-30",
      nextCouponOn: "2026-12-30",
      outstanding: 50_000_000_000,
    });
  });

  it("L'IDENTITÉ EST AU COURS, ET NON AU NOMINAL", () => {
    /* MON ERREUR, ET LE DOCUMENT L'A CORRIGÉE. J'avais posé « titres ×
       nominal = encours », vrai des seules lignes cotées au pair : treize sur
       trente et une l'étaient, et les dix-huit autres étaient refusées. La
       colonne s'appelle « Encours calculé à ce jour », ce que j'aurais pu
       lire. 11 032 250 000 × 0,99 = 10 921 927 500. */
    const aNeufDix = ["ETAT DU CAMEROUN", "ECMR 7.25% NET 2023-2031", "CM0000020388", "ECM10", "7,25", "23/11/2023", "11 032 250 000", "1 103 225", "10 000", "99,00", "8", "CONSTANT", "AN", "23/06/2026", "23/06/2027", "10 921 927 500", "7,3", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, aNeufDix)])[0];
    expect(e.outstanding).toBe(10_921_927_500);
    expect((e.units * e.nominalRemaining * e.pricePct) / 100).toBe(e.outstanding);
  });

  it("retrouve un nombre que la grille a coupé en deux", () => {
    /* « 23 500 000 » sort en « 23 » et « 500 000 » quand un bord de colonne
       tombe au milieu d'une espace de milliers. La rangée porte alors sept
       nombres là où elle en a six, et toute lecture par position se décale.
       On ne devine pas la découpe : chaque recollement est un candidat, et
       c'est l'identité qui tranche. */
    const coupee = ["ETAT DU CAMEROUN", "ECMR 6.25% NET 2022-2029", "CM0000020305", "ECMR6", "6,25", "28/09/2022", "235 000 000 000", "23", "500 000", "6 000", "100,00", "7", "CONSTANT", "AN", "27/05/2026", "27/05/2027", "141 000 000 000", "6,3", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, coupee)])[0];
    expect(e.units).toBe(23_500_000);
    expect(e.nominalRemaining).toBe(6_000);
    expect(e.outstanding).toBe(141_000_000_000);
  });

  it("tolère que le bulletin arrondisse le même nombre de deux façons", () => {
    /* ALIOS-06 imprime un nominal de 8888,889 et calcule son encours avec
       8888,89 : 613 francs d'écart sur 612 955 titres, soit exactement un
       millième par titre. Une demi-unité du dernier décimal refusait la
       rangée ; il en faut une entière. */
    const alios = ["ALIOS FINANCE ALIOS-06 7% BRUT 2025-2030", "CM0000020628", "AFC06", "7", "19/12/2025", "6 129", "550 000", "612", "955", "8888,889", "100,00", "5", "CONSTANT", "TRIM", "07/08/2026", "07/11/2026", "5 448 489 570", "7,00", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, alios)])[0];
    expect(e.units).toBe(612_955);
    expect(e.nominalRemaining).toBe(8888.889);
    expect(e.outstanding).toBe(5_448_489_570);
  });

  it("sépare l'émetteur de la désignation quand ils tiennent dans une cellule", () => {
    /* « ACEP CAMEROUN ACEP 7% BRUT 2024-2027 » partait entier dans le nom de
       l'émetteur, ce qui donnait un émetteur par ligne au lieu d'un par
       maison. La désignation porte toujours le taux : on coupe juste avant le
       mot qui précède le pourcentage. */
    const acep = ["ACEP CAMEROUN ACEP 7% BRUT 2024-2027", "CM0000020545", "ACP01", "7", "15/05/2024", "3 000 000 000", "300 000", "10 000", "100,00", "3", "CONSTANT", "AN", "15/05/2026", "15/05/2027", "3 000 000 000", "7,0", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, acep)])[0];
    expect(e.issuer).toBe("ACEP CAMEROUN");
    expect(e.designation).toBe("ACEP 7% BRUT 2024-2027");
  });

  it("REFUSE une rangée dont l'identité ne tombe pas", () => {
    /* Le seul garde. Un chiffre déplacé passerait tous les contrôles de
       forme ; il ne passe pas celui-ci. */
    const faussee = [...TCHAD];
    faussee[15] = "51 000 000 000";
    expect(encoursGeometriques([...entete(), rangee(6, 400, faussee)])).toHaveLength(0);
  });

  it("ne rend rien quand la table est absente", () => {
    expect(encoursGeometriques([rangee(1, 700, ["MARCHE DES ACTIONS"])])).toEqual([]);
  });

  it("ne compte pas deux fois le même ISIN", () => {
    expect(encoursGeometriques([...entete(), rangee(6, 400, TCHAD), rangee(7, 390, TCHAD)])).toHaveLength(1);
  });
});
