import { describe, expect, it } from "vitest";
import { colonnes, lireValeurs, obligationsGeometriques, rangeeSeparee, separer, type Cellule, type Rangee } from "./boc-geometrie";
import { Carnet } from "./boc-parse";
import empreinte from "./__fixtures__/boc-1914-obligations.json";

/**
 * LA LECTURE GÉOMÉTRIQUE DU BULLETIN.
 *
 * L'empreinte est réelle : les quarante-neuf rangées de la section des
 * obligations du BOC n° 1914 (22 décembre 2023), telles que pdf.js les rend,
 * avec l'abscisse et la largeur de chaque fragment. C'est la séance dont la
 * lecture aplatie perd les ONZE obligations sans dire un mot, et c'est donc
 * le bon étalon : ce que ce fichier lit ici, il l'a gagné.
 */
const rangees = empreinte as Rangee[];
const cel = (texte: string, x: number, largeur: number): Cellule => ({ texte, x, largeur });

describe("la grille", () => {
  it("s'apprend sur les bords droits des cellules chiffrées", () => {
    const grille = colonnes(rangees.filter((r) => r.page === 3));
    expect(grille.length).toBeGreaterThan(10);
    /* La colonne du statut et celle des seuils, vues sur le bulletin. */
    expect(grille.some((g) => Math.abs(g - 695) < 4)).toBe(true);
  });

  it("n'apprend pas des noms d'émetteurs, qui sont alignés à gauche", () => {
    /* « ETAT DU GABON » revient trois fois dans la section : son bord droit
       se répétait donc, et une fausse colonne à 219 points coupait ensuite
       « 2 475,00 » en « 2 » et « 475,00 ». Mesuré, puis corrigé. */
    const texte: Rangee[] = [1, 2, 3, 4, 5].map((i) => ({ page: 1, y: 100 - i * 10, cellules: [cel("ETAT DU GABON", 38, 73.7)] }));
    expect(colonnes(texte)).toEqual([]);
  });

  it("ignore un bord vu moins de quatre fois : ce n'est pas une colonne", () => {
    const une: Rangee[] = [{ page: 1, y: 100, cellules: [cel("42 500", 100, 20)] }];
    expect(colonnes(une)).toEqual([]);
  });
});

describe("séparer un fragment fusionné", () => {
  it("coupe un nombre collé à un statut sans rien mesurer", () => {
    /* La colonne Statut n'est JAMAIS imprimée seule dans ce bulletin : aucune
       grille ne peut l'enseigner, donc seule la grammaire peut trancher. Un
       séparateur de milliers ne précède jamais des lettres. */
    expect(separer(cel("0 NC", 599, 12), []).map((c) => c.texte)).toEqual(["0", "NC"]);
    expect(separer(cel("249 113", 487, 20), []).map((c) => c.texte)).toEqual(["249 113"]);
  });

  it("coupe sur un bord de colonne quand la grammaire ne suffit pas", () => {
    const c = cel("100 106,00", 653, 42);
    expect(separer(c, [667, 695]).map((x) => x.texte)).toEqual(["100", "106,00"]);
  });

  it("rend le fragment tel quel quand aucune colonne ne tombe dedans", () => {
    expect(separer(cel("9 500,00 10 000,000", 340, 80), [340, 420]).map((c) => c.texte)).toEqual(["9 500,00 10 000,000"]);
  });

  it("ne coupe pas un nombre en un morceau qui commencerait par des zéros", () => {
    /* LA RÉGRESSION QUE LE CORPUS A ATTRAPÉE, et qu'aucun test écrit à la
       main n'avait vue. Avec un bord de colonne tombant juste après « 10 »,
       « 10 000,000 » se coupait en « 10 » et « 000,000 » : les deux
       morceaux passaient pour des montants, la rangée paraissait ensuite
       entière, et le nominal restant d'une obligation tombait de dix mille
       à DIX. Mesuré sur les séances de novembre 2024, par la comparaison
       avec la lecture aplatie. Un nombre ne commence pas par des zéros. */
    expect(separer(cel("10 000,000", 300, 60), [312]).map((c) => c.texte)).toEqual(["10 000,000"]);
    /* Et la règle n'empêche pas une vraie découpe au même endroit. */
    expect(separer(cel("10 000,00 7 500", 300, 90), [354]).map((c) => c.texte)).toEqual(["10 000,00", "7 500"]);
  });

  it("ne coupe pas un titre, qui n'est pas une suite de valeurs", () => {
    const titre = cel("EOG 6,25% NET 2019-2024", 102, 90);
    expect(separer(titre, [120, 150, 170]).map((c) => c.texte)).toEqual(["EOG 6,25% NET 2019-2024"]);
  });

  it("rend une rangée entière cellule par cellule", () => {
    const r = rangees.find((x) => x.cellules.some((c) => c.texte === "GA0000020206"))!;
    const textes = rangeeSeparee(r, colonnes(rangees.filter((x) => x.page === r.page))).map((c) => c.texte);
    expect(textes).toContain("GA0000020206");
    expect(textes).toContain("NC");
    expect(textes).not.toContain("0 NC");
  });
});

describe("l'arithmétique de la ligne choisit la découpe", () => {
  const avant = ["95", "9 500,00 10 000,000", "479,85", "150", "0", "0", "0", "0"];
  const apres = ["95,00", "95,00", "100,70", "89,30", "0,00%", "9 500,00"];

  it("retient la découpe où le prix vaut le pourcentage du nominal", () => {
    const v = lireValeurs(avant, apres)!;
    expect(v).toBeDefined();
    expect(v.prix).toBe(9500);
    expect(v.nominal).toBe(10000);
    expect(v.pct).toBe(95);
  });

  it("prend telle quelle une rangée qu'il n'a pas eu à couper, même si l'identité la dément", () => {
    /* L'IDENTITÉ DÉPARTAGE UNE DÉCOUPE, ELLE N'AUTORISE PAS UNE LECTURE.
       Une ligne AMORTISSABLE la dément de plein droit : le 5 décembre 2024
       la BDEAC 5,6 % cote 100,00 % pour 10 000 francs et un nominal restant
       de 8 000, parce que le cours reste rapporté au nominal d'origine.
       L'exiger refusait vingt-et-une séances lues parfaitement. */
    const v = lireValeurs(["100,00", "10000", "8000", "2,45", "0", "50", "0", "0", "0"], ["100,00", "100,00", "106,00", "94,00", "0,00%", "10 000,00"])!;
    expect(v.prix).toBe(10000);
    expect(v.nominal).toBe(8000);
  });

  it("mais exige l'identité dès qu'il faut couper, sinon il refuse", () => {
    /* Ici la cellule « 9 500,00 10 000,000 » doit être coupée : rien d'autre
       que l'identité ne dit où, donc une découpe qui la dément est écartée
       et il ne reste aucune lecture. */
    expect(lireValeurs(["95", "9 500,00 12 000,00", "479,85", "150", "0", "0", "0", "0"], apres)).toBeUndefined();
  });

  it("exige l'identité dès qu'une cellule d'avant le statut sort d'une coupure", () => {
    /* Le 7 août 2024, un bord de colonne coupe « 2 500 » en « 2 » et
       « 500 » : deux montants valides, donc la rangée paraissait imprimée
       telle quelle et le nominal tombait de 2 500 à 500. La marque de
       coupure remonte jusqu'ici, et l'identité reprend alors son rôle. */
    const avantCoupe = ["100", "2", "500", "1,19", "0", "0", "0", "0", "0"];
    const apresOk = ["100", "100", "106,00", "94,00", "0,00%", "2 500,00"];
    expect(lireValeurs(avantCoupe, apresOk, true), "une valeur obtenue en coupant doit se justifier").toBeUndefined();
    expect(lireValeurs(avantCoupe, apresOk, false), "sans coupure, la même rangée se croit sur parole").toBeDefined();
  });

  it("refuse une découpe qui sort de la bande de six pour cent", () => {
    expect(lireValeurs(avant, ["95,00", "95,00", "120,00", "70,00", "0,00%", "9 500,00"])).toBeUndefined();
  });
});

describe("les obligations du bulletin 1914", () => {
  const carnet = new Carnet();
  const bonds = obligationsGeometriques(rangees, carnet);

  it("les lit toutes les onze, là où la lecture aplatie n'en lit aucune", () => {
    /* Onze obligations que la séance perdait entièrement, et SANS UNE SEULE
       REMARQUE côté lecture aplatie : c'est le silence qui coûtait le plus
       cher, plus encore que la perte. */
    expect(bonds).toHaveLength(11);
    expect(bonds.map((b) => b.isin)).toContain("CM0000020255");
  });

  it("et chacune porte ses valeurs, pas une découpe de hasard", () => {
    const congo = bonds.find((b) => b.isin === "CG0000020238")!;
    expect(congo).toMatchObject({
      mnemo: "ECG02",
      issuer: "ETAT DU CONGO",
      designation: "EOCG 6,25% NET 2021-2026",
      segment: "etats",
      previousDate: "2023-12-21",
      previousPct: 95,
      previousFcfa: 9500,
      nominalRemaining: 10000,
      accruedCoupon: 479.85,
      status: "NC",
      thresholdHigh: 100.7,
      thresholdLow: 89.3,
      referenceNextFcfa: 9500,
    });
  });

  it("et n'a rien à refuser sur cette séance", () => {
    /* Elle a d'abord refusé ALIOS, dont le bulletin imprime « 500,00 » là où
       le nominal de 5 000 et le cours de 100 % feraient 5 000,00. C'était
       une règle de trop : une ligne amortissable dément cette égalité de
       plein droit, et le lecteur rend ce qui est imprimé plutôt que ce qui
       devrait l'être. Le refus motivé se vérifie plus bas, sur une rangée
       vraiment tronquée. */
    expect(carnet.notes).toEqual([]);
  });

  it("ne rend jamais deux fois le même ISIN", () => {
    expect(new Set(bonds.map((b) => b.isin)).size).toBe(bonds.length);
  });
});

describe("le tampon que pdf.js détache", () => {
  it("reçoit une copie, sinon la deuxième lecture lit du vide en silence", async () => {
    /* PDF.JS PREND LA PROPRIÉTÉ DU TABLEAU qu'on lui passe. Le lecteur est
       appelé deux fois sur les mêmes octets : une fois pour comparer, une
       fois pour compléter. Sans copie, la seconde rendait zéro rangée sans
       lever, et un balayage de cent soixante-sept séances a annoncé zéro
       ligne rattrapée alors que le lecteur marchait. Rien dans le résultat
       ne distinguait « rien à rattraper » de « je n'ai rien lu ». */
    const src = (await import("node:fs")).readFileSync(new URL("./boc-geometrie.ts", import.meta.url), "utf8");
    expect(src, "getDocument doit recevoir une copie du tampon").toContain("data: new Uint8Array(bytes)");
  });
});

describe("la queue qui a débordé sur la rangée d'en dessous", () => {
  /* Le 2 mai 2024, la ligne BDEAC se termine par « 0,00% | 8 000,00 » posés
     2,6 points plus bas, donc sur une rangée à eux. Élargir la tolérance
     générale aurait été imprudent : les en-têtes de ce même bulletin ne sont
     séparés que de 4,4 points. Quinze séances en dépendaient. */
  const ligne = (y: number, textes: string[]): Rangee => ({
    page: 9,
    y,
    cellules: textes.map((t, i) => cel(t, 100 + i * 30, 20)),
  });
  const corps = ["BDEAC", "BDEAC 5,45% NET 2020 - 2027", "CG0000020220", "EBD01", "30/04/2024", "100", "8000", "8000", "152,48", "0", "795000", "0", "0", "0", "NC", "100", "100", "106,00", "94,00"];
  const titre = (): Rangee => ({ page: 9, y: 500, cellules: [cel("MARCHE DES OBLIGATIONS", 36, 90)] });

  it("rattache la queue et lit la ligne", () => {
    const b = obligationsGeometriques([titre(), ligne(135.4, corps), ligne(132.8, ["0,00%", "8 000,00"])]);
    expect(b).toHaveLength(1);
    expect(b[0].variationPct).toBe(0);
    expect(b[0].referenceNextFcfa).toBe(8000);
  });

  it("et sans elle, la ligne est refusée plutôt que complétée au jugé", () => {
    const carnet = new Carnet();
    expect(obligationsGeometriques([titre(), ligne(135.4, corps)], carnet)).toHaveLength(0);
    expect(carnet.notes[0].message).toContain("CG0000020220");
  });

  it("ne rattache pas une rangée trop basse : ce serait la ligne suivante", () => {
    const carnet = new Carnet();
    expect(obligationsGeometriques([titre(), ligne(135.4, corps), ligne(120, ["0,00%", "8 000,00"])], carnet)).toHaveLength(0);
  });
});
