import { describe, expect, it } from "vitest";
import { encoursGeometriques, type Rangee } from "@/lib/market/boc-geometrie";
import { validate } from "@/lib/market/boc";
import { classer, famille } from "@/lib/market/remarques";
import type { BocParsed } from "@/lib/market/boc-parse";

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

  it("RECOLLE UN NOMBRE QUI SE TERMINE PAR SA DÉCIMALE", () => {
    /* LE DÉFAUT QUI A COÛTÉ QUATRE-VINGT-DIX-HUIT SÉANCES, et seule
       l'écriture des 807 l'a fait sortir. La grille coupe TROIS nombres dans
       cette rangée du Congo :

         113 | 230 000 000 | 11 | 323 000 | 6 | 666,67 | 95,00

       Le recollement refusait toute cellule portant une virgule, donc
       « 6 » + « 666,67 » n'était même pas un candidat : le nominal 6 666,67
       n'existait pas, et la seule découpe possible était la fausse,
       113 230 006 titres à 666,67. Elle satisfait l'identité à onze
       millionièmes près, parce qu'un chiffre qui TRAVERSE la frontière
       titres / nominal conserve le produit. Le garde a signé pendant huit
       mois de séances.

       Un nombre ne continue pas après sa partie décimale ; il s'y arrête. */
    const congo = ["ETAT DU CONGO", "EOCG 6,25% NET 2021-2026", "CG0000020238", "ECG02", "6,25", "30/07/2021", "113", "230 000 000", "11", "323 000", "6", "666,67", "95,00", "5", "CONSTANT", "AN", "22/03/2024", "22/03/2025", "71 712 295 590", "6,2", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, congo)])[0];
    expect(e.units).toBe(11_323_000);
    expect(e.nominalRemaining).toBe(6666.67);
    expect(e.amountRaised).toBe(113_230_000_000);
    expect(e.amountRaised / e.units).toBe(10_000);
  });

  it("CHOISIT LA DÉCOUPE DONT LE NOMINAL D'ORIGINE EST ENTIER", () => {
    /* L ANGLE MORT DE L IDENTITÉ, trouvé en écrivant les 807 séances et pas
       avant. Un chiffre qui TRAVERSE la frontière titres / nominal conserve
       le produit : le Congo porte 11 323 000 titres à 6 666,67, et la grille
       les rend aussi bien 113 230 006 titres à 666,67. Les deux découpes
       satisfont titres × nominal × cours = encours, et le lecteur signait la
       mauvaise sur quatre-vingt-dix-huit séances.

       Le second invariant était dans la rangée depuis le début : montant levé
       ÷ titres est le nominal d origine, et il vaut 10 000 sur les 16 712
       rangées saines, minimum comme maximum. La découpe fautive donne
       999,99995. On ne demande qu un entier, pas dix mille : une cote peut
       changer de nominal, une recombinaison fausse ne peut pas tomber rond. */
    /* Le recollement rétabli, les DEUX découpes existent et toutes deux
       satisfont l'identité. C'est le second invariant qui tranche, et il
       était dans la rangée depuis le début : montant levé ÷ titres est le
       nominal d'origine. Sur les 16 712 rangées saines de 807 séances il vaut
       EXACTEMENT 10 000, minimum comme maximum ; la découpe fautive donne
       999,999947. On ne demande qu'un entier, pas dix mille : une cote peut
       changer de nominal, une recombinaison fausse ne tombe jamais rond. */
    const congo = ["ETAT DU CONGO", "EOCG 6,25% NET 2021-2026", "CG0000020238", "ECG02", "6,25", "30/07/2021", "113", "230 000 000", "11", "323 000", "6", "666,67", "95,00", "5", "CONSTANT", "AN", "22/03/2024", "22/03/2025", "71 712 295 590", "6,2", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, congo)])[0];
    expect(e.units).not.toBe(113_230_006);
    expect(e.amountRaised / e.units).toBe(10_000);
  });

  it("LIT LE MNÉMONIQUE DANS LA CELLULE DE L'ISIN quand la grille les colle", () => {
    /* QUINZE POUR CENT DES RANGÉES, 2 533 sur 16 915 et 484 séances, portaient
       un TAUX en guise de mnémonique. La grille colle parfois l'ISIN et le
       mnémonique dans une même cellule, « CM0000020107 ECMR5 », et le lecteur
       prenait alors la cellule SUIVANTE, qui est le taux facial.
       Un mnémonique porte une lettre ; un taux n'en porte pas. */
    const colle = ["ETAT DU CAMEROUN", "ECMR 5,6% NET 2018-2023", "CM0000020107 ECMR5", "5,6", "15/11/2018", "200 000 000 000", "20 000 000", "2 480", "100,00", "5", "CONSTANT", "AN", "15/11/2022", "15/11/2023", "49 600 000 000", "5,59", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, colle)])[0];
    expect(e.mnemo).toBe("ECMR5");
    expect(e.couponRate).toBe(5.6);
  });

  it("LIT LA DÉSIGNATION DEVANT L'ISIN dans la même cellule", () => {
    /* L'AUTRE MOITIÉ DE LA MÊME CAUSE. Chez BDEAC la désignation précède
       l'ISIN dans sa cellule : « BDEAC 5.45% NET 2020 - 2027 CG0000020220 ».
       Les cellules d'avant ne portaient plus que « BDEAC », et la ligne EBD01
       est restée SANS DÉSIGNATION pendant 767 séances, toute sa vie cotée.
       Rien ne protestait : une désignation vide s'affiche comme un blanc. */
    const bdeac = ["BDEAC", "BDEAC 5.45% NET 2020 - 2027 CG0000020220", "EBD01", "5,45", "03/02/2021", "106 791 920 000", "10 679 192", "4 000", "100,00", "7", "CONSTANT", "AN", "31/12/2025", "31/12/2026", "42 716 768 000", "5,45", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, bdeac)])[0];
    expect(e.issuer).toBe("BDEAC");
    expect(e.designation).toBe("BDEAC 5.45% NET 2020 - 2027");
    expect(e.mnemo).toBe("EBD01");
  });

  it("refuse de prendre le montant levé pour un nombre de titres", () => {
    /* Deux lignes BDEAC l ont subi sur la moitié de leur vie : 1 538 685
       titres lus 15 386 850 000, soit le montant levé lui-même. Le quotient
       tombe alors sous l unité au lieu de rendre un nominal. */
    const bdeac = ["BDEAC", "EBD 5,45% NET 2021-2028", "CG0000020436", "EBD02", "5,45", "29/10/2021", "15 386 850 000", "10 000", "100,00", "7", "CONSTANT", "AN", "29/10/2025", "29/10/2026", "15 386 850 000", "5,45", "0"];
    const e = encoursGeometriques([...entete(), rangee(6, 400, bdeac)])[0];
    expect(e?.units).not.toBe(15_386_850_000);
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

describe("le garde de complétude de l'encours", () => {
  /**
   * UN STOCK NE PERD PAS UNE LIGNE DU JOUR AU LENDEMAIN.
   *
   * La cote avait ce garde depuis longtemps, la table d'encours n'en avait
   * aucun. Mesuré le 14 octobre 2026 sur les 808 séances : 1 547 lignes
   * manquent sur 18 493 attendues, huit pour cent, sur 547 séances, et
   * AUCUNE ne le disait.
   *
   * POURQUOI C'EST PIRE QUE SUR LA COTE. Une cotation manquante laisse un
   * blanc qui se voit. Un encours manquant fait BAISSER LE TOTAL, et la
   * baisse se lit comme un remboursement : l'étude d'évolution, objet même
   * de cette table, inventerait des amortissements.
   */
  const seance = (outstandings: { isin: string }[]): BocParsed =>
    ({ sessionDate: "2026-10-13", bulletinNo: 1, equities: [], bonds: [], funds: [], capitalisation: [], outstandings, warnings: [], notes: [], index: undefined }) as unknown as BocParsed;

  it("NOMME LES LIGNES QUI ONT DISPARU DEPUIS LA VEILLE", () => {
    const { anomalies } = validate(
      seance([{ isin: "CM0000020305" }]),
      [],
      [],
      [],
      0,
      [{ isin: "CM0000020305" }, { isin: "GA0000020313" }, { isin: "CG0000020220" }],
    );
    const dit = anomalies.find((a) => a.startsWith("Encours : lignes présentes"));
    expect(dit).toBeDefined();
    expect(dit).toContain("GA0000020313");
    expect(dit).toContain("CG0000020220");
    /* Celle qui est là ne doit pas être dénoncée : un garde qui crie sur le
       présent n'est plus lu. */
    expect(dit).not.toContain("CM0000020305");
  });

  it("SE TAIT QUAND LA TABLE EST COMPLÈTE", () => {
    const { anomalies } = validate(seance([{ isin: "A" }, { isin: "B" }]), [], [], [], 0, [{ isin: "A" }, { isin: "B" }]);
    expect(anomalies.some((a) => a.startsWith("Encours : lignes présentes"))).toBe(false);
  });

  it("SE TAIT LA PREMIÈRE FOIS, FAUTE DE VEILLE", () => {
    /* Sans séance précédente il n'y a rien à comparer : crier ici
       dénoncerait chaque première lecture d'un historique. */
    const { anomalies } = validate(seance([]), [], [], [], 0, []);
    expect(anomalies.some((a) => a.startsWith("Encours : lignes présentes"))).toBe(false);
  });

  it("LA REMARQUE TROUVE SA FAMILLE, ET ELLE DIT QUE LA DONNÉE MANQUE", () => {
    /* Sans famille, elle tomberait dans le fourre-tout « Z » et ne serait
       comptée nulle part : c'est le défaut que le rapport a révélé hier. */
    const phrase = "Encours : lignes présentes au bulletin précédent et absentes aujourd'hui : GA0000020313.";
    expect(classer(phrase)).toBe("AA");
    expect(famille("AA")?.sort).toBe("perdue");
  });
});

describe("le garde de la rangée décalée", () => {
  /**
   * AUCUN CONTRÔLE INTERNE NE PEUT LA VOIR. Le 15 avril 2026, la donnée
   * d'ACEP1 atterrit sur l'ISIN d'ALIOS-05 et celle de SNPC sur celui
   * d'ALIOS-06 : 3 208 600 titres pour une ligne qui en compte 612 955. La
   * rangée reste pourtant cohérente avec elle-même, montant levé sur titres
   * y vaut toujours 10 000 rond. Elle n'est fausse que par rapport à SA
   * PROPRE HISTOIRE. Quatre rangées sur 16 946, trois ISIN.
   */
  const seance = (outstandings: { isin: string; units: number }[]): BocParsed =>
    ({ sessionDate: "2026-04-15", bulletinNo: 1, equities: [], bonds: [], funds: [], capitalisation: [], outstandings, warnings: [], notes: [] }) as unknown as BocParsed;

  it("ATTRAPE LA RANGÉE QUI A PRIS LES TITRES DE SA VOISINE", () => {
    const { avertissements } = validate(
      seance([{ isin: "CM0000020628", units: 3_208_600 }, { isin: "CG0000020584", units: 3_208_600 }]),
      [], [], [], 0,
      [{ isin: "CM0000020628", units: 612_955 }, { isin: "CG0000020584", units: 3_208_600 }],
    );
    const dit = avertissements.find((a) => a.startsWith("Encours : rangée décalée"));
    expect(dit).toContain("CM0000020628");
    expect(dit).toContain("CG0000020584");
    /* La même mise en forme que le message : toLocaleString pose une fine
       insécable, invisible à l œil et différente d une espace ordinaire. */
    expect(dit).toContain((612_955).toLocaleString("fr-FR"));
  });

  it("N'ACCUSE PAS UN ABONDEMENT", () => {
    /* LA SECONDE CONDITION EST TOUT LE GARDE. Un abondement fait monter les
       titres, ce qui est légitime et fréquent ; un décalage RECOPIE ceux
       d'une voisine. Sans cette distinction, chaque tap serait dénoncé. */
    const { avertissements } = validate(
      seance([{ isin: "A", units: 900_000 }, { isin: "B", units: 500_000 }]),
      [], [], [], 0,
      [{ isin: "A", units: 600_000 }, { isin: "B", units: 500_000 }],
    );
    expect(avertissements.some((a) => a.startsWith("Encours : rangée décalée"))).toBe(false);
  });

  it("SE TAIT QUAND RIEN NE BOUGE", () => {
    const { avertissements } = validate(
      seance([{ isin: "A", units: 500_000 }, { isin: "B", units: 500_000 }]),
      [], [], [], 0,
      [{ isin: "A", units: 500_000 }, { isin: "B", units: 500_000 }],
    );
    expect(avertissements.some((a) => a.startsWith("Encours : rangée décalée"))).toBe(false);
  });

  it("LA REMARQUE TROUVE SA FAMILLE", () => {
    expect(classer("Encours : rangée décalée, CM0000020628 porte les 3 208 600 titres de CG0000020584 au lieu de ses 612 955.")).toBe("AB");
  });
});
