import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyse } from "@/lib/companies/analysis";
import { companyByMnemo } from "@/data/companies";
import { dividendeDeReference, serieDeValorisation } from "@/lib/market/valorisation";

/* La Régionale : 993,334 FCFA pour 2023, rien pour 2024 (« non distribué »). Son rendement s'affichait « — », graduations toutes à 0 (6 novembre 2026). */
const comptes = [
  { year: 2022, netIncome: 1, equity: 1, dividendPerShare: 1_004.5, publieLe: "2023-04-01" },
  { year: 2023, netIncome: 1, equity: 1, dividendPerShare: 993.334, publieLe: "2024-04-01" },
  { year: 2024, netIncome: 1, equity: 1, dividendPerShare: null, publieLe: "2025-04-01" },
];
const cote = (d: string, c: number) => ({ d, c, titres: 10, flottants: 5, valeur: 0 });

describe("le rendement garde le dernier dividende connu", () => {
  it("l'exercice sans dividende ne l'efface pas, et dit d'où il vient", () => {
    const [p] = serieDeValorisation([cote("2026-10-01", 41_000)], comptes, { titres: 10, flottants: 5 });
    expect(p.exercice).toBe(2024);
    expect(p.exerciceDuDividende).toBe(2023);
    expect(p.rendement).toBeCloseTo((993.334 / 41_000) * 100, 6);
  });

  it("un dividende pas encore en vigueur n'est pas utilisé", () => {
    expect(dividendeDeReference(comptes, "2024-03-31")?.year).toBe(2022);
    expect(dividendeDeReference(comptes, "2022-12-31")).toBeUndefined();
  });

  it("la page de la société lit le même dividende que le graphe", () => {
    const a = analyse(companyByMnemo("REG")!, { close: 41_000 } as never);
    expect(a.dividendYieldPct).toBeCloseTo((993.334 / 41_000) * 100, 6);
  });

  it("le graphe ne dessine pas d'axe vide et écrit l'exercice d'origine", () => {
    const src = readFileSync("src/app/offres/[id]/GraphesDeValorisation.tsx", "utf8");
    expect(src).toMatch(/\{b && \(\s*<GrapheDeSerie/);
    expect(src).toMatch(/dernier\.exercice !== dernier\.exerciceDuDividende/);
  });
});
