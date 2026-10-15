import { describe, expect, it } from "vitest";
import { anneesDe, auTemps, graduations, repere, trimestreAuTemps, type Serie } from "@/lib/market/trace";

/**
 * LE REPÈRE SE TESTE, LE DESSIN NON.
 *
 * Un graphique faux n'a pas l'air faux : une courbe décalée d'un point a
 * exactement l'air d'une courbe. Ce qui décide de sa justesse est le repère,
 * et les trois cas ci-dessous ont chacun produit un écran trompeur avant
 * d'être corrigés.
 */
const serie = (ys: number[], x0 = 0): Serie => ({ couleur: "#000", pts: ys.map((y, i) => ({ x: x0 + i, y })) });

describe("les graduations", () => {
  it("TOMBENT SUR DES NOMBRES RONDS, pas sur le cinquième de l'étendue", () => {
    /* Sur un axe de 0 à 10 561 milliards, la division en cinq donnait
       « 2 112,2 » : illisible, donc inutile. */
    expect(graduations(0, 10561)).toEqual([0, 2000, 4000, 6000, 8000, 10000]);
    expect(graduations(0, 13.6)).toEqual([0, 2.5, 5, 7.5, 10, 12.5]);
    expect(graduations(0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("respecte un pas imposé, pour que deux planches voisines se comparent", () => {
    expect(graduations(0, 13.6, 2)).toEqual([0, 2, 4, 6, 8, 10, 12]);
  });

  it("traverse le zéro quand la série est négative", () => {
    expect(graduations(-3, 4, 1)).toEqual([-3, -2, -1, 0, 1, 2, 3, 4]);
  });

  it("rend une graduation plutôt que rien sur une étendue nulle", () => {
    expect(graduations(5, 5)).toEqual([5]);
  });
});

describe("le repère", () => {
  it("ne rend rien sans point : une planche vide doit se dire, pas se dessiner", () => {
    expect(repere([{ couleur: "#000", pts: [] }])).toBeUndefined();
  });

  it("LA MARGE DE GAUCHE SUIT L'ÉTIQUETTE LA PLUS LONGUE", () => {
    /* Une marge fixe coupe « 10 000 » ou gaspille la moitié de la largeur
       pour « 2 % ». */
    const court = repere([serie([0, 8])], { fy: (v) => `${v} %` })!;
    const long = repere([serie([0, 10000])], { fy: (v) => v.toLocaleString("fr-FR") })!;
    expect(long.marges.gauche).toBeGreaterThan(court.marges.gauche);
  });

  it("ACCROCHE AU BORD L'ÉTIQUETTE QUI DÉPASSERAIT, plutôt que de la laisser couper", () => {
    const r = repere([serie([1, 2, 3])], { tx: [{ x: 0, l: "2018" }, { x: 2, l: "2026" }], marge: 0 })!;
    expect(r.etiquettes[0].ancre).toBe("start");
    expect(r.etiquettes[r.etiquettes.length - 1].ancre).toBe("end");
    expect(r.etiquettes[0].x).toBe(r.marges.gauche);
  });

  it("SAUTE UNE ÉTIQUETTE SUR DEUX QUAND ELLES SE TOUCHENT", () => {
    /* Trente années sur mille unités de large : les laisser toutes donne une
       bouillie, et en retirer au hasard déplacerait le repère. */
    const tx = Array.from({ length: 30 }, (_, i) => ({ x: i, l: String(2000 + i) }));
    const r = repere([serie(Array.from({ length: 30 }, () => 1))], { tx })!;
    expect(r.etiquettes.length).toBeLessThan(tx.length);
    expect(r.etiquettes[0].l).toBe("2000");
  });

  it("garde toutes les étiquettes quand elles tiennent", () => {
    const tx = [{ x: 0, l: "2024" }, { x: 1, l: "2025" }, { x: 2, l: "2026" }];
    const r = repere([serie([1, 2, 3])], { tx })!;
    expect(r.etiquettes.map((e) => e.l)).toEqual(["2024", "2025", "2026"]);
  });

  it("pose la base d'une barre sur le zéro, et sur le bas du cadre sans négatif", () => {
    const positif = repere([serie([2, 5])], { y0: 0 })!;
    expect(positif.base).toBeCloseTo(positif.py(0), 6);
    const signe = repere([serie([-2, 5])])!;
    expect(signe.base).toBeCloseTo(signe.py(0), 6);
    expect(signe.graduations.some((g) => g.zero)).toBe(true);
  });

  it("étale une série d'un seul point plutôt que de diviser par zéro", () => {
    const r = repere([{ couleur: "#000", pts: [{ x: 2026, y: 7 }] }])!;
    expect(Number.isFinite(r.px(2026))).toBe(true);
    expect(Number.isFinite(r.py(7))).toBe(true);
  });
});

describe("le temps en abscisse", () => {
  it("place un mois à sa date, pas à son rang", () => {
    /* La BEAC rappelle juin et juillet de chaque année, pas les douze mois :
       les poser à intervalles égaux ferait croire à une croissance régulière. */
    expect(auTemps("2026-01")).toBe(2026);
    expect(auTemps("2026-07")).toBeCloseTo(2026.5, 6);
    expect(trimestreAuTemps("2026-T3")).toBeCloseTo(2026.5, 6);
  });

  it("rend une étiquette par année couverte, au milieu de l'année", () => {
    const s = [{ couleur: "#000", pts: [{ x: auTemps("2024-06"), y: 1 }, { x: auTemps("2026-07"), y: 2 }] }];
    expect(anneesDe(s)).toEqual([
      { x: 2024.5, l: "2024" },
      { x: 2026.5, l: "2026" },
    ]);
  });
});
