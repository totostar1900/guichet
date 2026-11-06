import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { AuctionResult } from "@/lib/market/auction-results";
import { CHAMPS_CLIENT, aServi, partCouverte, tauxLimiteParDuree, vueClient } from "@/lib/market/adjudications-client";

const seance = (o: Partial<AuctionResult> & { id: string }): AuctionResult =>
  ({ country: "Cameroun", instrument: "BTA", tenor: "26 semaines", sessionOn: "2026-10-01", abondement: false, confirmedBy: "desk", confirmedAt: "2026-10-02", sourceUrl: "x", sourceTitle: "x", ...o }) as AuctionResult;

describe("ce que le client lit des adjudications", () => {
  it("ne laisse sortir que les champs du communiqué", () => {
    const secret = {
      sources: { pdf: { rateAvg: 3 }, excel: { rateAvg: 3 }, retenu: {}, carnet: { offres: 9, rejetAuPrix: 5 } },
      confirmedBy: "desk",
      sourceUrl: "https://secret",
      offerId: "o1",
      anomaliesVues: ["x"],
    } as unknown as Partial<AuctionResult>;
    const [v] = vueClient([seance({ id: "a", rateAvg: 3.1, served: 5, announced: 10, ...secret })]);
    const permis = new Set<string>(["id", "sessionOn", "country", "instrument", "tenor", "codeEmission", ...CHAMPS_CLIENT]);
    expect(Object.keys(v).filter((k) => !permis.has(k))).toEqual([]);
    expect(JSON.stringify(v)).not.toMatch(/carnet|rejet|secret|excel|desk/i);
  });

  it("écarte ce qu'une personne n'a pas relu et ce qui est écarté", () => {
    const lignes = [seance({ id: "ok" }), seance({ id: "non-relue", confirmedBy: undefined }), seance({ id: "ecartee", setAsideAt: "2026-10-03" } as Partial<AuctionResult> & { id: string })];
    expect(vueClient(lignes).map((x) => x.id)).toEqual(["ok"]);
  });

  it("ne recalcule pas une couverture que le communiqué n'imprime pas", () => {
    const [v] = vueClient([seance({ id: "a", bid: 200, announced: 100 })]);
    expect(v.coverage).toBeUndefined();
  });

  it("classe la plus récente d'abord", () => {
    expect(vueClient([seance({ id: "a", sessionOn: "2026-01-01" }), seance({ id: "b", sessionOn: "2026-06-01" })]).map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("ne donne un taux limite par durée qu'aux séances qui ont servi", () => {
    const v = vueClient([
      seance({ id: "a", rateLimit: 4, served: 10, sessionOn: "2026-03-01" }),
      seance({ id: "b", rateLimit: 9, served: 0, sessionOn: "2026-09-01" }),
    ]);
    expect(aServi(v[0])).toBe(false);
    expect(tauxLimiteParDuree(v)).toEqual([{ country: "Cameroun", tenor: "26 semaines", rateLimit: 4, sessionOn: "2026-03-01" }]);
  });

  it("compte la part couverte sur douze mois, jamais avant le 1er février 2023", () => {
    const v = vueClient([
      seance({ id: "a", coverage: 150, sessionOn: "2026-09-01" }),
      seance({ id: "b", coverage: 80, sessionOn: "2026-05-01" }),
      seance({ id: "c", coverage: 300, sessionOn: "2024-01-01" }),
    ]);
    expect(partCouverte(v, "2026-10-01")).toEqual({ couvertes: 1, sur: 2, depuis: "2025-10-01" });
    expect(partCouverte(vueClient([seance({ id: "d", coverage: 120, sessionOn: "2023-06-01" })]), "2023-07-01")?.depuis).toBe("2023-02-01");
  });

  it("la page ne lit les séances que par la projection", () => {
    for (const f of ["src/app/marche/adjudications/page.tsx", "src/app/marche/page.tsx"]) {
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/\.sources\b|carnet|confirmedBy|sourceUrl|coverageOf/);
    }
  });
});

describe("le carnet, au desk seulement", () => {
  it("compte la part refusée au prix, depuis le 1er février 2023, sans une source Excel exclue", async () => {
    const { carnetByYear } = await import("@/lib/market/auction-stats");
    const avec = (id: string, over: Record<string, unknown>) => seance({ id, sessionOn: "2025-03-01", ...over } as Partial<AuctionResult> & { id: string });
    const carnet = { rejeteAuPrix: 25, nbOffres: 4 };
    const src = (extra = {}) => ({ retenu: {}, excel: { bid: 100, bidders: 3 }, carnet, ...extra });
    const rows = [
      avec("a", { sources: src() }),
      avec("b", { sources: src({ exclues: ["excel"] }) }),
      avec("c", { sessionOn: "2022-12-01", sources: src() }),
    ];
    expect(carnetByYear(rows)).toEqual([{ country: "Cameroun", year: "2025", sessions: 1, bid: 100, rejete: 25, partRejetee: 25, soumissionnaires: 3 }]);
  });
});
