import { describe, expect, it } from "vitest";
import { ECHELLES, ETATS, cleDEchelle, derniereJusqua, derniereRevue, fraicheurDeLaSaisie, lireBanqueMondiale, lireFmi, placeSurLEchelle, serie, type EntiteFait } from "@/lib/market/pays";

const LU = "2026-11-07T08:00:00Z";

describe("la lecture du FMI", () => {
  const reponse = { values: { GGXWDG_NGDP: { CMR: { "2024": 43.4, "2025": 40.5, "2026": 40.1 }, GAB: { "2025": 84.2 }, ZZZ: { "2025": 1 } } } };
  it("ne garde que les six États, et ne dit estimé que ce qui vient après l'année observée", () => {
    const r = lireFmi(reponse, "GGXWDG_NGDP", "dette_brute_pib", LU, 2026);
    expect(r.map((x) => `${x.pays}:${x.annee}`).sort()).toEqual(["Cameroun:2024", "Cameroun:2025", "Cameroun:2026", "Gabon:2025"]);
    expect(r.find((x) => x.annee === 2024)!.estime).toBe(false);
    expect(r.find((x) => x.annee === 2025)!.estime).toBe(true);
    expect(r.every((x) => x.source === "FMI")).toBe(true);
  });
  it("saute une valeur absente plutôt que de la mettre à zéro", () => {
    const r = lireFmi({ values: { X: { CMR: { "2025": null, "2026": 3 } } } }, "X", "inflation", LU, 2026);
    expect(r).toHaveLength(1);
    expect(r[0].annee).toBe(2026);
  });
  it("ne rend rien pour une réponse inattendue", () => {
    expect(lireFmi({ error: "x" }, "GGXWDG_NGDP", "dette_brute_pib", LU, 2026)).toEqual([]);
  });
});

describe("la lecture de la Banque mondiale", () => {
  it("lit les lignes non vides, arrondit à un chiffre et ne dit jamais estimé", () => {
    const r = lireBanqueMondiale([{ page: 1 }, [{ countryiso3code: "CMR", date: "2024", value: 31.3412 }, { countryiso3code: "CMR", date: "2023", value: null }, { countryiso3code: "XXX", date: "2024", value: 1 }]], "dette_exterieure_rnb", LU);
    expect(r).toEqual([{ pays: "Cameroun", indicateur: "dette_exterieure_rnb", annee: 2024, valeur: 31.3, source: "Banque mondiale", estime: false, luLe: LU }]);
  });
  it("ne rend rien quand la source n'a rien", () => {
    expect(lireBanqueMondiale([{ page: 1 }, null], "dette_exterieure_rnb", LU)).toEqual([]);
  });
});

describe("les échelles officielles", () => {
  it("place une note sur son échelle et dit si elle est dans la catégorie d'investissement", () => {
    expect(placeSurLEchelle("S&P", "BBB-")).toMatchObject({ cle: "S&P", investissement: true });
    expect(placeSurLEchelle("S&P", "BB+")).toMatchObject({ investissement: false });
    expect(placeSurLEchelle("Moody's", "Baa3")).toMatchObject({ cle: "Moody", investissement: true });
    expect(placeSurLEchelle("Moody's", "Ba1")).toMatchObject({ investissement: false });
    expect(placeSurLEchelle("Fitch", "CCC+")!.rang).toBe(ECHELLES.Fitch.crans.indexOf("CCC+"));
  });
  it("accepte le moins typographique et refuse une note hors échelle", () => {
    expect(placeSurLEchelle("S&P", "BBB−")).toMatchObject({ investissement: true });
    expect(placeSurLEchelle("S&P", "Baa3")).toBeUndefined();
    expect(cleDEchelle("Agence inconnue")).toBeUndefined();
  });
});

describe("les séries et la fraîcheur", () => {
  const rows = [2022, 2024, 2025, 2026].map((annee) => ({ pays: "Cameroun" as const, indicateur: "dette_brute_pib" as const, annee, valeur: annee, source: "FMI" as const, estime: annee > 2024, luLe: LU }));
  it("donne la dernière année au plus l'année demandée, et la série dans l'ordre", () => {
    expect(derniereJusqua(rows, "Cameroun", "dette_brute_pib", 2025)!.annee).toBe(2025);
    expect(derniereJusqua(rows, "Cameroun", "dette_brute_pib", 2021)).toBeUndefined();
    expect(serie(rows, "Cameroun", "dette_brute_pib").map((r) => r.annee)).toEqual([2022, 2024, 2025, 2026]);
  });
  it("passe à « à vérifier » après un trimestre sans saisie", () => {
    expect(fraicheurDeLaSaisie(undefined, "2026-11-07")).toEqual({ etat: "jamais" });
    expect(fraicheurDeLaSaisie("2026-09-01", "2026-11-07").etat).toBe("a_jour");
    expect(fraicheurDeLaSaisie("2026-05-01", "2026-11-07").etat).toBe("a_verifier");
  });
  it("prend pour revue le jour de la dernière saisie de l'entité", () => {
    const f = (entite: string, saisiLe: string): EntiteFait => ({ id: saisiLe, entite, genre: "notation", organisme: "S&P", valeur: "B", dateFait: "2026-01-01", url: "https://x", saisiPar: "d", saisiLe });
    expect(derniereRevue([f("etat-gabon", "2026-03-01T10:00:00Z"), f("etat-gabon", "2026-09-30T10:00:00Z"), f("beac", "2026-10-30T10:00:00Z")], "etat-gabon")).toBe("2026-09-30");
  });
  it("a six États, chacun avec un code ISO et une adresse", () => {
    expect(ETATS).toHaveLength(6);
    expect(new Set(ETATS.map((e) => e.slug)).size).toBe(6);
  });
});
