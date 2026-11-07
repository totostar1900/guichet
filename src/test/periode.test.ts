import { describe, expect, it } from "vitest";
import type { Offer } from "@/lib/domain/types";
import type { AuctionResult } from "@/lib/market/auction-results";
import { preparerPeriode } from "@/app/comparer/periode";

const offre = (o: Record<string, unknown>) => o as unknown as Offer;
const fonds = (id: string, key: string) => offre({ id, title: id, kind: "FONDS", fund: { key } });
const ota = offre({ id: "ota", title: "OTA 5 ans", kind: "OTA", country: "Gabon", settleOn: "2026-11-01", maturityOn: "2031-11-01", pricePct: 100, couponRate: 6.25, nominal: 10000 });
const serie = (debut: string, n: number, pas: number, v0: number, dv: number) => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(`${debut}T00:00:00Z`) + i * pas * 86_400_000).toISOString().slice(0, 10), valeur: v0 + i * dv }));
const seance = (sessionOn: string, taux: number, tenor = "13 semaines", country = "Cameroun") => ({ id: sessionOn + tenor, instrument: "BTA", country, tenor, sessionOn, rateAvg: taux, served: 1, confirmedBy: "desk" }) as unknown as AuctionResult;
const base = { navs: new Map(), cours: new Map(), seances: [] as AuctionResult[], tauxBancairePct: 0, capital: 10_000_000 };

describe("la période du comparatif", () => {
  it("ne mesure jamais un OTA sur une période : son rendement actuariel, tenu jusqu'à l'échéance", () => {
    const navs = new Map([["f1", serie("2025-01-01", 40, 10, 100, 0.5)]]);
    const p = preparerPeriode({ ...base, lignes: [ota, fonds("fonds", "f1")], navs });
    const r = p.resultats.find((x) => x.id === "ota")!;
    expect(r.mesure).toBeUndefined();
    expect(r.genre).toBe("ota");
    expect(r.hors).toMatch(/marché secondaire/);
    expect(p.resultats.find((x) => x.id === "fonds")!.mesure).toBeDefined();
  });

  it("limite la plage à ce que les lignes ont en commun et le dit", () => {
    const navs = new Map([["f1", serie("2025-01-01", 40, 10, 100, 0.5)], ["f2", serie("2025-03-01", 30, 10, 100, 0.2)]]);
    const p = preparerPeriode({ ...base, lignes: [fonds("a", "f1"), fonds("b", "f2")], navs, du: "2020-01-01" });
    expect(p.commune!.debut).toBe("2025-03-01");
    expect(p.fenetre!.du).toBe("2025-03-01");
    expect(p.fenetre!.borne).toBe(true);
  });

  it("dit qu'il n'y a rien en commun plutôt que d'inventer une plage", () => {
    const navs = new Map([["f1", serie("2020-01-01", 10, 10, 100, 1)], ["f2", serie("2025-01-01", 10, 10, 100, 1)]]);
    const p = preparerPeriode({ ...base, lignes: [fonds("a", "f1"), fonds("b", "f2")], navs });
    expect(p.fenetre).toBeUndefined();
  });

  it("roule les bons d'un Trésor, au taux bancaire donné, et seulement avec des séances confirmées", () => {
    const seances = [seance("2025-01-01", 4), seance("2025-04-02", 4), seance("2025-07-02", 4), seance("2025-10-01", 4, "26 semaines")];
    const navs = new Map([["f1", serie("2025-01-01", 50, 10, 100, 0.1)]]);
    const p = preparerPeriode({ ...base, lignes: [fonds("a", "f1"), fonds("b", "f1")], navs, seances, du: "2025-01-01", au: "2025-07-02", tresor: "Cameroun" });
    const s13 = p.strategies.find((s) => s.id === "bta13")!;
    expect(s13.mesure!.placements).toBe(2);
    expect(s13.gain).toBeCloseTo((10_000_000 * s13.mesure!.cumule) / 100, 6);
    const sans = preparerPeriode({ ...base, lignes: [fonds("a", "f1"), fonds("b", "f1")], navs, seances: seances.map((s) => ({ ...s, confirmedBy: undefined }) as AuctionResult), du: "2025-01-01", au: "2025-07-02", tresor: "Cameroun" });
    expect(sans.strategies.find((s) => s.id === "bta13")!.mesure).toBeUndefined();
  });

  it("ne donne pas la dispersion sur une période de moins de deux mois", () => {
    const navs = new Map([["f1", serie("2025-01-01", 40, 1, 100, 0.1)]]);
    const p = preparerPeriode({ ...base, lignes: [fonds("a", "f1"), fonds("b", "f1")], navs, du: "2025-01-05", au: "2025-02-01" });
    expect(p.entree.lignes.every((l) => !l.s)).toBe(true);
  });
});
