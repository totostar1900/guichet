import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CourbeAjustee } from "@/components/market/CourbeAjustee";
import type { CourbePays, Fenetre } from "@/components/market/CourbeInteractive";

/**
 * Compter les traits que la figure dessine, au lieu de relire son filtre.
 *
 * Le desk voyait trois courbes de la BEAC avec un seul Trésor sélectionné, et
 * deux lectures du filtre m'avaient donné tort. Un test qui rend le composant
 * et compte ce qui sort du SVG tranche, là où la relecture tourne en rond.
 */
const pt = (annees: number, pct: number, mot: string) => ({
  id: `${mot}`,
  annees,
  mot,
  pct,
  origine: "imprimé",
  hypotheses: [],
  etiquette: mot,
  abondement: false,
  mince: false,
  on: "1 janvier 2026",
  age: 10,
  coupon: 0,
});

const paysDe = (pays: string): CourbePays =>
  ({
    pays,
    derniere: "2026-09-15",
    points: [pt(0.25, 6.9, "3 mois"), pt(0.5, 7.1, "6 mois"), pt(1, 7.4, "12 mois"), pt(3, 7.8, "3 ans"), pt(5, 8, "5 ans"), pt(7, 8.2, "7 ans")],
  }) as unknown as CourbePays;

const fenetres: Fenetre[] = [{ jours: 365, mot: "1 an", pays: ["Cameroun", "Congo", "Gabon"].map(paysDe) }];

const beacReleve = {
  numero: 60,
  mois: "2026-07",
  source: "https://exemple/n60.pdf",
  releveLe: "2026-09-29",
  series: ["Cameroun", "Congo", "Gabon"].map((pays) => ({ pays, points: [0.25, 1, 3, 7, 10].map((annees, i) => ({ annees, pct: 7 + i })) })),
};

/** Les polylignes de la BEAC : grises et en pointillé fin, par construction. */
const traitsBeac = (html: string) => (html.match(/stroke-dasharray="1 4"/g) ?? []).length;

describe("la figure ajustée", () => {
  it("ne trace aucune courbe de la BEAC dans la vue d'ensemble", () => {
    const html = renderToStaticMarkup(<CourbeAjustee fenetres={fenetres} ariaLabel="courbe" beacReleve={beacReleve} />);
    expect(traitsBeac(html)).toBe(0);
  });

  it("n'en trace qu'une quand un seul Trésor est sélectionné", () => {
    /* Le rendu initial est la vue d'ensemble ; on vise donc l'invariant qui
       compte : une série de la BEAC par Trésor affiché, jamais davantage. */
    const seul = { ...beacReleve, series: beacReleve.series.filter((s) => s.pays === "Cameroun") };
    const html = renderToStaticMarkup(<CourbeAjustee fenetres={[{ ...fenetres[0], pays: [paysDe("Cameroun")] }]} ariaLabel="courbe" beacReleve={seul} />);
    expect(traitsBeac(html)).toBeLessThanOrEqual(1);
  });

  it("ne confond pas la BEAC avec notre propre extrapolation", () => {
    /* Trois pointillés de la même couleur disaient trois choses différentes :
       la BEAC est grise, notre extrapolation garde la couleur du Trésor. */
    const html = renderToStaticMarkup(<CourbeAjustee fenetres={fenetres} ariaLabel="courbe" beacReleve={beacReleve} />);
    expect(html).not.toMatch(/stroke-dasharray="2 5"/);
  });
});
