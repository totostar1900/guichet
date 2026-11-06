import { describe, expect, it } from "vitest";
import { planifier, sourcesDeNouvelle, verser, type SeanceDuDesk } from "@/lib/market/import-oja";
import type { SeanceOja } from "@/lib/market/oja";
import { etatSource, valeursRetenues } from "@/lib/market/sources-seance";

const oja = (isin: string, date: string, v: SeanceOja["valeurs"], fiabilite: SeanceOja["fiabilite"] = "fiable"): SeanceOja => ({ isin, date, pays: "Gabon", instrument: "BTA", valeurs: v, fiabilite, carnet: { rejeteAuPrix: 1, nbOffres: 5 } });
const desk = (id: string, code: string, jour: string, extra: Partial<SeanceDuDesk> = {}): SeanceDuDesk => ({ id, codeEmission: code, sessionOn: jour, ...extra });

describe("le plan d'un import OJA", () => {
  const A = oja("GA1100000001", "2026-10-21", { announced: 7.5e9, bid: 4.07e9, served: 4.06e9, rateLimit: 6.5 });
  const B = oja("GQ1200000172", "2026-10-22", { announced: 15e9, served: 15e9, rateLimit: 6.6 });
  const C = oja("GA1100000003", "2026-10-28", { announced: 15e9, bid: 10e9 });
  const D = oja("GA1100000004", "2021-03-10", { announced: 10e9 }, "a_confirmer");
  const E = oja("GA1100000005", "2026-10-30", { announced: 10e9 });
  const base: SeanceDuDesk[] = [
    desk("a", "GA1100000001", "2026-10-21", { announced: 7.5e9, bid: 4.07e9, served: 4.06e9, rateLimit: 6.5 }),
    desk("b", "GQ1200000172", "2026-10-22", { announced: 16_055_000, served: 15_000_000, rateLimit: 6.6 }),
    desk("e", "GA1100000005", "2026-10-30", { setAsideAt: "2026-11-01" }),
    desk("x", "GA1100000009", "2026-10-14", { bid: 5e9, served: 5e9 }),
  ];
  const plan = planifier([A, B, C, D, E], ["GA1100000009|2026-10-14"], 3, base);

  it("range les séances : concordante, en écart, nouvelles (fiables et à confirmer), ignorée parce que écartée au Desk", () => {
    expect(plan.compteurs).toMatchObject({ nouvellesFiables: 1, nouvellesAConfirmer: 1, concordantes: 1, ecarts: 1, ignorees: 4, contredites: 1 });
    expect(plan.nouvelles.map((s) => s.isin).sort()).toEqual(["GA1100000003", "GA1100000004"]);
  });

  it("propose l'Excel pour une erreur d'unité et nomme les champs en écart", () => {
    const b = plan.rapprochees.find((r) => r.deskId === "b")!;
    expect(b.ecarts.map((e) => [e.champ, e.proposition.source, e.proposition.raison])).toEqual([["announced", "excel", "erreur_unite"], ["served", "excel", "erreur_unite"]]);
  });

  it("signale un résultat du Desk qu'OJA dit rejeté, seulement s'il porte des montants", () => {
    expect(plan.contredites).toEqual([{ deskId: "x", isin: "GA1100000009", date: "2026-10-14" }]);
    expect(planifier([], ["GA1100000009|2026-10-14"], 0, [desk("y", "GA1100000009", "2026-10-14", { bid: 0, served: 0 })]).contredites).toEqual([]);
  });

  it("un second import identique ne change rien", () => {
    const d = desk("a", "GA1100000001", "2026-10-21", { announced: 7.5e9 });
    const v = verser(d, A, "i1", {}, "desk", "2026-11-06");
    const deuxieme = planifier([A], [], 0, [{ ...d, sources: v.sources }]);
    expect(deuxieme.rapprochees[0].inchangee).toBe(true);
  });

  it("verse l'Excel, applique les choix du desk, garde les deux jeux, et écrit les colonnes retenues", () => {
    const b = base[1];
    const v = verser(b, B, "i1", { "b:served": "pdf" }, "Desk Démo", "2026-11-06");
    expect(valeursRetenues(v.sources).announced).toBe(15e9);
    expect(v.colonnes.announced).toBe(15e9);
    expect(v.colonnes.served).toBe(15_000_000);
    expect(v.sources.ecarts?.[0]).toMatchObject({ champ: "served", retenu: "pdf", motif: "tranché à l'import OJA", par: "Desk Démo" });
    expect(v.sources.pdf?.announced).toBe(16_055_000);
    expect(etatSource({ ...b, sources: v.sources }).libelle).toBe("PDF + Excel");
  });

  it("une séance nouvelle vient tout entière de l'Excel, et le dit", () => {
    const s = sourcesDeNouvelle(C, "i1");
    expect(s.pdf).toBeUndefined();
    expect(s.retenu).toEqual({ announced: "excel", bid: "excel" });
    expect(etatSource({ sessionOn: C.date, sources: s }).libelle).toBe("Excel");
  });
});
