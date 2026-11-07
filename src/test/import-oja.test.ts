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

describe("rien n'est définitif : les écarts déjà tranchés se rouvrent", () => {
  const d = desk("b", "GQ1200000172", "2026-10-22", { announced: 16_055_000, served: 15_000_000, rateLimit: 6.6 });
  const o = oja("GQ1200000172", "2026-10-22", { announced: 15e9, served: 15e9, rateLimit: 6.6 });

  it("un champ tranché ne revient pas à l'import suivant, mais revient quand on rouvre, avec son auteur et sa source", () => {
    const v = verser(d, o, "imp1", { "b:announced": "excel", "b:served": "pdf" }, "Alice", "2026-11-07T10:00:00Z");
    const tranchee = { ...d, sources: v.sources };
    expect(planifier([o], [], 0, [tranchee]).rapprochees[0].ecarts).toHaveLength(0);
    const rouvert = planifier([o], [], 0, [tranchee], { rouvrir: true }).rapprochees[0].ecarts;
    expect(rouvert.map((e) => e.champ).sort()).toEqual(["announced", "served"]);
    const ann = rouvert.find((e) => e.champ === "announced")!;
    expect(ann.dejaTranche).toMatchObject({ retenu: "excel", par: "Alice" });
    expect(ann.proposition.source).toBe("excel");
    expect(rouvert.find((e) => e.champ === "served")!.proposition.source).toBe("pdf");
  });

  it("un champ jamais tranché ne porte pas de trace de décision", () => {
    expect(planifier([o], [], 0, [d], { rouvrir: true }).rapprochees[0].ecarts.every((e) => e.dejaTranche === undefined)).toBe(true);
  });

  it("changer d'avis écrit la nouvelle source retenue, et la décision précédente disparaît du champ", () => {
    const v1 = verser(d, o, "imp1", { "b:announced": "excel" }, "Alice", "2026-11-07T10:00:00Z");
    const v2 = verser({ ...d, sources: v1.sources }, o, "imp2", { "b:announced": "pdf" }, "Bob", "2026-11-08T10:00:00Z");
    const e = (v2.sources.ecarts ?? []).filter((x) => x.champ === "announced");
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ retenu: "pdf", par: "Bob" });
    expect(v2.sources.retenu.announced).toBe("pdf");
  });
});

describe("le plan ne perd plus de séances ni ne les invente (investigation du 7 novembre 2026)", () => {
  const A = oja("GA1100000841", "2026-04-09", { announced: 7.5e9 });
  const B = oja("GA1100000841", "2026-04-10", { announced: 7.5e9 });
  const ligneB = desk("b", "GA1100000841", "2026-04-10", { country: "Gabon" });

  it("deux séances OJA d'une même ligne à un jour d'écart : la jumelle exacte garde sa séance du Desk, l'autre est nouvelle", () => {
    const plan = planifier([A, B], [], 0, [ligneB]);
    expect(plan.rapprochees.map((r) => [r.oja.date, r.deskId])).toEqual([["2026-04-10", "b"]]);
    expect(plan.nouvelles.map((s) => s.date)).toEqual(["2026-04-09"]);
  });

  it("l'ordre des séances dans le fichier ne change rien", () => {
    const plan = planifier([B, A], [], 0, [ligneB]);
    expect(plan.rapprochees.map((r) => r.deskId)).toEqual(["b"]);
    expect(plan.nouvelles.map((s) => s.date)).toEqual(["2026-04-09"]);
  });

  it("une séance dont le pays, le jour et le code existent déjà n'est jamais « nouvelle » : la base la refuserait, à chaque import", () => {
    const pris = { ...desk("x", "GA1100000841", "2026-04-09", { country: "Gabon" }) };
    // la jumelle du Desk est déjà prise par une autre séance OJA du même jour : on la simule par une approchée identique
    const plan = planifier([A, oja("GA1100000841", "2026-04-09", { announced: 7.5e9 })], [], 0, [pris]);
    expect(plan.nouvelles).toHaveLength(0);
    expect(plan.doublons).toBe(1);
  });

  it("une séance mise de côté par l'exclusion d'un import est « réactivable » ; une séance écartée à la main reste ignorée", () => {
    const excl = desk("e1", "GA1100000500", "2026-05-01", { country: "Gabon", setAsideAt: "2026-11-07", setAsideReason: "Import OJA exclu (58e60708) : doublon de test" });
    const main = desk("e2", "GA1100000501", "2026-05-02", { country: "Gabon", setAsideAt: "2026-11-07", setAsideReason: "communiqué hors sujet" });
    const plan = planifier([oja("GA1100000500", "2026-05-01", {}), oja("GA1100000501", "2026-05-02", {})], [], 0, [excl, main]);
    expect(plan.reactivables.map((x) => x.deskId)).toEqual(["e1"]);
    expect(plan.compteurs).toMatchObject({ reactivables: 1, ignorees: 1 });
    expect(plan.nouvelles).toHaveLength(0);
  });
});

describe("les bulles disent qu'une séance non relue n'est pas utilisée", () => {
  it("l'onglet « À relire », « À lire » et les compteurs « à confirmer » et « nouvelles » portent la règle, en français et en anglais", async () => {
    const { KPI_OJA, ONGLETS_SEANCES, EN_KPI_OJA } = await import("@/lib/market/oja-kpi");
    for (const t of [ONGLETS_SEANCES.a_lire, ONGLETS_SEANCES.a_relire, KPI_OJA.nouvellesAConfirmer, KPI_OJA.nouvelles]) {
      expect(t.texte, t.titre).toMatch(/n'est pas relue, elle n'est utilisée nulle part/);
      expect(EN_KPI_OJA[t.texte], t.titre).toMatch(/is reviewed, it is used nowhere/);
    }
  });
});
