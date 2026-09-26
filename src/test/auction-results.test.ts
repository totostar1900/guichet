import { describe, expect, it } from "vitest";
import { coverageOf, headline, millions, referenceLine, referenceRate, thin, type AuctionResult } from "@/lib/market/auction-results";

/**
 * Ce que la mémoire du marché primaire doit refuser de dire.
 *
 * Trois séances congolaises du 15 septembre 2026 servent de banc d'essai, parce
 * qu'elles portent la difficulté en clair : deux BTA sortis à des taux presque
 * identiques, 7,00 % et 6,97 %, dont le second a été fixé par une seule banque
 * sur 2,50 % de couverture. Un écran qui affiche les deux côte à côte sans dire
 * cela fait croire à une courbe là où il n'y a qu'une impression isolée.
 */
const seance = (over: Partial<AuctionResult>): AuctionResult => ({
  id: over.id ?? "r1",
  codeEmission: "CG1300001472",
  country: "Congo",
  instrument: "BTA",
  tenor: "52 semaines",
  sessionOn: "2026-09-15",
  abondement: false,
  sourceUrl: `https://beac.int/${over.id ?? "r1"}.pdf`,
  sourceTitle: "RESULTATS",
  confirmedBy: "Desk",
  confirmedAt: "2026-09-16T10:00:00Z",
  createdAt: "2026-09-16T10:00:00Z",
  updatedAt: "2026-09-16T10:00:00Z",
  ...over,
});

// Congo, 15 septembre 2026 : cinq soumissionnaires, 53,40 % de couverture, 7,00 %.
const bta26 = seance({ id: "bta26", tenor: "26 semaines", rateLimit: 7, rateAvg: 7, bidders: 5, coverage: 53.4, announced: millions(15_000) });
// Le même jour, la séance mince : un seul soumissionnaire, 2,50 % de couverture.
const bta52mince = seance({ id: "bta52mince", rateLimit: 6.97, rateAvg: 6.97, bidders: 1, coverage: 2.5, announced: millions(10_000) });
// Trois mois plus tôt, une séance pleine sur la même durée.
const bta52plein = seance({ id: "bta52plein", sessionOn: "2026-06-16", rateLimit: 6.8, rateAvg: 6.75, bidders: 8, coverage: 145, announced: millions(10_000) });

describe("le chiffre d'une séance", () => {
  it("est un taux pour un bon, un prix pour une obligation", () => {
    expect(headline(bta26)).toEqual({ value: 7, unit: "taux" });
    const ota = seance({ id: "ota", instrument: "OTA", tenor: "3 ans", priceAvg: 90, priceLimit: 90 });
    expect(headline(ota)).toEqual({ value: 90, unit: "prix" });
  });

  it("préfère la moyenne pondérée au limite, qui ne dit que le pire servi", () => {
    expect(headline(seance({ rateAvg: 6.5, rateLimit: 7 }))?.value).toBe(6.5);
  });

  it("n'invente rien quand le communiqué n'a pas encore été lu", () => {
    expect(headline(seance({ rateAvg: undefined, rateLimit: undefined }))).toBeUndefined();
  });
});

describe("les montants", () => {
  it("passent des millions imprimés aux francs stockés", () => {
    expect(millions(15_000)).toBe(15_000_000_000);
  });

  it("donnent une couverture quand le Trésor ne la publie pas", () => {
    const sansTaux = seance({ coverage: undefined, announced: millions(10_000), bid: millions(14_500) });
    expect(coverageOf(sansTaux)).toBeCloseTo(145, 6);
  });

  it("laissent le chiffre du Trésor l'emporter sur le calcul", () => {
    // Le Trésor publie 53,40 % ; les montants en donneraient un autre.
    expect(coverageOf(seance({ coverage: 53.4, announced: millions(15_000), bid: millions(9_000) }))).toBe(53.4);
  });
});

describe("une séance mince", () => {
  it("se reconnaît à son unique soumissionnaire", () => {
    expect(thin(bta52mince)).toBe(true);
  });

  it("se reconnaît aussi à une couverture qui n'atteint pas le montant annoncé", () => {
    expect(thin(bta26)).toBe(true); // 53,40 %
    expect(thin(bta52plein)).toBe(false); // 145 %, huit soumissionnaires
  });
});

describe("le taux de référence proposé au desk", () => {
  const cible = { country: "Congo" as const, instrument: "BTA" as const, tenor: "52 semaines", on: "2026-09-28" };

  it("passe la séance mince et retient la séance représentative, même plus ancienne", () => {
    const ref = referenceRate(cible, [bta52mince, bta52plein]);
    expect(ref?.from.id).toBe("bta52plein");
    expect(ref?.proposed).toBe(6.75);
    expect(ref?.thin).toBe(false);
    // La séance mince n'est pas cachée, elle est reléguée : le desk la voit.
    expect(ref?.also.map((r) => r.id)).toContain("bta52mince");
  });

  it("retient la séance mince quand il n'y a rien d'autre, et le dit", () => {
    const ref = referenceRate(cible, [bta52mince]);
    expect(ref?.proposed).toBe(6.97);
    expect(ref?.thin).toBe(true);
    expect(referenceLine(ref!)).toContain("séance mince");
    expect(referenceLine(ref!)).toContain("1 soumissionnaire");
  });

  it("ne mélange pas deux durées : un 26 semaines ne fait pas référence pour un 52", () => {
    expect(referenceRate(cible, [bta26])).toBeUndefined();
  });

  it("ne mélange pas deux signatures souveraines quand le pays a son historique", () => {
    const gabon = seance({ id: "gabon", country: "Gabon", sessionOn: "2026-09-22", rateAvg: 5.5, bidders: 9, coverage: 200 });
    const ref = referenceRate(cible, [gabon, bta52plein]);
    expect(ref?.from.country).toBe("Congo");
    expect(ref?.sameCountry).toBe(true);
  });

  it("sort du pays en dernier recours, et le signale", () => {
    const gabon = seance({ id: "gabon", country: "Gabon", sessionOn: "2026-09-22", rateAvg: 5.5, bidders: 9, coverage: 200 });
    const ref = referenceRate(cible, [gabon]);
    expect(ref?.proposed).toBe(5.5);
    expect(ref?.sameCountry).toBe(false);
    expect(referenceLine(ref!)).toContain("Gabon");
  });

  it("ignore une lecture que personne n'a relue", () => {
    const brute = seance({ id: "brute", confirmedBy: undefined, confirmedAt: undefined, rateAvg: 12, bidders: 9, coverage: 300 });
    expect(referenceRate(cible, [brute])).toBeUndefined();
    expect(referenceRate(cible, [brute, bta52plein])?.from.id).toBe("bta52plein");
  });

  it("ne regarde pas l'avenir, et oublie ce qui est trop vieux", () => {
    const apres = seance({ id: "apres", sessionOn: "2026-10-06", rateAvg: 6, bidders: 9, coverage: 200 });
    expect(referenceRate(cible, [apres])).toBeUndefined();
    const vieux = seance({ id: "vieux", sessionOn: "2025-09-15", rateAvg: 4, bidders: 9, coverage: 200 });
    expect(referenceRate(cible, [vieux])).toBeUndefined();
    expect(referenceRate(cible, [vieux], 400)?.from.id).toBe("vieux");
  });

  it("rend le plus récent d'abord dans la liste de contexte", () => {
    const juillet = seance({ id: "juillet", sessionOn: "2026-07-14", rateAvg: 6.9, bidders: 6, coverage: 130 });
    const ref = referenceRate(cible, [bta52plein, juillet, bta52mince]);
    expect(ref?.from.id).toBe("juillet");
    expect(ref?.also.map((r) => r.id)).toEqual(["bta52mince", "bta52plein"]);
  });
});
