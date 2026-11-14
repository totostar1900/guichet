import { describe, expect, it } from "vitest";
import { ANNONCE_JOURS_MAX, ANNONCE_MAX, annonceEnCours, verifierAnnonce, type Annonce } from "./annonce";

const a = (o: Partial<Annonce>): Annonce => ({ id: "x", texte: "La séance du Trésor ouvre le 20 novembre.", jusquAu: "2026-11-20", publieePar: "Desk", publieeLe: "2026-11-14T08:00:00Z", ...o });

describe("verifierAnnonce", () => {
  const aujourdhui = "2026-11-14";
  it("accepte une phrase factuelle avec une date de fin proche", () => {
    expect(verifierAnnonce("Séance du Trésor : réponses ouvertes jusqu'au 20 nov.", "2026-11-20", aujourdhui)).toBeUndefined();
  });
  it("refuse un texte trop court ou trop long", () => {
    expect(verifierAnnonce("Court", "2026-11-20", aujourdhui)).toMatch(/au moins/);
    expect(verifierAnnonce("x".repeat(ANNONCE_MAX + 1), "2026-11-20", aujourdhui)).toMatch(/au plus/);
  });
  it("refuse le conseil, la promesse et l'urgence fabriquée", () => {
    for (const t of ["Notre meilleur placement du moment", "Rendement garanti sur cette ligne", "Dernière chance de souscrire", "Ne manquez pas cette séance !", "Profitez de la séance du Trésor"]) {
      expect(verifierAnnonce(t, "2026-11-20", aujourdhui), t).toMatch(/ni conseil/);
    }
  });
  it("refuse une date passée, absente, ou trop lointaine", () => {
    expect(verifierAnnonce("Séance du Trésor le 20 novembre", "2026-11-10", aujourdhui)).toMatch(/passée/);
    expect(verifierAnnonce("Séance du Trésor le 20 novembre", "", aujourdhui)).toMatch(/requise/);
    expect(verifierAnnonce("Séance du Trésor le 20 novembre", "2027-03-01", aujourdhui)).toContain(String(ANNONCE_JOURS_MAX));
  });
});

describe("annonceEnCours", () => {
  it("ne retient ni une annonce échue ni une annonce retirée", () => {
    expect(annonceEnCours([a({ jusquAu: "2026-11-13" })], "2026-11-14")).toBeUndefined();
    expect(annonceEnCours([a({ retireeLe: "2026-11-14T09:00:00Z" })], "2026-11-14")).toBeUndefined();
  });
  it("garde une annonce qui finit aujourd'hui", () => {
    expect(annonceEnCours([a({ jusquAu: "2026-11-14" })], "2026-11-14")?.id).toBe("x");
  });
  it("prend la plus récente si deux sont en cours", () => {
    expect(annonceEnCours([a({ id: "vieille", publieeLe: "2026-11-01T00:00:00Z" }), a({ id: "neuve", publieeLe: "2026-11-14T00:00:00Z" })], "2026-11-14")?.id).toBe("neuve");
  });
});
