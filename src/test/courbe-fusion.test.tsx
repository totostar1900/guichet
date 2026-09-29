import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CourbeFusion } from "@/components/market/CourbeFusion";
import type { CourbePays, Fenetre } from "@/components/market/CourbeInteractive";

/**
 * Deux visions dans une figure : éprouver que ce sont bien deux.
 *
 * La fusion tient à une promesse : les données ne produisent rien, la courbe
 * produit tout. Une promesse pareille se perd sans bruit, par un tracé qui
 * reste allumé d'une vision à l'autre, et le desk lirait alors une déduction
 * là où on lui a dit qu'il voyait un fait.
 *
 * Un rendu statique ne clique pas : c'est pour cela que la vision et le Trésor
 * s'ouvrent en propriété. Le filigrane de la BEAC a coûté trois relectures pour
 * la raison inverse, la figure restant sur la vue d'ensemble que le test
 * atteignait, jamais sur le Trésor choisi qui portait le défaut.
 */

const pt = (annees: number, pct: number, mot: string, extra: Partial<{ mince: boolean; age: number }> = {}) => ({
  id: `${mot}-${pct}`,
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
  ...extra,
});

/** Un Trésor qui porte de quoi ajuster, avec deux séances sur une même durée. */
const garni = (pays: string): CourbePays =>
  ({
    pays,
    plusVieux: 40,
    derniere: "2026-09-15",
    points: [
      pt(0.25, 6.9, "3 mois"),
      pt(0.26, 6.95, "3 mois", { age: 40 }),
      pt(0.5, 7.1, "6 mois"),
      pt(1, 7.4, "1 an"),
      pt(3, 7.8, "3 ans"),
      pt(5, 8, "5 ans"),
      pt(7, 8.2, "7 ans"),
    ],
  }) as unknown as CourbePays;

/** Un Trésor trop maigre : deux durées, et le modèle doit refuser. */
const maigre = (pays: string): CourbePays =>
  ({ pays, plusVieux: 20, derniere: "2026-09-15", points: [pt(1, 9.1, "1 an"), pt(3, 9.6, "3 ans")] }) as unknown as CourbePays;

const fenetres: Fenetre[] = [{ jours: 365, mot: "1 an", pays: [garni("Cameroun"), garni("Gabon"), maigre("Tchad")] }];

const rendu = (p: Partial<Parameters<typeof CourbeFusion>[0]> = {}) =>
  renderToStaticMarkup(<CourbeFusion fenetres={fenetres} ariaLabel="courbe" {...p} />);

/** Les abscisses d'un tracé, dans l'ordre où il les parcourt. */
const traces = (html: string) => [...html.matchAll(/<polyline points="([^"]+)"/g)].map((m) => m[1].split(" ").map((q) => Number(q.split(",")[0])));

describe("les données ne déduisent rien", () => {
  const html = rendu({ visionParDefaut: "faits", tresorParDefaut: "Cameroun" });

  it("ne trace aucune bande de confiance", () => {
    /* Une bande est un intervalle de modèle : elle n'a pas de sens sur des
       observations, et sa seule présence ferait passer l'une pour l'autre. */
    expect(html).not.toMatch(/<polygon/);
  });

  it("ne publie ni coefficients ni durées extrapolées", () => {
    expect(html).not.toMatch(/niveau β₀/);
    expect(html).not.toMatch(/taux instantané/);
  });

  it("dit ce qui a été payé, et le dit sans modèle", () => {
    expect(html).toMatch(/Voici ce que Cameroun a payé/);
    expect(html).toMatch(/aucun modèle n&#x27;intervient/);
  });

  it("garde les séances qui s'empilent sur une même durée", () => {
    /* Sept points pour six durées : l'empilement est un fait, et le compter
       est la seule façon de ne pas le confondre avec une lecture B. */
    expect(html).toMatch(/séances s&#x27;empilent/);
  });

  it("se range du régime publiable, n'ayant rien produit", () => {
    expect(html).toMatch(/observations relues/);
    expect(html).not.toMatch(/produit par un modèle/);
  });
});

describe("la courbe déduit, et le dit", () => {
  const html = rendu({ visionParDefaut: "modele", tresorParDefaut: "Cameroun" });

  it("trace la courbe et sa bande", () => {
    expect(html).toMatch(/<polygon/);
    expect(html).toMatch(/Voici ce que le modèle déduit pour Cameroun/);
  });

  it("montre ses coefficients", () => {
    /* Une courbe ajustée qui ne montre pas ses paramètres demande une confiance
       qu'elle n'a pas méritée. */
    expect(html).toMatch(/niveau β₀/);
    expect(html).toMatch(/taux instantané/);
  });

  it("se range du régime interne, ayant produit un chiffre", () => {
    expect(html).toMatch(/produit par un modèle/);
  });

  it("ne garde qu'une séance par durée", () => {
    /* Les deux séances à trois mois se réduisent à une : sans cela, une durée
       souvent adjugée pèserait autant de fois qu'elle a été adjugée. */
    expect(html).toMatch(/une séance par durée/);
    expect(html).not.toMatch(/séances s&#x27;empilent/);
  });
});

describe("un refus rend la main au lieu de blanchir la page", () => {
  const html = rendu({ visionParDefaut: "modele", tresorParDefaut: "Tchad" });

  it("nomme sa raison", () => {
    expect(html).toMatch(/moins de quatre durées distinctes/);
  });

  it("renvoie vers les données plutôt que de ne rien montrer", () => {
    /* C'est l'argument de la fusion : sans ce renvoi, elle retirerait au Trésor
       le plus maigre la seule figure qu'il avait. */
    expect(html).toMatch(/Voir les données/);
    expect(html).toMatch(/<circle/);
  });
});

/**
 * Une polyligne se trace dans l'ordre de ses points.
 *
 * Trois courbes traversaient la figure d'à côté là où le code n'en dessinait
 * qu'une, les clefs entières d'un objet sortant avant les fractionnaires. La
 * fusion trie ses points, et ce contrôle interdit à la faute de revenir par
 * une autre porte.
 */
describe("aucun tracé ne revient vers la gauche", () => {
  for (const vision of ["faits", "modele"] as const)
    for (const tresor of ["tous", "cemac", "Cameroun", "Tchad"])
      it(`${vision}, ${tresor}`, () => {
        for (const xs of traces(rendu({ visionParDefaut: vision, tresorParDefaut: tresor })))
          expect(xs.some((x, i) => i > 0 && x < xs[i - 1] - 0.05)).toBe(false);
      });
});
