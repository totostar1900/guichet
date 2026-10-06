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

  it("refuse plutôt que de couper au hasard quand rien ne s'accorde", () => {
    /* ALIOS FINANCE, 22 décembre 2023 : le bulletin imprime « 500,00 » là où
       le nominal de 5 000 et le cours de 100 % exigent 5 000,00. Aucune
       découpe ne peut sauver cette rangée, et l'inventer serait pire. */
    expect(lireValeurs(["100", "500,00", "5 000,000", "35,41", "0", "0", "0", "0", "0"], ["100", "100", "106,00", "94,00", "0,00%", "5 000,00"])).toBeUndefined();
  });

  it("refuse une découpe qui sort de la bande de six pour cent", () => {
    expect(lireValeurs(avant, ["95,00", "95,00", "120,00", "70,00", "0,00%", "9 500,00"])).toBeUndefined();
  });
});

describe("les obligations du bulletin 1914", () => {
  const carnet = new Carnet();
  const bonds = obligationsGeometriques(rangees, carnet);

  it("en lit dix, là où la lecture aplatie n'en lit aucune", () => {
    expect(bonds).toHaveLength(10);
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

  it("dit ce qu'elle refuse, au lieu de le taire", () => {
    /* La leçon des pannes muettes : la lecture aplatie perd onze obligations
       sur cette séance sans une seule remarque, et c'est ce silence qui a
       coûté le plus cher. Une rangée qui porte un ISIN et une date est une
       ligne de cours : si elle ne se lit pas, elle se dit. */
    expect(carnet.notes).toHaveLength(1);
    expect(carnet.notes[0].message).toContain("CM0000020255");
    expect(carnet.notes[0].brut).toBeTruthy();
  });

  it("ne rend jamais deux fois le même ISIN", () => {
    expect(new Set(bonds.map((b) => b.isin)).size).toBe(bonds.length);
  });
});
