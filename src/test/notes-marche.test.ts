import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { IndexPageData } from "@/lib/market/index-data";
import { seriesDeLaPeriode } from "@/lib/market/index-series";
import { momentDeLaPlace } from "@/lib/market/moment";

/**
 * LES NOTES DE MARCHÉ : GRAPHES, COULEURS, COTES, MOMENT (7 novembre 2026).
 * Les séries sont calculées de la même base que la variation écrite de la note : un graphe qui finit ailleurs que le chiffre du texte serait faux.
 */
const q = (sessionDate: string, close: number) => ({ sessionDate, close });
const w = (mnemo: string, weightTotal: number) => ({ isin: mnemo, mnemo, close: 0, capTotal: 0, capFloat: 0, weightTotal, weightFloat: 0 });

function donnees(): IndexPageData {
  const points = [
    { date: "2026-06-30", value: 1000, variationPct: 0 },
    { date: "2026-07-01", value: 1010, variationPct: 1 },
    { date: "2026-07-02", value: 1010, variationPct: 0 },
    { date: "2026-07-03", value: 990, variationPct: -2 },
  ];
  const weights = [w("BIG", 80), w("PET", 20)];
  return {
    stats: { points } as unknown as IndexPageData["stats"],
    weights,
    nameOf: (m: string) => `Société ${m}`,
    histories: [
      { w: weights[0], quotes: [q("2026-06-30", 100), q("2026-07-01", 110), q("2026-07-03", 90)] },
      { w: weights[1], quotes: [q("2026-06-15", 50), q("2026-07-02", 55)] },
    ] as unknown as IndexPageData["histories"],
    trading: new Map([
      ["2026-07-02", { titles: 5, amount: 1000, trades: 2, shares: {} }],
      ["2026-07-03", { titles: 3, amount: 500, trades: 1, shares: {} }],
    ]),
    movers: new Map(),
    missing: [],
  } as unknown as IndexPageData;
}

describe("les séries d'une période, à la base 100 de son début", () => {
  const r = seriesDeLaPeriode(donnees(), "2026-07-01", "2026-07-03");

  it("garde les séances de la période, sur l'axe de l'indice", () => {
    expect(r.dates).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
  });

  it("part du dernier cours AVANT la période, et reporte le dernier cours connu d'une séance sans cotation", () => {
    r.parSociete.BIG.forEach((v, i) => expect(v).toBeCloseTo([110, 110, 90][i], 6));
    r.parSociete.PET.forEach((v, i) => expect(v).toBeCloseTo([100, 110, 110][i], 6));
  });

  it("l'indice se rebase sur le niveau d'avant la période : la variation écrite est celle du graphe", () => {
    expect(r.comparaison!.indice[0]).toBeCloseTo(101, 6);
    expect(r.comparaison!.indice[2]).toBeCloseTo(99, 6);
  });

  it("la société la plus lourde est isolée, et le reste de la cote est pondéré sans elle", () => {
    expect(r.comparaison!.principale).toMatchObject({ mnemo: "BIG", weight: 80 });
    r.comparaison!.reste.forEach((v, i) => expect(v).toBeCloseTo([100, 110, 110][i], 6));
  });

  it("une période sans séance ne rend rien plutôt qu'une série inventée", () => {
    expect(seriesDeLaPeriode(donnees(), "2027-01-01", "2027-03-31")).toEqual({ dates: [], parSociete: {} });
  });
});

describe("ce qui se passe sur la place", () => {
  it("la dernière séance et les cinq dernières séances échangées, sans adjudication quand aucune n'est annoncée", () => {
    const m = momentDeLaPlace(donnees(), [], new Date("2026-07-04T10:00:00Z"));
    expect(m.derniereSeance).toEqual({ date: "2026-07-03", niveau: 990, variationPct: -2 });
    expect(m.semaine).toEqual({ seances: 4, transactions: 3, montant: 1500, titres: 8 });
    expect(m.prochaineAdjudication).toBeUndefined();
  });
});

describe("la page et les PDF parlent la même langue de variation", () => {
  const lire = (p: string) => readFileSync(p, "utf8");
  it("la page utilise la pastille de Guichet, pas une couleur écrite à la main", () => {
    const page = lire("src/app/indice/note/[trimestre]/page.tsx");
    const marche = lire("src/app/indice/note/[trimestre]/Marche.tsx");
    expect(page).toMatch(/PastilleVariation/);
    expect(marche).toMatch(/PastilleVariation/);
    expect(marche).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
  it("les deux PDF peignent leurs variations et portent la comparaison base 100", () => {
    for (const f of ["src/lib/documents/pdf/index-templates.tsx", "src/lib/documents/pdf/quarter-templates.tsx"]) {
      const src = lire(f);
      expect(src, f).toMatch(/teinte\(/);
      expect(src, f).toMatch(/CompareBase100/);
    }
  });
  it("le signe reste écrit à côté de la couleur", () => {
    expect(lire("src/lib/documents/pdf/charts.tsx")).toMatch(/Le signe reste écrit|le signe toujours écrit/);
  });
});
