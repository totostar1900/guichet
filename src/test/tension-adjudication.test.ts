import { describe, expect, it } from "vitest";
import type { AuctionResult } from "@/lib/market/auction-results";
import { ecartMarginal, etendue, primeDeNouvelleEmission, rendementAu } from "@/lib/market/tension-adjudication";

/**
 * LA TENSION D'UNE SÉANCE : trois mesures, et un seul piège, le SIGNE.
 *
 * Un bon imprime des taux, une obligation des prix, et les deux vont en sens
 * contraire. La moitié de ces tests ne vérifie que cela : qu'un écart calculé
 * sur une obligation ne change pas de signe par rapport au même écart calculé
 * sur un bon.
 */
const bon = (p: Partial<AuctionResult> = {}): AuctionResult =>
  ({
    id: "x",
    country: "Cameroun",
    instrument: "BTA",
    tenor: "26 semaines",
    sessionOn: "2020-03-18",
    abondement: false,
    sourceUrl: "https://x",
    sourceTitle: "x",
    createdAt: "",
    updatedAt: "",
    ...p,
  }) as AuctionResult;

const obligation = (p: Partial<AuctionResult> = {}): AuctionResult =>
  bon({ instrument: "OTA", tenor: "5 ans", couponRate: 6, ...p });

describe("le rendement à un point de l'enchère", () => {
  it("prend le rendement IMPRIMÉ pour le point moyen, et pour lui seul", () => {
    /* Le communiqué camerounais du 18 mars 2020 imprime son rendement moyen
       pondéré. Il n'imprime pas celui de sa soumission marginale, et le
       servir là serait une confusion de champs, celle qui a coûté une
       correction le 16 octobre 2026. */
    const r = bon({ rateAvg: 3.41, rateLimit: 3.6, yieldAvg: 3.52 });
    expect(rendementAu(r, "moyen")?.pct).toBe(3.52);
    expect(rendementAu(r, "limite")?.origin).not.toBe("imprimé");
  });

  it("NE SE RABAT PAS sur un autre point quand celui demandé manque", () => {
    /* `auctionYield` se rabat sur le taux limite faute de moyen, et `priceOf`
       sur les bornes. Laisser faire rendrait un écart marginal de zéro sur
       une séance dont on ignore la moyenne, en annonçant une enchère sans
       tension. */
    const r = bon({ rateLimit: 3.6 });
    expect(rendementAu(r, "moyen")).toBeUndefined();
    expect(rendementAu(r, "limite")).toBeDefined();
  });
});

describe("l'écart marginal", () => {
  it("est positif sur un bon, le marginal étant le dernier servi", () => {
    const r = bon({ rateAvg: 3.41, rateLimit: 3.6 });
    expect(ecartMarginal(r)).toBeGreaterThan(0);
  });

  it("est positif AUSSI sur une obligation, dont le prix limite est le plus bas", () => {
    /* C'est tout l'enjeu du passage par le rendement : en prix, le limite est
       INFÉRIEUR au moyen, et une soustraction naïve donnerait un négatif qui
       se lirait comme une enchère détendue. */
    const r = obligation({ priceAvg: 99, priceLimit: 98 });
    expect(ecartMarginal(r)).toBeGreaterThan(0);
  });

  it("vaut zéro quand tout a été servi au même prix", () => {
    expect(ecartMarginal(bon({ rateAvg: 3.5, rateLimit: 3.5 }))).toBe(0);
    expect(ecartMarginal(obligation({ priceAvg: 99, priceLimit: 99 }))).toBe(0);
  });
});

describe("l'étendue des taux proposés", () => {
  it("va du moins cher au plus cher POUR LE TRÉSOR, sur un bon", () => {
    const r = bon({ rateMin: 3, rateMax: 4 });
    expect(etendue(r)).toBeGreaterThan(0);
  });

  it("et le prix le plus HAUT est le moins cher, sur une obligation", () => {
    const r = obligation({ priceMin: 95, priceMax: 99 });
    expect(etendue(r)).toBeGreaterThan(0);
  });
});

describe("la prime de nouvelle émission", () => {
  const ancienne = bon({ sessionOn: "2020-03-04", codeEmission: "CM1200000873", rateAvg: 2.74 });

  it("se mesure contre la dernière séance comparable, et la nomme", () => {
    const neuve = bon({ sessionOn: "2020-03-18", codeEmission: "CM1300000484", rateAvg: 3.41 });
    const p = primeDeNouvelleEmission(neuve, [ancienne]);
    expect(p?.reference.codeEmission).toBe("CM1200000873");
    expect(p?.jours).toBe(14);
    expect(p?.pb).toBeGreaterThan(0);
  });

  it("reste vide pour un abondement, qui ne crée aucune ligne neuve", () => {
    const re = bon({ sessionOn: "2020-03-18", codeEmission: "CM1200000873", rateAvg: 3.41, abondement: true });
    expect(primeDeNouvelleEmission(re, [ancienne])).toBeUndefined();
  });

  it("ignore une séance d'un autre pays ou d'une autre durée", () => {
    const neuve = bon({ sessionOn: "2020-03-18", codeEmission: "CM1300000484", rateAvg: 3.41 });
    expect(primeDeNouvelleEmission(neuve, [bon({ ...ancienne, country: "Gabon" })])).toBeUndefined();
    expect(primeDeNouvelleEmission(neuve, [bon({ ...ancienne, tenor: "52 semaines" })])).toBeUndefined();
  });

  it("ne se compare pas à elle-même quand la ligne est rouverte sous le même code", () => {
    const neuve = bon({ sessionOn: "2020-03-18", codeEmission: "CM1200000873", rateAvg: 3.41 });
    expect(primeDeNouvelleEmission(neuve, [ancienne])).toBeUndefined();
  });
});

/**
 * LE CAS QUI A PRIS LA MESURE EN DÉFAUT, GARDÉ TEL QUEL.
 *
 * CM2C00000128, Cameroun, 14 septembre 2026 : prix moyen et prix limite
 * identiques à 95,000, donc écart marginal nul par construction. La première
 * version annonçait moins vingt points de base, parce qu'elle prenait le
 * rendement IMPRIMÉ pour la moyenne et le rendement CALCULÉ pour le marginal.
 * Deux mesures justes, une soustraction fausse.
 */
describe("un écart ne se calcule qu'entre deux chiffres de même origine", () => {
  const cm2c = bon({
    instrument: "OTA",
    tenor: "7 ans",
    sessionOn: "2026-09-14",
    maturityOn: "2033-09-16",
    priceAvg: 95,
    priceLimit: 95,
    couponRate: 7,
    yieldAvg: 8.14,
  });

  it("rend zéro quand le prix moyen et le prix limite sont le même nombre", () => {
    expect(ecartMarginal(cm2c)).toBe(0);
  });

  it("et laisse le rendement imprimé gagner quand on le LIT au lieu de le soustraire", () => {
    expect(rendementAu(cm2c, "moyen")?.pct).toBe(8.14);
    expect(rendementAu(cm2c, "moyen")?.origin).toBe("imprimé");
  });
});
