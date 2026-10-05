import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoc } from "./boc-parse";

/**
 * LA VIRGULE DE 2024, ET LES DEUX ACTIONS QU'ELLE A FAIT DISPARAÎTRE.
 *
 * Le bulletin imprime chaque action sur une ligne dense : le cours précédent,
 * la date, les volumes collés, le statut, les cours. Le lecteur la reconnaît
 * par un motif de montant SANS décimales (« 47 000 », « 207 250 »). Or en
 * 2024, SOCAPALM et LA REGIONALE étaient cotées AVEC deux décimales :
 *
 *   CM0000010025SOCAPSOCAPALM
 *   50 000,0031/05/202401 504000NC50 000,0050 000,0055 000,00…
 *
 * La virgule casse le motif dès le premier nombre, la ligne n'est pas
 * reconnue, et l'action sort de la séance sans que rien n'échoue : le bulletin
 * passe simplement en « partiel ». Mesuré le 5 octobre 2026 après la remontée
 * de l'historique : SOCAP n'est lue que sur 42 des 246 séances de 2024, REG
 * sur 168, et c'est la cause de 456 bulletins « partiels » sur 808.
 *
 * SOCAP EST LA PLUS ÉCHANGÉE DE LA COTE (131 séances avec transaction sur
 * treize mois, devant SAF et SCGRE) : c'est la ligne la plus vivante des sept
 * qui manquait.
 */
const text = readFileSync(new URL("./__fixtures__/BOC-20240603.txt", import.meta.url), "utf8");
const boc = parseBoc(text);

describe("BOC n° 2022 du 03/06/2024, les cours à deux décimales", () => {
  it("lit l'en-tête", () => {
    expect(boc.bulletinNo).toBe(2022);
    expect(boc.sessionDate).toBe("2024-06-03");
  });

  it("lit les six actions de l'époque, décimales comprises", () => {
    expect(boc.equities.map((e) => e.mnemo)).toEqual(["SEMC", "SAF", "SOCAP", "REG", "BANGE", "SCGRE"]);
    expect(boc.warnings.filter((w) => /ligne dense non reconnue/.test(w))).toEqual([]);
  });

  it("lit les cours de SOCAPALM, qui portent la virgule", () => {
    const socap = boc.equities.find((e) => e.mnemo === "SOCAP")!;
    expect(socap.previousClose).toBe(50000);
    expect(socap.previousDate).toBe("2024-05-31");
    expect(socap.close).toBe(50000);
    expect(socap.thresholdHigh).toBe(55000);
    expect(socap.thresholdLow).toBe(45000);
    expect(socap.variationPct).toBe(0);
  });

  it("lit aussi LA REGIONALE, dont seules les colonnes du milieu portent la virgule", () => {
    const reg = boc.equities.find((e) => e.mnemo === "REG")!;
    expect(reg.previousClose).toBe(42500);
    expect(reg.close).toBe(42500);
    expect(reg.thresholdHigh).toBe(46750);
    expect(reg.thresholdLow).toBe(38250);
  });

  it("ne confond pas la virgule des cours avec celle des pourcentages", () => {
    const bange = boc.equities.find((e) => e.mnemo === "BANGE")!;
    expect(bange.close).toBe(207250);
    expect(bange.variationPct).toBe(0);
    expect(bange.ytdVariationPct).toBeCloseTo(0.19, 2);
  });
});
