import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoc } from "@/lib/market/boc-parse";

/**
 * UNE CELLULE BLANCHE N'EST PAS UNE VALEUR ABSENTE.
 *
 * Le marché des actions de la séance du 2 octobre 2026, tel que le PDF le
 * rend. Dix cellules n'y portent que des espaces, et elles ne séparent rien :
 * le seuil haut et le seuil bas sont des colonnes VOISINES.
 *
 *   « 54 450 » · « ␣␣␣␣␣␣ » · « ␣ » · « 44 550 » · « ␣␣␣␣␣␣ » · « ␣ » · « 1,01% »
 *
 * Lues comme des colonnes, ces respirations poussaient le seuil bas dans la
 * case de la référence suivante, et le seuil bas tombait à zéro. Mesuré sur
 * la base : 164 lignes, SOCAP depuis le 20 janvier 2026 et encore le 5
 * octobre, REG sur l'hiver 2023 — précisément les deux valeurs que le
 * bulletin imprime avec décimales. Dans 164 cas sur 164 la référence valait
 * exactement le seuil bas, ce qui ne laisse aucun doute sur le décalage.
 *
 * RIEN NE L'AVAIT SIGNALÉ, et ces séances sont marquées « ok ». Ce sont les
 * contrôles de cohérence du comparateur qui l'ont trouvé, en demandant non
 * pas ce qui avait changé mais si ce qu'on lisait pouvait être vrai.
 *
 * Le fixture du 4 août, lui, ne porte aucune cellule blanche : c'est pour
 * cela que la suite ne voyait rien depuis des mois.
 */
const text = readFileSync(new URL("../lib/market/__fixtures__/BOC-20261002-actions.txt", import.meta.url), "utf8");
const boc = parseBoc(text);
const par = (m: string) => boc.equities.find((e) => e.mnemo === m)!;

describe("la cote du 2 octobre 2026, qui porte des cellules blanches", () => {
  it("porte bien des cellules blanches, sinon ce fixture ne garde rien", () => {
    const blanches = text.split(/\r?\n/).filter((l) => l !== "" && l.trim() === "");
    expect(blanches.length, "le fixture a perdu ses espaces : le défaut n'est plus reproduit").toBeGreaterThanOrEqual(8);
  });

  it("rend ses deux seuils à SOCAPALM, et sa référence", () => {
    const s = par("SOCAP");
    expect(s.previousClose).toBe(49500);
    expect(s.thresholdHigh).toBe(54450);
    expect(s.thresholdLow, "le seuil bas tombait à zéro").toBe(44550);
    expect(s.referenceNext, "la référence portait le seuil bas").toBe(50000);
    expect(s.close).toBe(50000);
  });

  it("et toutes les lignes tiennent leur bande de dix pour cent", () => {
    /* La règle qui a révélé le décalage : les seuils se calculent du cours
       précédent, ils ne se constatent pas. Un demi-franc de marge, parce que
       le bulletin arrondit à l'unité. */
    const hors = boc.equities
      .filter((e) => e.previousClose > 0)
      .filter((e) => Math.abs(e.thresholdHigh - e.previousClose * 1.1) > 0.51 || Math.abs(e.thresholdLow - e.previousClose * 0.9) > 0.51)
      .map((e) => `${e.mnemo} : ${e.thresholdHigh} / ${e.thresholdLow} pour un précédent de ${e.previousClose}`);
    expect(hors).toEqual([]);
  });

  it("sans rien déplacer chez les six autres", () => {
    expect(boc.equities).toHaveLength(7);
    expect(par("SEMC")).toMatchObject({ previousClose: 53000, thresholdHigh: 58300, thresholdLow: 47700, referenceNext: 53000 });
    expect(par("BANGE")).toMatchObject({ previousClose: 228085, thresholdHigh: 250894, thresholdLow: 205277 });
    expect(par("BHC")).toMatchObject({ previousClose: 89000, thresholdHigh: 97900, thresholdLow: 80100 });
  });
});
