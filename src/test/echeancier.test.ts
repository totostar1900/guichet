import { describe, expect, it } from "vitest";
import { echeancier, totalDeLEcheancier } from "@/lib/domain/echeancier";
import { COULEUR_FAMILLE, PALETTE_GRAPHIQUE } from "@/lib/domain/palette-graphiques";
import { NOM_FAMILLE } from "@/lib/domain/familles-actifs";

/**
 * L'échéancier, et les couleurs qui le dessinent.
 *
 * POURQUOI UN CLIQUET SUR UN GRAPHIQUE. Un dessin se vérifie mal à l'oeil : une
 * colonne manquante ressemble à un mois sans flux, et un mois sans flux
 * ressemble à une colonne manquante. Ici les deux se distinguent.
 */
const f = (date: string, amount: number, label = "coupon") => ({ date, amount, label });

describe("l'échéancier", () => {
  it("rend douze mois, même quand rien n'y tombe", () => {
    /* Sauter les mois vides donnerait un axe qui ment : douze colonnes serrées
       laisseraient croire à douze mois de versements. */
    const e = echeancier([], "2026-10-09");
    expect(e).toHaveLength(12);
    expect(e[0].mois).toBe("2026-10");
    expect(e.every((m) => m.montant === 0)).toBe(true);
  });

  it("passe l'année sans se tromper de mois", () => {
    const e = echeancier([], "2026-11-02", 4).map((m) => m.mois);
    expect(e).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("additionne ce qui tombe dans le même mois", () => {
    const e = echeancier([f("2026-10-09", 300_000), f("2026-10-28", 12_500)], "2026-10-01");
    expect(e[0].montant).toBe(312_500);
    expect(e[0].flux).toHaveLength(2);
  });

  it("range le détail d'un mois par date", () => {
    const e = echeancier([f("2026-10-28", 1), f("2026-10-09", 2)], "2026-10-01");
    expect(e[0].flux.map((x) => x.date)).toEqual(["2026-10-09", "2026-10-28"]);
  });

  it("ignore ce qui tombe hors de la fenêtre, des deux côtés", () => {
    /* Une colonne hors cadre n'existe pas pour le lecteur, et le total annoncé
       doit être celui des colonnes dessinées. */
    const e = echeancier([f("2026-09-30", 999), f("2027-10-01", 999), f("2026-10-09", 10)], "2026-10-01");
    expect(totalDeLEcheancier(e)).toBe(10);
  });

  it("compte le mois d'ouverture depuis la date donnée, pas depuis son début", () => {
    // Un flux du 2 octobre tombe bien dans le mois d'une fenêtre ouverte le 9.
    expect(echeancier([f("2026-10-02", 5)], "2026-10-09")[0].montant).toBe(5);
  });
});

describe("la palette des graphiques", () => {
  it("donne une couleur à chaque famille, et une seule", () => {
    const familles = Object.keys(NOM_FAMILLE) as (keyof typeof NOM_FAMILLE)[];
    for (const fam of familles) expect(COULEUR_FAMILLE[fam]).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(Object.values(COULEUR_FAMILLE)).size).toBe(familles.length);
  });

  it("n'emprunte aucune teinte aux pastilles de famille", () => {
    /* Les teintes `--fam-*` ont échoué le contrôle comme palette de graphique :
       le navy sort de la bande de clarté, et or ↔ vert sont à ΔE 12,6 en vision
       normale. Elles restent des encres sur fond pâle ; si l'une revenait ici,
       c'est qu'on aurait refait le mauvais choix. */
    const pastilles = ["#0b2545", "#0f6e6a", "#2a5db0", "#2f7d4f", "#8a6408", "#6d3b8f", "#b0426a", "#b84a1e"];
    for (const c of PALETTE_GRAPHIQUE) expect(pastilles).not.toContain(c);
  });
});
