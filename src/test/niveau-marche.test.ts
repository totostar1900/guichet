import { describe, expect, it } from "vitest";
import type { AuctionResult } from "@/lib/market/auction-results";
import { anneesDeLEtiquette, estLigneNeuve, ligneDuNiveau, niveauDuMarche, panierDe } from "@/lib/market/niveau-marche";

/**
 * CE QUE LA MESURE DOIT REFUSER COMPTE AUTANT QUE CE QU'ELLE RETIENT.
 *
 * Un niveau de marché sert à tarifer : s'il accepte une séance qu'il n'aurait
 * pas dû, le chiffre faux ne se distingue plus d'un chiffre juste une fois posé
 * dans un champ. La moitié de ces cas sont donc des refus.
 */

const base = (p: Partial<AuctionResult>): AuctionResult =>
  ({
    id: p.id ?? Math.random().toString(36).slice(2),
    country: "Gabon",
    instrument: "OTA",
    tenor: "3 ans",
    sessionOn: "2026-06-10",
    maturityOn: "2029-06-12",
    abondement: false,
    couponRate: 6,
    priceLimit: 95,
    priceAvg: 95.5,
    priceMin: 92,
    priceMax: 97,
    confirmedBy: "Georges",
    sourceUrl: "https://exemple",
    sourceTitle: "communiqué",
    createdAt: "2026-06-11",
    updatedAt: "2026-06-11",
    ...p,
  }) as AuctionResult;

const cible = { country: "Gabon" as const, instrument: "OTA" as const, annees: 3, on: "2026-10-18" };

describe("les paniers et l'étiquette", () => {
  it("range par la vie restante", () => {
    expect(panierDe(0.25)).toBe("≤ 6 mois");
    expect(panierDe(1)).toBe("1 an");
    expect(panierDe(4.72)).toBe("4-5 ans");
    expect(panierDe(10)).toBe("7 ans +");
  });

  it("lit les semaines et les mois comme des fractions d'année", () => {
    expect(anneesDeLEtiquette("26 semaines")).toBeCloseTo(0.5, 2);
    expect(anneesDeLEtiquette("3 ans")).toBe(3);
    expect(anneesDeLEtiquette(undefined)).toBeUndefined();
  });

  it("reconnaît une ligne neuve, et un abondement qui porte la même étiquette", () => {
    expect(estLigneNeuve({ tenor: "3 ans", sessionOn: "2026-06-10", maturityOn: "2029-06-12" })).toBe(true);
    /* Même étiquette, mais il ne reste qu'un an et demi : c'est un abondement. */
    expect(estLigneNeuve({ tenor: "3 ans", sessionOn: "2026-06-10", maturityOn: "2028-01-11" })).toBe(false);
  });
});

describe("niveauDuMarche", () => {
  it("prend le moyen pondéré de la séance la plus récente, pas le milieu de la fourchette", () => {
    const n = niveauDuMarche(cible, [
      base({ id: "vieille", sessionOn: "2025-06-10", maturityOn: "2028-06-12", priceLimit: 90, priceAvg: 90.5 }),
      base({ id: "recente", sessionOn: "2026-06-10", maturityOn: "2029-06-12", priceLimit: 95, priceAvg: 95.5 }),
    ]);
    expect(n).toBeDefined();
    expect(n!.derniere.id).toBe("recente");
    expect(n!.point).toBeCloseTo(n!.derniere.auMoyen!, 6);
    /* Ce qu'on vérifie vraiment : le point N'EST PAS le milieu de la
       fourchette. La séance ancienne, servie à 90,5 contre 95,5, rend bien
       davantage, donc elle écarte le haut sans déplacer le point. */
    expect(n!.haut).toBeGreaterThan(n!.point + 1);
    expect(n!.point).not.toBeCloseTo((n!.bas + n!.haut) / 2, 2);
    expect(n!.seances).toHaveLength(2);
    expect(n!.uneSeule).toBe(false);
  });

  it("écarte un abondement même quand son étiquette correspond, et le compte", () => {
    const n = niveauDuMarche(cible, [
      base({ id: "neuve", sessionOn: "2026-06-10", maturityOn: "2029-06-12" }),
      base({ id: "abondee", sessionOn: "2026-07-10", maturityOn: "2029-06-12", tenor: "4 ans" }),
    ]);
    expect(n!.seances.map((s) => s.id)).toEqual(["neuve"]);
    expect(n!.ecartees.abondements).toBe(1);
  });

  it("ne sort pas du pays : rien plutôt qu'un chiffre d'ailleurs", () => {
    const n = niveauDuMarche(cible, [base({ country: "Cameroun", sessionOn: "2026-06-10" })]);
    expect(n).toBeUndefined();
  });

  it("ne mélange pas les instruments", () => {
    const n = niveauDuMarche(cible, [base({ instrument: "BTA", rateAvg: 7, rateLimit: 7.2 })]);
    expect(n).toBeUndefined();
  });

  it("refuse une séance postérieure à la cible : on ne tarife pas avec l'avenir", () => {
    const n = niveauDuMarche({ ...cible, on: "2026-01-01" }, [base({ sessionOn: "2026-06-10" })]);
    expect(n).toBeUndefined();
  });

  it("refuse une séance hors fenêtre, et la compte à part", () => {
    const n = niveauDuMarche(cible, [
      base({ id: "dedans", sessionOn: "2026-06-10", maturityOn: "2029-06-12" }),
      base({ id: "dehors", sessionOn: "2022-06-10", maturityOn: "2025-06-12" }),
    ]);
    expect(n!.seances.map((s) => s.id)).toEqual(["dedans"]);
    expect(n!.ecartees.horsFenetre).toBe(1);
  });

  it("exige une séance relue par défaut, et le compte quand elle ne l'est pas", () => {
    const sans = niveauDuMarche(cible, [base({ confirmedBy: undefined })]);
    expect(sans).toBeUndefined();
    const avec = niveauDuMarche(cible, [base({ confirmedBy: undefined })], { exigerRelues: false });
    expect(avec).toBeDefined();
  });

  it("écarte une séance mise de côté à la main", () => {
    expect(niveauDuMarche(cible, [base({ setAsideAt: "2026-07-01", setAsideReason: "doublon" })])).toBeUndefined();
  });

  it("dit qu'une seule séance ne mesure aucune dispersion", () => {
    const n = niveauDuMarche(cible, [base({})]);
    expect(n!.uneSeule).toBe(true);
    expect(ligneDuNiveau(n!)).toContain("une seule séance");
  });

  it("compte l'âge de la séance depuis la cible et non depuis aujourd'hui", () => {
    const n = niveauDuMarche({ ...cible, on: "2026-07-10" }, [base({ sessionOn: "2026-06-10" })]);
    expect(n!.ageJours).toBe(30);
  });

  it("range les deux bords du corps par leur VALEUR, l'ordre s'inversant entre prix et taux", () => {
    /* En prix, le limite est le plus bas servi donc le rendement le plus HAUT :
       le corps va donc du moyen au limite dans ce sens-là. La fonction ne doit
       pas présumer lequel est en haut. */
    const n = niveauDuMarche(cible, [base({ priceLimit: 95, priceAvg: 95.5 })]);
    expect(n!.bas).toBeLessThanOrEqual(n!.haut);
    expect(n!.derniere.auLimite).toBeGreaterThan(n!.derniere.auMoyen!);
  });
});
