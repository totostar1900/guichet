import { describe, expect, it } from "vitest";
import { familleDuGenre, famillesDuPortefeuille } from "@/lib/domain/familles-actifs";
import type { LinePerformance } from "@/lib/domain/performance";
import type { Offer, OfferKind } from "@/lib/domain/types";

const offre = (id: string, kind: OfferKind): Offer => ({ id, kind }) as Offer;
const ligne = (offerId: string, valued: number, invested: number, returned = 0, valuable = true): LinePerformance => ({ offerId, title: offerId, isin: "", invested, returned, valued, valuable } as LinePerformance);

describe("les familles d'actif", () => {
  it("range un bon et une obligation du Trésor dans la même famille", () => {
    // Seule la durée les sépare, et la durée a sa propre colonne.
    expect(familleDuGenre("BTA")).toBe("etat");
    expect(familleDuGenre("OTA")).toBe("etat");
  });

  it("range sous l'entreprise ce qui porte une signature d'entreprise", () => {
    for (const k of ["APE", "MARCHE", "RACHAT"] as OfferKind[]) expect(familleDuGenre(k), k).toBe("entreprise");
  });

  it("calcule la part de chaque famille et son rendu", () => {
    const offres = new Map([
      ["a", offre("a", "OTA")],
      ["b", offre("b", "ACTIONS")],
    ]);
    const parts = famillesDuPortefeuille([ligne("a", 600, 500, 40), ligne("b", 300, 300)], offres, 100);
    expect(parts.map((p) => p.famille)).toEqual(["etat", "actions", "especes"]);
    expect(parts[0].part).toBe(60);
    expect(parts[1].part).toBe(30);
    expect(parts[2].part).toBe(10);
    // (600 + 40 - 500) / 500 = 28 %
    expect(parts[0].rendu).toBe(28);
  });

  it("ne donne pas de rendu aux espèces, faute de versé", () => {
    const parts = famillesDuPortefeuille([], new Map(), 250);
    expect(parts).toHaveLength(1);
    expect(parts[0].famille).toBe("especes");
    expect(parts[0].rendu).toBeUndefined();
  });

  it("écarte une ligne dont l'offre a disparu, plutôt que de la ranger d'office", () => {
    const parts = famillesDuPortefeuille([ligne("fantome", 900, 900)], new Map(), 0);
    expect(parts).toEqual([]);
  });

  it("garde l'ordre d'affichage, jamais l'ordre des tailles", () => {
    const offres = new Map([
      ["f", offre("f", "FONDS")],
      ["e", offre("e", "OTA")],
    ]);
    const parts = famillesDuPortefeuille([ligne("f", 9000, 9000), ligne("e", 100, 100)], offres, 0);
    expect(parts.map((p) => p.famille)).toEqual(["etat", "fonds"]);
  });
});

describe("une ligne sans cours publié", () => {
  it("ne compte pas pour zéro, et ne fabrique donc pas une perte", () => {
    // Le défaut vu à l'écran : une famille valorisée à zéro face à ce qu'on y
    // avait versé affichait « -100 % » à un client qui n'avait rien perdu.
    const offres = new Map([["a", offre("a", "OTA")]]);
    const parts = famillesDuPortefeuille([ligne("a", 0, 4_890_548, 0, false)], offres, 0);
    expect(parts).toEqual([]);
  });

  it("laisse les autres familles intactes", () => {
    const offres = new Map([
      ["a", offre("a", "OTA")],
      ["b", offre("b", "FONDS")],
    ]);
    const parts = famillesDuPortefeuille([ligne("a", 0, 900, 0, false), ligne("b", 500, 400)], offres, 0);
    expect(parts.map((p) => p.famille)).toEqual(["fonds"]);
    expect(parts[0].part).toBe(100);
    expect(parts[0].rendu).toBe(25);
  });
});
