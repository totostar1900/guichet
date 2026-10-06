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

/**
 * « NOS VL » ACCUSAIT NOTRE LECTURE D'UN TORT QUI N'ÉTAIT PAS LE SIEN.
 *
 * Audit du 6 octobre 2026 : dix fonds sans douze mois. Huit sont trop
 * jeunes, les deux autres ont 431 et 1 519 jours, et nous leur disions
 * « VL lues sur moins d'un an ». Vérifié dans les bulletins eux-mêmes : le
 * mot « KORI » ne paraît dans AUCUN bulletin avant le 30 octobre 2025, et
 * « PREMIUM » dans aucun avant le 6 juillet 2026. Ces fonds existaient, ils
 * n'étaient pas cotés. Il n'y a rien à rattraper, et dire le contraire
 * envoyait relire des séances qui ne portent pas la ligne.
 */
describe("un fonds vieux mais coté d'hier", () => {
  it("dit la cote récente, et non une lecture courte", () => {
    /* FCP KORI SERENITE : né le 28 juillet 2025, coté le 30 octobre, et sa
       première VL est du 24 octobre 2025. */
    expect(raisonSansDouzeMois("2025-07-28", "2026-10-02", "2025-10-24")).toBe("cote-recente");
    /* FCP ESS PREMIUM PERSO : né en 2022, coté le 6 juillet 2026. */
    expect(raisonSansDouzeMois("2022-07-19", "2026-09-15", "2026-06-30")).toBe("cote-recente");
  });

  it("et garde « lecture courte » pour un fonds coté avant notre première séance", () => {
    /* Le vrai cas, celui dont nous serions responsables : coté de longue
       date, et notre série commence avec notre lecture. Il est vide
       aujourd'hui, et ce test le garde reconnaissable pour le jour où. */
    expect(raisonSansDouzeMois("2019-01-01", "2026-09-30", "2023-03-06")).toBe("lecture-courte");
  });

  it("un mois de marge autour de notre première séance", () => {
    /* Un fonds coté la semaine où nous avons commencé n'est pas un fonds que
       nous aurions manqué, et ce n'est pas non plus une cote récente. */
    expect(raisonSansDouzeMois("2019-01-01", "2026-09-30", "2023-03-20")).toBe("lecture-courte");
    expect(raisonSansDouzeMois("2019-01-01", "2026-09-30", "2023-06-01")).toBe("cote-recente");
  });

  it("la jeunesse passe avant tout : un fonds de six mois reste jeune", () => {
    expect(raisonSansDouzeMois("2026-04-24", "2026-09-28", "2026-08-24")).toBe("jeune");
  });
});
