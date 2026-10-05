import { describe, expect, it } from "vitest";
import { raisonSansDouzeMois } from "@/lib/domain/fund-perf";

/**
 * UNE CASE VIDE QUI VEUT DIRE DEUX CHOSES EN DIT UNE DE TROP.
 *
 * Audit du 5 octobre 2026 sur la production : dix fonds sur quarante-cinq
 * n'ont pas de performance sur douze mois, et la même case vide couvrait deux
 * situations sans rapport. Huit sont trop jeunes, dont trois à UN JOUR près :
 * nés le 26 septembre 2025, dernière VL le 25 septembre 2026. Deux ont plus
 * d'un an — 1 519 et 417 jours — et ce sont NOS valeurs liquidatives qui ne
 * remontent qu'à 77 et 329 jours.
 */
describe("pourquoi un douze mois est vide", () => {
  /* Le cas qui a lancé l'audit : « FCP Contacturer Obligataire-parts A ». */
  it("dit « trop jeune » à un jour près", () => {
    expect(raisonSansDouzeMois("2025-09-26", "2026-09-25")).toBe("jeune");
    /* Et le lendemain, le fonds a un an : la raison change d'elle-même. */
    expect(raisonSansDouzeMois("2025-09-26", "2026-09-26")).toBe("lecture-courte");
  });

  /* « FCP ESS Premium Perso » : quatre ans, et 77 jours de lecture. */
  it("ne traite pas un fonds de quatre ans de fonds jeune", () => {
    expect(raisonSansDouzeMois("2022-07-08", "2026-09-30")).toBe("lecture-courte");
    expect(raisonSansDouzeMois("2025-08-05", "2026-09-30")).toBe("lecture-courte");
  });

  it("ne dit rien quand il manque une date", () => {
    expect(raisonSansDouzeMois(undefined, "2026-09-25")).toBeUndefined();
    expect(raisonSansDouzeMois("2025-09-26", undefined)).toBeUndefined();
  });
});
