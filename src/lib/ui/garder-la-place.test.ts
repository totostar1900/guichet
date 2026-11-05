import { describe, expect, it } from "vitest";
import { cibleEnHaut, correction, fautRevenirEnHaut } from "@/lib/ui/garder-la-place";

describe("changer d'onglet, page défilée", () => {
  it("la cible pose la première section sous la bande collée : son top, moins le collage, la bande et l'écart", () => {
    expect(cibleEnHaut(900, 52, 49, 44)).toBe(755);
    expect(cibleEnHaut(30, 52, 49, 44), "jamais de défilement négatif").toBe(0);
  });
  it("on ne revient en haut que si la page a défilé au-delà de la cible", () => {
    expect(fautRevenirEnHaut(1200, 755)).toBe(true);
    expect(fautRevenirEnHaut(755, 755), "pile à la cible : rien à faire").toBe(false);
    expect(fautRevenirEnHaut(100, 755), "la bande n'est pas collée : la barre garde sa place").toBe(false);
  });
  it("« garder la place » garde son calcul quand la page n'a pas défilé jusqu'à la bande", () => {
    expect(correction({ top: 73, scrollY: 279 }, 334, 18, 862, 844).cible).toBe(279);
  });
});
