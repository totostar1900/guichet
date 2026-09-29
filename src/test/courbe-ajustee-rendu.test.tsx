import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CourbeAjustee, coupeAu, serieBeacDe } from "@/components/market/CourbeAjustee";
import type { CourbePays, Fenetre } from "@/components/market/CourbeInteractive";

/**
 * Compter ce que la figure dessine, au lieu de relire son filtre.
 *
 * Le desk voyait trois courbes de la BEAC avec un seul Trésor sélectionné, et
 * deux lectures du filtre m'ont donné tort. Le filtre était juste ; c'était
 * l'échelle. La BEAC allant jusqu'à quinze ans, l'axe y allait aussi, et notre
 * courbe s'y trouvait extrapolée sur huit ans d'un trait aussi large que le
 * reste. Trois lignes traversaient la figure, et le desk décrivait exactement
 * ce qu'il voyait.
 *
 * Un rendu statique reste sur la vue d'ensemble : on ne peut pas cliquer. Les
 * deux règles qui décident sont donc sorties du composant, et éprouvées
 * directement — c'est le cas d'un Trésor choisi qui avait échappé.
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
    expect(serieBeacDe("tous", releve)).toBeUndefined();
    expect(serieBeacDe("cemac", releve)).toBeUndefined();
  });

  it("ne rend que celle du Trésor affiché", () => {
    const s = serieBeacDe("Cameroun", releve);
    expect(s?.pays).toBe("Cameroun");
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

/** Un Trésor qui s'arrête à sept ans, comme le Cameroun aujourd'hui. */
const pt = (annees: number, pct: number, mot: string) => ({
  id: mot, annees, mot, pct, origine: "imprimé", hypotheses: [], etiquette: mot, abondement: false, mince: false, on: "1 janvier 2026", age: 10, coupon: 0,
});
const paysDe = (pays: string): CourbePays =>
  ({
    pays,
    derniere: "2026-09-15",
    points: [pt(0.25, 6.9, "3 mois"), pt(0.5, 7.1, "6 mois"), pt(1, 7.4, "12 mois"), pt(3, 7.8, "3 ans"), pt(5, 8, "5 ans"), pt(7, 8.2, "7 ans")],
  }) as unknown as CourbePays;
const fenetres: Fenetre[] = [{ jours: 365, mot: "1 an", pays: ["Cameroun", "Congo", "Gabon"].map(paysDe) }];

describe("la figure, telle qu'elle sort", () => {
  const html = renderToStaticMarkup(<CourbeAjustee fenetres={fenetres} ariaLabel="courbe" beacReleve={releve} />);

  it("ne trace aucune ligne discontinue en vue d'ensemble", () => {
    /* Ni BEAC, ni extrapolation : ce sont les trois lignes que le desk voyait. */
    expect(html).not.toMatch(/stroke-dasharray/);
  });

  it("n'extrapole plus notre courbe en la traçant", () => {
    /* Une ligne invite à la lire ; la table porte la valeur, grisée, avec sa
       bande, et c'est là qu'elle appartient. */
    expect(html).not.toMatch(/stroke-dasharray="4 4"/);
  });
});
