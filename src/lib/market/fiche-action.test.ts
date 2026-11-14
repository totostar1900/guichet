import { describe, expect, it } from "vitest";
import type { Quote } from "@/lib/domain/market";
import { contreLIndice, dividendesVerses, reperes52Semaines } from "./fiche-action";
import type { PointCours } from "./periodes";

const jour = (n: number, depart = "2025-01-01") => new Date(Date.parse(`${depart}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const serie = (n: number, f: (i: number) => number, depart = "2025-01-01"): PointCours[] => Array.from({ length: n }, (_, i) => ({ d: jour(i * 7, depart), c: f(i), v: 0 }));

describe("contre l'indice", () => {
  it("écrit la variation du titre, celle de l'indice et l'écart en points, sur la même fenêtre", () => {
    const titre = serie(80, (i) => 1000 + i * 10);
    const indice = serie(80, (i) => 1000 + i).map((p) => ({ date: p.d, value: p.c }));
    const l = contreLIndice(titre, indice);
    expect(l.map((x) => x.cle)).toEqual(["3m", "6m", "1a"]);
    for (const x of l) expect(x.ecartPts).toBeCloseTo(x.titrePct - x.indicePct, 10);
    expect(l[0].titrePct).toBeGreaterThan(l[0].indicePct);
  });

  it("n'écrit pas une période que le titre ne couvre pas (entré à la cote en cours d'année)", () => {
    const indice = serie(80, (i) => 1000 + i).map((p) => ({ date: p.d, value: p.c }));
    const titre = serie(20, (i) => 500 + i, jour(60 * 7));
    const l = contreLIndice(titre, indice);
    expect(l.map((x) => x.cle), "une période non couverte a reçu une variation").not.toContain("1a");
  });

  it("n'écrit rien sans indice", () => {
    expect(contreLIndice(serie(80, (i) => 1000 + i), [])).toEqual([]);
  });
});

describe("repères sur 52 semaines", () => {
  it("donne le plus bas et le plus haut des clôtures de l'année", () => {
    const p = serie(80, (i) => (i === 40 ? 700 : i === 60 ? 1500 : 1000));
    const r = reperes52Semaines(p)!;
    expect(r.bas).toBe(700);
    expect(r.haut).toBe(1500);
  });

  it("se tait quand la série ne couvre pas l'année", () => {
    expect(reperes52Semaines(serie(20, (i) => 1000 + i))).toBeUndefined();
    expect(reperes52Semaines([])).toBeUndefined();
  });
});

const q = (o: Partial<Quote>): Quote => ({ isin: "X", sessionDate: "2026-08-04", bulletinNo: 1, instrument: "action", mnemo: "X", issuer: "X", designation: "X", previousClose: 1, previousDate: "2026-08-03", open: 1, close: 1, thresholdHigh: 1, thresholdLow: 1, variationPct: 0, referenceNext: 1, volumeTraded: 0, valueTraded: 0, trades: 0, status: "NC", ...o });

describe("dividendes versés", () => {
  const figures = [
    { year: 2023, dividendPerShare: 2600 },
    { year: 2024, dividendPerShare: 2500 },
    { year: 2025, dividendPerShare: 2325 },
    { year: 2021, dividendPerShare: null },
    { year: 2020 },
  ];

  it("prend le brut de l'émetteur, du plus récent au plus ancien, sans écrire un exercice inconnu", () => {
    const v = dividendesVerses(figures, []);
    expect(v.map((x) => x.exercice)).toEqual([2025, 2024, 2023, 2021]);
    expect(v.find((x) => x.exercice === 2021)!.brut).toBeNull();
  });

  it("lit la date de paiement la plus ancienne vue pour l'exercice : le bulletin recopie un versement passé avec une date plus récente", () => {
    const v = dividendesVerses(figures, [
      q({ dividendYear: 2024, lastDividend: 2225, dividendDate: "2025-07-28", sessionDate: "2025-07-29" }),
      q({ dividendYear: 2024, lastDividend: 2225, dividendDate: "2026-02-01", sessionDate: "2026-03-01" }),
    ]);
    expect(v.find((x) => x.exercice === 2024)!.payeLe).toBe("2025-07-28");
  });

  it("écarte une date dont le montant n'est pas voisin du brut publié (le versement d'une autre société)", () => {
    const v = dividendesVerses(figures, [q({ dividendYear: 2023, lastDividend: 540, dividendDate: "2024-06-27" })]);
    expect(v.find((x) => x.exercice === 2023)!.payeLe).toBeUndefined();
  });

  it("n'écrit pas de date pour un exercice sans dividende", () => {
    const v = dividendesVerses(figures, [q({ dividendYear: 2021, lastDividend: 500, dividendDate: "2022-07-01" })]);
    expect(v.find((x) => x.exercice === 2021)!.payeLe).toBeUndefined();
  });
});

describe("dividendes versés : les lignes réelles des bulletins de production (13 novembre 2026)", () => {
  /* Relevé de la table des cours : montants nets de retenue (89 % et 90 % du brut), un montant recopié avec une date plus récente, et la séance de BHC qui portait le versement de SOCAP. */
  it("lit la date de paiement malgré un montant net, une recopie tardive et le versement d'une autre société", () => {
    const socap = dividendesVerses([{ year: 2024, dividendPerShare: 2500 }, { year: 2025, dividendPerShare: 2325 }], [
      q({ dividendYear: 2024, lastDividend: 2225, dividendDate: "2025-07-28" }),
      q({ dividendYear: 2025, lastDividend: 2325, dividendDate: "2026-07-20" }),
    ]);
    expect(socap.map((x) => x.payeLe)).toEqual(["2026-07-20", "2025-07-28"]);

    const bhc = dividendesVerses([{ year: 2025, dividendPerShare: 2500 }], [
      q({ dividendYear: 2025, lastDividend: 2500, dividendDate: "2026-05-18", sessionDate: "2026-08-05" }),
      q({ dividendYear: 2025, lastDividend: 2325, dividendDate: "2026-07-20", sessionDate: "2026-08-04" }),
    ]);
    expect(bhc[0].payeLe, "le versement d'une autre société a pris la place de la date de BHC").toBe("2026-05-18");

    const bange = dividendesVerses([{ year: 2022, dividendPerShare: 8397 }, { year: 2024, dividendPerShare: 4472 }], [
      q({ dividendYear: 2022, lastDividend: 8397.4, dividendDate: "2023-07-29" }),
      q({ dividendYear: 2022, lastDividend: 8397.4, dividendDate: "2024-09-19" }),
      q({ dividendYear: 2024, lastDividend: 4025.33, dividendDate: "2025-08-11" }),
      q({ dividendYear: 2024, lastDividend: 4472.59, dividendDate: "2025-08-11" }),
    ]);
    expect(bange.find((x) => x.exercice === 2022)!.payeLe, "la recopie tardive a remplacé la première date").toBe("2023-07-29");
    expect(bange.find((x) => x.exercice === 2024)!.payeLe).toBe("2025-08-11");
  });
});
