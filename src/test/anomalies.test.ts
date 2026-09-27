import { describe, expect, it } from "vitest";
import type { AuctionResult } from "@/lib/market/auction-results";
import { anomalies } from "@/lib/market/anomalies";

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

describe("les anomalies", () => {
  it("voient un chiffre retenu hors de la fourchette publiée", () => {
    // Le Trésor gabonais publie un prix moyen au-dessus de son propre maximum.
    const a = anomalies([s({ id: "g", instrument: "OTA", tenor: "4 ans", priceMin: 88, priceMax: 91.5, priceLimit: 91.5, priceAvg: 93.7937 })]);
    expect(a).toHaveLength(1);
    expect(a[0].quoi).toContain("hors de la fourchette");
  });

  it("ne crient pas sur une fourchette respectée", () => {
    expect(anomalies([s({ instrument: "OTA", tenor: "4 ans", priceMin: 88, priceMax: 95, priceAvg: 91 })])).toEqual([]);
  });

  it("voient un bon servi à un prix", () => {
    expect(anomalies([s({ id: "b", priceAvg: 91 })])[0].quoi).toContain("bon servi à un prix");
  });

  it("voient un servi supérieur aux soumissions", () => {
    expect(anomalies([s({ id: "m", rateAvg: 6, bid: 1e9, served: 2e9 })])[0].quoi).toContain("supérieur aux soumissions");
  });

  /**
   * Le code du Trésor porte le préfixe ISO de son pays, et la colonne « pays »
   * de l index de la BEAC vient d ailleurs que le scan : les deux se
   * contrôlent l un l autre sans rien coûter.
   */
  it("voient un code dont le préfixe ne répond pas au pays", () => {
    const a = anomalies([s({ id: "p", country: "Tchad", codeEmission: "GA1200001699", rateAvg: 6 })]);
    expect(a[0].quoi).toContain("préfixe GA");
  });

  it("laissent passer un code qui répond à son pays", () => {
    expect(anomalies([s({ country: "Gabon", codeEmission: "GA1200001699", rateAvg: 6 })])).toEqual([]);
  });

  it("voient une séance du 1er janvier", () => {
    expect(anomalies([s({ id: "j", sessionOn: "2025-01-01", rateAvg: 6.5 })])[0].quoi).toContain("1er janvier");
  });

  it("voient plus de soumissionnaires que le réseau n'en compte", () => {
    expect(anomalies([s({ id: "r", rateAvg: 6, bidders: 25, networkSize: 21 })])[0].quoi).toContain("réseau de 21");
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
    expect(a[0].quoi).toContain("5 lignes");
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
