import { describe, expect, it } from "vitest";
import { comparer, verdict } from "@/lib/market/comparer";
import type { Quote } from "@/lib/domain/market";

/**
 * UNE LIGNE QUI REVIENT N'EST JAMAIS SORTIE DE LA COTE.
 *
 * C'est toute la valeur de ce comparateur, et elle tient dans une mesure :
 * sur les 805 couples de séances consécutives, relevée le 6 octobre 2026, on
 * compte 406 disparitions, dont 398 reviennent plus tard et 8 seulement sont
 * définitives. Quatre-vingt-dix-huit pour cent des « sorties de cote » sont
 * des défauts de lecture.
 *
 * Avant cela, le desk voyait « 17 obligations au lieu de 29 » et devait
 * deviner. Les huit vraies sorties, toutes des obligations arrivées à
 * échéance, se noyaient dans quatre cents fausses.
 */
const q = (isin: string, close: number, instrument: Quote["instrument"] = "obligation", mnemo = isin.slice(-4)): Quote =>
  ({ isin, mnemo, instrument, close, sessionDate: "2026-01-01" }) as Quote;

describe("l'écart entre deux cotes", () => {
  it("sépare ce qui part, ce qui arrive et ce qui bouge", () => {
    const avant = [q("CM0000020115", 100), q("CG0000020220", 98), q("CM0000010025", 45000, "action", "SOCAP")];
    const apres = [q("CG0000020220", 99), q("CM0000010025", 45000, "action", "SOCAP"), q("GA0000020248", 101)];
    const e = comparer(avant, apres);
    expect(e.partis.map((x) => x.isin)).toEqual(["CM0000020115"]);
    expect(e.arrivees.map((x) => x.isin)).toEqual(["GA0000020248"]);
    expect(e.bouges.map((x) => x.isin)).toEqual(["CG0000020220"]);
    expect(e.communes).toBe(2);
  });

  it("calcule la variation, et se tait quand le cours d'avant est nul", () => {
    /* Un cours à zéro est déjà un défaut (code K) : en tirer une variation
       infinie ajouterait un faux chiffre à un vrai problème. */
    const e = comparer([q("A0000000001", 0), q("B0000000002", 100)], [q("A0000000001", 50), q("B0000000002", 110)]);
    expect(e.bouges.find((x) => x.isin === "A0000000001")!.variation).toBeUndefined();
    expect(e.bouges.find((x) => x.isin === "B0000000002")!.variation).toBeCloseTo(10, 6);
  });

  it("range les actions avant les obligations, puis par mnémonique", () => {
    // Le desk lit d'abord les sept actions : elles portent l'indice.
    const e = comparer([], [q("C3", 1), q("A1", 1, "action", "SAF"), q("B2", 1, "action", "BANGE")]);
    expect(e.arrivees.map((x) => x.mnemo)).toEqual(["BANGE", "SAF", "C3"]);
  });

  it("ne bouge pas une ligne dont le cours est identique", () => {
    expect(comparer([q("A0000000001", 100)], [q("A0000000001", 100)]).bouges).toEqual([]);
  });
});

describe("le verdict, une fois les départs jugés", () => {
  const parti = (retour?: string) => ({ partis: [{ isin: "X", mnemo: "X", instrument: "obligation" as const, retour }], arrivees: [], bouges: [], communes: 10 });

  it("rien du tout quand la cote est stable", () => {
    expect(verdict({ partis: [], arrivees: [], bouges: [], communes: 38 })).toBe("rien");
  });

  it("une disparition qui revient est un défaut de lecture", () => {
    /* Le cas le plus fréquent : 398 des 406 disparitions de la série. Le
       nommer « sortie de cote » enverrait le desk vérifier un remboursement
       qui n'a pas eu lieu. */
    expect(verdict(parti("2026-07-16"))).toBe("lecture");
  });

  it("une disparition qui ne revient jamais est un événement de marché", () => {
    expect(verdict(parti(undefined))).toBe("marche");
  });

  it("et les deux à la fois se disent aussi", () => {
    const e = { ...parti("2026-07-16"), arrivees: [{ isin: "N", mnemo: "N", instrument: "obligation" as const, premiere: true }] };
    expect(verdict(e)).toBe("les-deux");
  });

  it("une première cotation seule reste un événement de marché", () => {
    expect(verdict({ partis: [], arrivees: [{ isin: "N", mnemo: "N", instrument: "obligation", premiere: true }], bouges: [], communes: 38 })).toBe("marche");
  });
});
