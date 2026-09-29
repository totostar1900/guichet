import { describe, expect, it } from "vitest";
import { coupeAu, serieBeacDe } from "@/lib/market/courbe-vue";

/**
 * Les deux règles du filigrane, éprouvées sans monter un rendu.
 *
 * Elles vivaient dans un composant, où seul un rendu statique les atteignait :
 * celui-ci restait sur la vue d'ensemble, et c'est exactement le cas d'un
 * Trésor choisi qui a échappé à deux relectures. Les figures étant fondues en
 * une, ces règles ont quitté le composant pour un module que rien n'empêche de
 * lire.
 */

const releve = {
  numero: 60,
  mois: "2026-07",
  source: "https://exemple/n60.pdf",
  releveLe: "2026-09-29",
  series: ["Cameroun", "Congo", "Gabon"].map((pays) => ({
    pays,
    points: [0.25, 1, 3, 7, 10, 15].map((annees, i) => ({ annees, pct: 7 + i * 0.4 })),
  })),
};

describe("la courbe de la BEAC derrière la nôtre", () => {
  it("ne paraît pas en vue d'ensemble : il n'y a pas de Trésor affiché", () => {
    /* Six écarts à la fois ne se lisent pas, et ce qu'on regarde en superposant
       est l'écart d'un Trésor avec lui-même. */
    expect(serieBeacDe("tous", releve)).toBeUndefined();
    expect(serieBeacDe("cemac", releve)).toBeUndefined();
  });

  it("ne rend que celle du Trésor affiché", () => {
    expect(serieBeacDe("Cameroun", releve)?.pays).toBe("Cameroun");
  });

  it("ne rend rien pour un Trésor que la BEAC ne publie pas", () => {
    /* Elle n'en publie que trois : Cameroun, Congo, Gabon. */
    expect(serieBeacDe("Tchad", releve)).toBeUndefined();
    expect(serieBeacDe("Cameroun", undefined)).toBeUndefined();
  });

  it("coupe son trait au cadre plutôt que d'étirer le cadre jusqu'à elle", () => {
    /* Nos observations s'arrêtent à sept ans : ses points à dix et quinze ne se
       tracent pas, sans quoi l'axe s'étire et notre courbe s'extrapole sur huit
       ans d'un trait aussi large que le reste. */
    const pts = releve.series[0].points;
    expect(coupeAu(pts, 7).map((q) => q.annees)).toEqual([0.25, 1, 3, 7]);
    expect(coupeAu(pts, 15)).toHaveLength(6);
    expect(coupeAu(pts, 0.1)).toEqual([]);
  });
});

/**
 * Une polyligne se trace dans l'ordre de ses points.
 *
 * C'est le défaut que trois relectures n'ont pas vu. Les durées de la semence
 * étaient écrites « { 0.25, 0.5, 1, 1.5, 2 } », et Object.entries rend les
 * clefs entières avant les fractionnaires : la série sortait 1, 2, 3 … 15 puis
 * 0,25, 0,5, 1,5, 3,5. Le trait courait jusqu'au bout, revenait d'un bond à
 * l'extrême gauche et repartait. Trois lignes traversaient la figure là où le
 * code n'en dessine qu'une.
 */
describe("l'ordre des points d'un tracé", () => {
  const remonte = (pts: { annees: number }[]) => pts.some((p, i) => i > 0 && p.annees < pts[i - 1].annees);

  it("la semence de la BEAC est rangée, quelle que soit l'écriture de ses clefs", async () => {
    const { BEAC_COURBE } = await import("@/data/beac-courbe");
    for (const [pays, pts] of Object.entries(BEAC_COURBE.pays)) {
      expect(remonte(pts), `${pays} remonte vers la gauche`).toBe(false);
    }
  });

  it("le tracé range ce qu'on lui donne, même en désordre", () => {
    /* Aucune source ne doit pouvoir imposer un aller-retour à la figure. */
    const desordre = [{ annees: 1 }, { annees: 3 }, { annees: 0.25 }, { annees: 2 }];
    expect(coupeAu(desordre, 7).map((q) => q.annees)).toEqual([0.25, 1, 2, 3]);
    expect(remonte(coupeAu(desordre, 7))).toBe(false);
  });

  it("le désordre aurait bien produit un retour vers la gauche", () => {
    /* La preuve par l'absurde : sans rangement, le trait revient en arrière. */
    const brut = Object.entries({ 0.25: 6.55, 1: 8.44, 2: 9.45, 1.5: 9.08 }).map(([a, pct]) => ({ annees: Number(a), pct }));
    expect(remonte(brut)).toBe(true);
  });
});

/**
 * La date de valeur du filigrane se lit, ou elle ne se vérifie pas.
 *
 * Elle sortait « 2026-07 » au milieu d'une phrase française. Le champ reste au
 * format du dépôt ; c'est l'écran qui le met en mots, et ce contrôle fixe le
 * format que l'écran attend.
 */
describe("le mois d'arrêté du relevé", () => {
  it("s'écrit comme un mois de dépôt, pour que l'écran le mette en mots", () => {
    expect(releve.mois).toMatch(/^\d{4}-\d{2}$/);
    expect(new Date(`${releve.mois}-01`).getUTCMonth()).toBe(6);
  });
});
