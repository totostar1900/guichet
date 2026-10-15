import { describe, expect, it } from "vitest";
import { champDeLIntitule, dateDeLIntitule, emissionsDuBulletin, encoursDuBulletin, instrumentDeLIsin, montant, numeroDuBulletin, paysDeLIntitule } from "@/lib/market/bulletin-trimestriel";
import type { Rangee } from "@/lib/market/boc-geometrie";

/**
 * LE BULLETIN TRIMESTRIEL DE LA CEMAC.
 *
 * Les rangées ci-dessous sont recopiées des vrais bulletins, avec leurs
 * abscisses : le tableau 6 du numéro 18 pour le Cameroun, le tableau 7 du
 * même numéro pour la Centrafrique dont le sous-total ment, et le tableau 8
 * du numéro 16 que la BEAC publie incomplet.
 */

let y = 800;
const r = (page: number, cellules: [number, number, string][]): Rangee => ({
  page,
  y: (y -= 16),
  cellules: cellules.map(([x, bord, texte]) => ({ x, largeur: bord - x, texte })),
});
const titre = (page: number, t: string): Rangee => r(page, [[67, 520, t]]);
const sommaire = (page: number, t: string, p: string): Rangee =>
  r(page, [
    [67, 388, t],
    [388, 458, ". . . . . . . . . . . ."],
    [461, 471, p],
  ]);
const ligne = (page: number, pays: string, isin: string, emis: string, ech: string, tenor: string, titres: string, faciale: string, encours: string): Rangee =>
  r(page, [
    [39, 81, pays],
    [91, 157, isin],
    [212, 258, emis],
    [268, 314, ech],
    [335, 357, tenor],
    [377, 415, titres],
    [434, 461, faciale],
    [488, 551, encours],
  ]);

describe("ce que l'intitulé d'un tableau dit", () => {
  it("rend le pays et la date d'arrêté", () => {
    expect(paysDeLIntitule("Tableau 6 : Situation de l’encours des valeurs du Trésor du Cameroun au 30 juin 2022")).toBe("Cameroun");
    expect(dateDeLIntitule("Tableau 6 : Situation de l’encours des valeurs du Trésor du Cameroun au 30 juin 2022")).toBe("2022-06-30");
  });

  it("LA DATE D'ARRÊTÉ EST CELLE DU TABLEAU, PAS CELLE DU BULLETIN", () => {
    /* Le numéro 9 est daté de mars 2020 et son tableau 12 s'arrête au
       31 décembre 2019 : la BEAC publie ce qu'elle a. */
    expect(dateDeLIntitule("Tableau 12: Situation des encours des valeurs du Trésor de la Guinée Equatoriale au 31 décembre 2019")).toBe("2019-12-31");
  });

  it("reconnaît la Centrafrique, que « centrafric » ne contient pas", () => {
    expect(paysDeLIntitule("Situation de l’encours des valeurs du Trésor de la République Centrafricaine")).toBe("RCA");
  });

  it("lit le numéro du bulletin", () => {
    expect(numeroDuBulletin("Bulletin trimestriel du marché des titres publics de la CEMAC : n°18 - juin 2022")).toBe(18);
  });

  it("lit un montant à séparateurs d'espace, et rien d'autre", () => {
    expect(montant("20 000 000 000")).toBe(20000000000);
    expect(montant("1 000 000")).toBe(1000000);
    expect(montant("52 semaines")).toBeUndefined();
    expect(montant("CM1300000559")).toBeUndefined();
  });
});

describe("l'instrument, qui se lit dans le code", () => {
  it("prend le caractère qui suit les deux lettres du pays", () => {
    expect(instrumentDeLIsin("CM1300000443")).toBe("BTA");
    expect(instrumentDeLIsin("CM2J00000014")).toBe("OTA");
    expect(instrumentDeLIsin("CF2B00000016")).toBe("OTA");
    expect(instrumentDeLIsin("GA11000001351")).toBe("BTA");
  });
});

describe("le registre de l'encours", () => {
  it("lit une ligne entière et vérifie l'identité du document", () => {
    y = 800;
    const rangees: Rangee[] = [
      titre(33, "Tableau 6 : Situation de l’encours des valeurs du Trésor du Cameroun au 30 juin 2022"),
      ligne(33, "Cameroun", "CM1300000559", "30/07/2021", "29/07/2022", "52 semaines", "20 000", "1 000 000", "20 000 000 000"),
      ligne(33, "Cameroun", "CM2B00000020", "14/06/2019", "14/06/2024", "5 ans", "7 200 310", "10 000", "72 003 100 000"),
      r(33, [
        [136, 370, "Total de l' encours des valeurs du Trésor du Cameroun"],
        [478, 551, "92 003 100 000"],
      ]),
    ];
    const e = encoursDuBulletin(rangees, 18);
    expect(e.lignes).toHaveLength(2);
    expect(e.lignes[0]).toMatchObject({ pays: "Cameroun", isin: "CM1300000559", instrument: "BTA", emisLe: "2021-07-30", echeanceLe: "2022-07-29", tenor: "52 semaines", titres: 20000, faciale: 1000000, encours: 20000000000, arrete: "2022-06-30" });
    expect(e.lignes[1].instrument).toBe("OTA");
    expect(e.totaux).toEqual([{ pays: "Cameroun", montant: 92003100000, arrete: "2022-06-30" }]);
    expect(e.reserves).toEqual([]);
  });

  it("DIT QUAND LE TOTAL IMPRIMÉ NE TOMBE PAS", () => {
    y = 800;
    const rangees: Rangee[] = [
      titre(33, "Tableau 6 : Situation de l’encours des valeurs du Trésor du Cameroun au 30 juin 2022"),
      ligne(33, "Cameroun", "CM1300000559", "30/07/2021", "29/07/2022", "52 semaines", "20 000", "1 000 000", "20 000 000 000"),
      r(33, [
        [136, 370, "Total de l' encours des valeurs du Trésor du Cameroun"],
        [478, 551, "92 003 100 000"],
      ]),
    ];
    expect(encoursDuBulletin(rangees, 18).reserves.join(" ")).toContain("total imprimé 92.0 Mds contre 20.0 Mds lus");
  });

  it("N'EMPRUNTE PAS L'ÉTIQUETTE D'UN SOUS-TOTAL QUI SE TROMPE", () => {
    /* Le tableau 7 du numéro 18 intitule « Sous - total BTA République
       Centrafricaine » un bloc de neuf lignes qui sont toutes des OTA. */
    y = 800;
    const rangees: Rangee[] = [
      titre(34, "Tableau 7 : Situation de l’encours des valeurs du Trésor de la République Centrafricaine"),
      r(34, [[259, 337, "au 30 juin 2022"]]),
      ligne(34, "RCA", "CF2B00000016", "04/12/2020", "04/12/2025", "5 ans", "241 055", "10 000", "2 410 550 000"),
      r(34, [
        [178, 341, "Sous - total BTA République Centrafricaine"],
        [494, 549, "2 410 550 000"],
      ]),
      r(34, [
        [122, 396, "Total de l'encours des valeurs du Trésor de la République Centrafricaine"],
        [494, 549, "2 410 550 000"],
      ]),
    ];
    const e = encoursDuBulletin(rangees, 18);
    expect(e.lignes[0].instrument).toBe("OTA");
    expect(e.lignes[0].arrete).toBe("2022-06-30");
    expect(e.reserves.join(" ")).toContain("sous-total BTA RCA");
  });

  it("DIT QU'UN TABLEAU EST PUBLIÉ INCOMPLET plutôt que de le compléter", () => {
    /* Le tableau 8 du numéro 16 s'arrête après le bloc BTA du Congo : pas de
       bloc OTA, pas de total, et le tableau 9 suit. L'encours congolais y
       tombe à 206 milliards entre 985 et 1 250. */
    y = 800;
    const rangees: Rangee[] = [
      titre(23, "Tableau 8 : Situation de l’encours des valeurs du Trésor du congo"),
      r(23, [[238, 339, "au 31 décembre 2021"]]),
      ligne(23, "Congo", "CG1200000491", "09/07/2021", "07/01/2022", "26 semaines", "14 700", "1 000 000", "14 700 000 000"),
      r(23, [
        [215, 301, "Sous -total BTA du Congo"],
        [482, 534, "14 700 000 000"],
      ]),
      titre(24, "Tableau 9 : Situation de l’encours des valeurs du Trésor du Gabon au 31 décembre 2021"),
      ligne(24, "Gabon", "GA1300000443", "02/04/2021", "01/04/2022", "52 semaines", "12 400", "1 000 000", "12 400 000 000"),
    ];
    const e = encoursDuBulletin(rangees, 16);
    expect(e.lignes.filter((l) => l.pays === "Congo")).toHaveLength(1);
    expect(e.reserves.join(" ")).toContain("Congo au 2021-12-31 : ni total imprimé ni ligne OTA");
  });

  it("NE PREND PAS LE SOMMAIRE POUR DES TABLEAUX", () => {
    /* Le sommaire répète mot pour mot l'intitulé de chaque tableau. Sans
       cette distinction, deux bulletins sur seize rendaient trente lignes au
       lieu de huit cents. */
    y = 800;
    const rangees: Rangee[] = [
      sommaire(5, "Tableau 6 : Situation de l’encours des valeurs du Trésor du Cameroun au 30 juin 2022", "33"),
      sommaire(5, "Tableau 7 : Situation de l’encours des valeurs du Trésor du Congo au 30 juin 2022", "34"),
      titre(33, "Tableau 6 : Situation de l’encours des valeurs du Trésor du Cameroun au 30 juin 2022"),
      ligne(33, "Cameroun", "CM1300000559", "30/07/2021", "29/07/2022", "52 semaines", "20 000", "1 000 000", "20 000 000 000"),
    ];
    const e = encoursDuBulletin(rangees, 18);
    expect(e.lignes).toHaveLength(1);
    expect(e.lignes[0].pays).toBe("Cameroun");
  });

  it("LIT UN CODE DE TREIZE SIGNES ET UN CODE À SUFFIXE", () => {
    /* « CG12000000434 » en fait treize et « GA1200001210/NM1 » porte un
       suffixe de marché : exiger douze signes exactement faisait manquer
       279 milliards au total du Congo. */
    y = 800;
    const rangees: Rangee[] = [
      titre(28, "Tableau 9 : Situation des encours des valeurs du Trésor du Congo au 30 juin 2021"),
      ligne(28, "Congo", "CG12000000434", "12/03/2021", "10/09/2021", "26 semaines", "8 000", "1 000 000", "8 000 000 000"),
      ligne(28, "Gabon", "GA1200001210/NM1", "02/04/2021", "17/09/2021", "26 semaines", "6 000", "1 000 000", "6 000 000 000"),
    ];
    expect(encoursDuBulletin(rangees, 14).lignes).toHaveLength(2);
  });

  it("dit quand le nombre de titres ne fait pas l'encours", () => {
    /* La BEAC imprime « 5 505 × 1 000 000 = 6 642 000 000 » : c'est son
       chiffre, et on ne le corrige pas, on le signale. */
    y = 800;
    const rangees: Rangee[] = [
      titre(28, "Tableau 9 : Situation des encours des valeurs du Trésor du Congo au 30 juin 2021"),
      ligne(28, "Congo", "CG1300000094", "03/02/2021", "04/02/2022", "52 semaines", "5 505", "1 000 000", "6 642 000 000"),
    ];
    const e = encoursDuBulletin(rangees, 14);
    expect(e.lignes[0].encours).toBe(6642000000);
    expect(e.reserves.join(" ")).toContain("1 ligne(s) où le nombre de titres multiplié par la valeur faciale ne fait pas l'encours");
  });
});

/**
 * LE TABLEAU DES ÉMISSIONS, QUI EST TRANSPOSÉ.
 *
 * Chaque adjudication y est une colonne et chaque attribut une rangée. Les
 * intitulés arrivent coupés par la mise en page, et c'est par leurs mots
 * qu'on les reconnaît, jamais par leur phrase.
 */
describe("l'intitulé d'une rangée du tableau des émissions", () => {
  it("RECONNAÎT UN MOT COUPÉ EN DEUX", () => {
    /* « remboursement » arrive en « rem boursement », « adjudication » en
       « adju dication », « implantés » en « im plantés ». */
    expect(champDeLIntitule("Date de rem boursement")).toBe("echeanceLe");
    expect(champDeLIntitule("Date d'adju dication")).toBe("adjugeLe");
    expect(champDeLIntitule("Montants souscrits par les SVT im plantés dans le pays émetteur")).toBe("svtLocaux");
  });

  it("NE PREND PAS LE TAUX DE SOUSCRIPTION POUR LE MONTANT OFFERT", () => {
    /* Son intitulé entier est « Taux de Souscription (en % du montant mis en
       adjudication) » : il contient le nom de l'autre, et passe donc avant. */
    expect(champDeLIntitule("Taux de Sous cription (en % du montant mis en adjudi cation)")).toBe("couverture");
    expect(champDeLIntitule("Montant mis en adjudica tion (en millions de FCFA)")).toBe("offert");
  });

  it("distingue les deux rangées de montants souscrits", () => {
    expect(champDeLIntitule("Montants souscrits par les autres SVT du réseau du pays émetteur")).toBe("svtReseau");
    expect(champDeLIntitule("Montant levé (en millions de FCFA)")).toBe("leve");
    expect(champDeLIntitule("Taux Moyen Pondéré (en %)")).toBe("taux");
    expect(champDeLIntitule("Code émission")).toBe("isin");
    expect(champDeLIntitule("Maturité")).toBe("tenor");
    expect(champDeLIntitule("Pays")).toBe("pays");
  });

  it("ne nomme pas ce qu'il ne reconnaît pas", () => {
    expect(champDeLIntitule("Source : CRCT/BEAC")).toBeUndefined();
    expect(champDeLIntitule("")).toBeUndefined();
  });
});

describe("les émissions retenues, et celles qu'on écarte", () => {
  /* Deux colonnes au moins : une rangee a une seule valeur n est pas un
     tableau, et le lecteur ne la prend pas pour tel. */
  const deuxColonnes = (page: number, valeurs: [string, string, string][]): Rangee[] =>
    valeurs.map(([libelle, a, b]) =>
      r(page, [
        [60, 150, libelle],
        [172, 240, a],
        [260, 330, b],
      ]),
    );

  it("lit une colonne entière et convertit les millions en francs", () => {
    y = 800;
    const rangees: Rangee[] = [
      titre(22, "Tableau 1 : Émissions des BTA réalisées par les Trésors publics de la CEMAC au cours du deuxième trimestre 2022"),
      ...deuxColonnes(22, [
        ["Pays", "Cameroun", "Congo"],
        ["Code émission", "CM1200001152", "CG1200000632"],
        ["Maturité", "26 semaines", "26 semaines"],
        ["Date d'adju dication", "20/06/2022", "12/04/2022"],
        ["Montant levé (en millions de FCFA)", "10 000", "7 795"],
        ["Taux Moyen Pondéré (en %)", "2,54", "6,89"],
      ]),
    ];
    const e = emissionsDuBulletin(rangees, 18);
    expect(e.emissions).toHaveLength(2);
    expect(e.emissions[0]).toMatchObject({ pays: "Cameroun", isin: "CM1200001152", instrument: "BTA", tenor: "26 semaines", adjugeLe: "2022-06-20", leve: 10_000_000_000, taux: 2.54 });
  });

  it("ÉCARTE UNE COLONNE QUE LA GRILLE A MAL DÉCOUPÉE, et la compte", () => {
    /* Les six premiers bulletins impriment le même tableau à plat, une
       adjudication par rangée : forcés dans une grille de colonnes, ils
       rendent des codes tronqués et des taux à 9 720 %. On ne corrige pas,
       on écarte et on dit combien. */
    y = 800;
    const rangees: Rangee[] = [
      titre(22, "Tableau 1 : Émissions des BTA réalisées par les Trésors publics de la CEMAC"),
      ...deuxColonnes(22, [
        ["Pays", "Gabon", "Gabon"],
        ["Code émission", "GA1200001210", "GA1200001228"],
        ["Date d'adju dication", "20/06/2022", "21/06/2022"],
        ["Montant levé (en millions de FCFA)", "10 000", "10 000"],
        ["Taux Moyen Pondéré (en %)", "9 720", "8 410"],
      ]),
    ];
    const e = emissionsDuBulletin(rangees, 18);
    expect(e.emissions).toHaveLength(0);
    expect(e.reserves.join(" ")).toContain("2 colonne(s) sur 2 écartée(s)");
  });
});
