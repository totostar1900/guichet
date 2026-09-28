import { describe, expect, it } from "vitest";
import type { AuctionResult } from "@/lib/market/auction-results";
import { anomalies, cribler } from "@/lib/market/anomalies";

/**
 * Ce que la table attrape et qu'un formulaire ne montre pas.
 *
 * Chacun de ces motifs vient d'une séance réelle de la reprise d'historique.
 * Aucun ne dit qu'un chiffre est faux : ils disent qu'il se contredit, et la
 * décision appartient à qui ouvrira le communiqué.
 */

const s = (over: Partial<AuctionResult>): AuctionResult => ({
  id: over.id ?? "x",
  country: "Gabon",
  instrument: "BTA",
  tenor: "26 semaines",
  sessionOn: "2026-07-22",
  abondement: false,
  sourceUrl: `https://beac.int/${over.id ?? "x"}.pdf`,
  sourceTitle: "RESULTATS",
  createdAt: "2026-09-27T10:00:00Z",
  updatedAt: "2026-09-27T10:00:00Z",
  ...over,
});

/**
 * Un signal qu on ne peut pas éteindre cesse d être lu.
 *
 * La plupart de ces contradictions appartiennent aux Trésors : le Gabon publie
 * un prix moyen au-dessus de son propre maximum, le Tchad un servi supérieur
 * aux soumissions. Quelqu un ouvre la pièce, constate, et doit pouvoir le noter,
 * sans quoi le panneau répète les mêmes lignes jusqu à devenir invisible.
 */
describe("le crible", () => {
  const faux = () => s({ id: "g", instrument: "OTA", tenor: "4 ans", priceMin: 88, priceMax: 91.5, priceAvg: 93.79 });

  it("range ce qui a été vérifié sur la pièce, et le compte", () => {
    const motif = anomalies([faux()])[0].quoi.key;
    const c = cribler([{ ...faux(), anomaliesVues: [motif] }]);
    expect(c.restent).toEqual([]);
    expect(c.vues).toBe(1);
  });

  it("signale quand même un motif que personne n a vu sur la même séance", () => {
    const deux = { ...faux(), sessionOn: "2025-01-01", anomaliesVues: ["chiffre retenu {v} hors de la fourchette publiée {lo}–{hi}"] };
    const c = cribler([deux]);
    expect(c.restent.map((x) => x.quoi.key)).toEqual(["séance datée du 1er janvier"]);
    expect(c.vues).toBe(1);
  });
});

describe("les anomalies", () => {
  it("voient un chiffre retenu hors de la fourchette publiée", () => {
    // Le Trésor gabonais publie un prix moyen au-dessus de son propre maximum.
    const a = anomalies([s({ id: "g", instrument: "OTA", tenor: "4 ans", priceMin: 88, priceMax: 91.5, priceLimit: 91.5, priceAvg: 93.7937 })]);
    expect(a).toHaveLength(1);
    expect(a[0].quoi.key).toContain("hors de la fourchette");
  });

  it("ne crient pas sur une fourchette respectée", () => {
    expect(anomalies([s({ instrument: "OTA", tenor: "4 ans", priceMin: 88, priceMax: 95, priceAvg: 91 })])).toEqual([]);
  });

  it("voient un bon servi à un prix", () => {
    expect(anomalies([s({ id: "b", priceAvg: 91 })])[0].quoi.key).toContain("bon servi à un prix");
  });

  it("voient un servi supérieur aux soumissions", () => {
    expect(anomalies([s({ id: "m", rateAvg: 6, bid: 1e9, served: 2e9 })])[0].quoi.key).toContain("supérieur aux soumissions");
  });

  /**
   * Le code du Trésor porte le préfixe ISO de son pays, et la colonne « pays »
   * de l index de la BEAC vient d ailleurs que le scan : les deux se
   * contrôlent l un l autre sans rien coûter.
   */
  it("voient un code dont le préfixe ne répond pas au pays", () => {
    const a = anomalies([s({ id: "p", country: "Tchad", codeEmission: "GA1200001699", rateAvg: 6 })]);
    expect(a[0].quoi.key).toContain("préfixe");
    expect(a[0].quoi.params).toMatchObject({ p: "GA", pays: "Tchad" });
  });

  it("laissent passer un code qui répond à son pays", () => {
    expect(anomalies([s({ country: "Gabon", codeEmission: "GA1200001699", rateAvg: 6 })])).toEqual([]);
  });

  /**
   * Le Tchad du 24 janvier 2024 porte un servi de 16 678 630 millions, soit
   * seize mille milliards : l unité a été lue de travers. Le chiffre est bien
   * un nombre dans la bonne colonne, et rien d autre ne l arrêtait.
   */
  it("voient un montant hors de toute échelle", () => {
    const a = anomalies([s({ id: "u", rateAvg: 6, served: 16_678_630e6 })]);
    expect(a[0].quoi.key).toContain("hors de toute échelle");
  });

  it("voient une séance du 1er janvier", () => {
    expect(anomalies([s({ id: "j", sessionOn: "2025-01-01", rateAvg: 6.5 })])[0].quoi.key).toContain("1er janvier");
  });

  it("voient plus de soumissionnaires que le réseau n'en compte", () => {
    const reseau = anomalies([s({ id: "r", rateAvg: 6, bidders: 25, networkSize: 21 })])[0];
    expect(reseau.quoi.key).toContain("réseau");
    expect(reseau.quoi.params).toMatchObject({ n: 25, m: 21 });
  });

  /**
   * Le 14 septembre 2026, les cinq lignes camerounaises portent le même
   * annoncé, le même soumis et le même servi. Cinq lignes réellement
   * identiques sont possibles ; un total de séance recopié sur chaque ligne
   * l'est bien davantage.
   */
  it("voient un montant répété sur toutes les lignes d'une séance", () => {
    const cinq = ["3 ans", "4 ans", "5 ans", "6 ans", "7 ans"].map((tenor, i) =>
      s({ id: `c${i}`, country: "Cameroun", instrument: "OTA", tenor, sessionOn: "2026-09-14", announced: 27_550_190_000, bid: 27_550_190_000, served: 27_550_190_000, priceAvg: 95 }),
    );
    const a = anomalies(cinq);
    expect(a).toHaveLength(1);
    expect(a[0].quoi.key).toContain("lignes portent le même");
    expect(a[0].quoi.params).toMatchObject({ n: 5 });
  });

  it("laissent tranquille une séance dont les lignes diffèrent", () => {
    const deux = [
      s({ id: "a", country: "Congo", instrument: "OTA", tenor: "3 ans", sessionOn: "2026-07-21", announced: 10e9, bid: 14e9, served: 6.5e9, priceAvg: 97 }),
      s({ id: "b", country: "Congo", instrument: "OTA", tenor: "4 ans", sessionOn: "2026-07-21", announced: 10e9, bid: 10e9, served: 10e9, priceAvg: 90.14 }),
      s({ id: "c", country: "Congo", instrument: "BTA", tenor: "26 semaines", sessionOn: "2026-07-21", announced: 26e9, bid: 25e9, served: 25e9, rateAvg: 7 }),
    ];
    expect(anomalies(deux)).toEqual([]);
  });

  /**
   * Une anomalie sur une séance confirmée est entrée dans les références du
   * desk ; une anomalie sur une séance en attente n'a encore rien contaminé.
   */
  it("mettent devant ce qui est déjà confirmé", () => {
    const a = anomalies([
      s({ id: "attente", sessionOn: "2026-08-01", priceAvg: 91 }),
      s({ id: "signee", sessionOn: "2020-01-01", priceAvg: 91, confirmedBy: "Desk" }),
    ]);
    expect(a[0].id).toBe("signee");
    expect(a[0].gravite).toBe("confirmee");
  });
});

describe("le rendement imprimé contre le prix imprimé", () => {
  /**
   * Trois nombres posés côte à côte sur la même pièce se déduisent l'un de
   * l'autre. Notre calcul retrouve le rendement camerounais à moins d'un point
   * de base sur dix des treize séances où il figure, et les avis d'annonce
   * congolais écrivent « Remboursement : In fine ». Un écart de cent points de
   * base ne vient donc pas de nous.
   */
  it("signale une séance dont les trois nombres ne se répondent pas", () => {
    const [a] = anomalies([
      s({ id: "x", country: "Cameroun", instrument: "OTA", tenor: "6 ans", sessionOn: "2021-06-16", maturityOn: "2027-06-17", priceAvg: 99.17, couponRate: 6, yieldAvg: 7.17 }),
    ]);
    expect(a.quoi.key).toContain("rendement imprimé");
    expect(a.quoi.params!.bp).toBeGreaterThan(90);
    expect(a.verifier).toContain("taux de rendement");
  });

  /**
   * La convention du Trésor n'est pas une contradiction de la pièce.
   *
   * Le Trésor camerounais actualise son rendement imprimé sur la durée
   * annoncée et non sur ce qu'il reste à courir : son 3 ans du 21 août 2019, à
   * deux ans et neuf mois du terme, donne 4,365 % sur trois ans pleins, et il
   * imprime 4,36 %. Sans cet essai, chacun de ses abondements serait signalé
   * pour rien, et un panneau qui crie sans motif cesse d'être lu.
   */
  it("se tait quand la durée annoncée explique le chiffre du Trésor", () => {
    expect(
      anomalies([
        s({ id: "cm19", country: "Cameroun", instrument: "OTA", tenor: "3 ans", sessionOn: "2019-08-21", maturityOn: "2022-05-24", priceAvgFcfa: 9899.45, couponRate: 4, yieldAvg: 4.36 }),
      ]),
    ).toHaveLength(0);
  });

  /**
   * Ce qu'aucune convention n'explique reste signalé.
   *
   * Le 16 juin 2021, la pièce imprime « Prix d'intérêt moyen pondéré 99,17 % »
   * et « Taux de rendement 7,17 % », là où ce prix et ce coupon en donnent
   * 6,17 sur six ans pleins comme sur la vie restante. Notre lecture est exacte,
   * vérifiée sur le scan : la contradiction appartient au Trésor.
   */
  it("signale ce que ni l'une ni l'autre convention n'explique", () => {
    const [a] = anomalies([
      s({ id: "cm21", country: "Cameroun", instrument: "OTA", tenor: "6 ans", sessionOn: "2021-06-16", maturityOn: "2027-06-18", priceAvg: 99.17, couponRate: 6, yieldAvg: 7.17 }),
    ]);
    expect(a.quoi.key).toContain("rendement imprimé");
    expect(a.quoi.params!.bp).toBeGreaterThan(90);
  });

  it("se tait sur un écart d'arrondi, qui n'apprend rien à personne", () => {
    // Cameroun, 14 septembre 2026, 4 ans : imprimé 7,68 %, calculé 7,68 %.
    expect(
      anomalies([
        s({ id: "y", country: "Cameroun", instrument: "OTA", tenor: "4 ans", sessionOn: "2026-09-14", maturityOn: "2030-09-16", priceAvg: 96, couponRate: 6.5, yieldAvg: 7.68 }),
      ]),
    ).toHaveLength(0);
  });

  it("ne dit rien quand le Trésor n'imprime pas de rendement", () => {
    expect(
      anomalies([
        s({ id: "z", country: "Congo", instrument: "OTA", tenor: "6 ans", sessionOn: "2026-09-15", maturityOn: "2028-03-31", priceAvg: 90.59, couponRate: 6 }),
      ]),
    ).toHaveLength(0);
  });
});
