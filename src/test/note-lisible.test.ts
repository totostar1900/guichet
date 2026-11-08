import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * LA NOTE SE LIT : MARGES, AXES, TON (8 novembre 2026).
 * Cinq choses demandées par le client, gardées une par une : les pages du PDF ne démarrent pas collées au haut de la feuille, chaque graphe a ses axes écrits (page et PDF)
 * à une taille lisible, la ligne de référence a quitté les PDF, la note ne parle pas de ce qui est en cours avec la Bourse, et l'indice montre ce qui s'est échangé et la capitalisation.
 */
const RACINE = process.cwd();
const lire = (f: string) => readFileSync(`${RACINE}/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const FIGURES = lire("src/app/indice/note/[trimestre]/Figures.tsx");
const PAGE = lire("src/app/indice/note/[trimestre]/page.tsx");
const CHARTS = lire("src/lib/documents/pdf/charts.tsx");
const PRIM = lire("src/lib/documents/pdf/primitives.tsx");
const QUARTER = lire("src/lib/documents/pdf/quarter-templates.tsx");
const MONTH = lire("src/lib/documents/pdf/index-templates.tsx");

describe("les marges du PDF", () => {
  it("une bande fixe sous l'en-tête donne le même air à chaque page, pas seulement à la première", () => {
    expect(PRIM, "la bande fixe sous l'en-tête a disparu").toMatch(/<View style=\{s\.gap\} fixed \/>/);
    expect(PRIM, "le corps ne doit plus porter son propre haut de page (il ne vaut que pour la première)").not.toMatch(/body:\s*\{[^}]*paddingTop/);
  });
  it("la ligne « numéro · société · séances du … au … » n'est plus dans les PDF de l'indice", () => {
    for (const [nom, src] of [["trimestrielle", QUARTER], ["mensuelle", MONTH]] as const) {
      expect(src, `la note ${nom} porte encore la ligne de référence`).not.toMatch(/style=\{s\.ref\}/);
      expect(src, `la note ${nom} porte encore « séances du »`).not.toMatch(/séances du \{fmtDate/);
    }
  });
});

describe("les axes des graphes de la note", () => {
  it("la page dessine dans la boîte de 320 unités, avec le texte du jeton, jamais un corps en dur", () => {
    expect(FIGURES).toMatch(/const W = GRAPHE_L/);
    expect(FIGURES, "une boîte de 680 réduit le texte au tiers").not.toMatch(/const W = 6\d\d/);
    expect(FIGURES, "un corps de texte écrit en dur dans un dessin").not.toMatch(/fontSize=\{\d/);
    expect(FIGURES).toMatch(/fontSize: "var\(--graphe-texte\)"/);
    expect(FIGURES).toMatch(/maxWidth: "var\(--graphe-max\)"/);
  });
  it("chaque dessin écrit son axe vertical (unité au-dessus, graduations) ; l'axe des dates porte l'année", () => {
    const dessins = ["IndexCurve", "CapChart", "MonthBars", "WeightBars", "ContribBars", "Comparaison"];
    for (const d of dessins) {
      const corps = FIGURES.slice(FIGURES.indexOf(`export function ${d}(`)).split(/\nexport function /)[0];
      expect(corps, `${d} n'écrit pas ses axes`).toMatch(/<AxeY|Part de la cote|unit/);
    }
    expect(PAGE, "une date d'axe sans son année").toMatch(/const axisDate = \(d: string\) => fmtDate\(d\);/);
  });
  it("le PDF a ses axes : unités écrites, texte d'au moins 8 pt, espaces insécables remplacés", () => {
    expect(CHARTS).toMatch(/const TXT = 8;/);
    const corps = [...CHARTS.matchAll(/fontSize: (\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    expect(Math.min(...corps), "un texte de dessin sous 8 pt").toBeGreaterThanOrEqual(8);
    expect(CHARTS).toMatch(/\\u202f/);
    for (const unite of ["Niveau de l'indice (points)", "Montant échangé", "Transactions par séance", "Capitalisation (", "Part de la cote (%)", "Base 100 au début de la période"]) {
      expect(CHARTS, `l'unité « ${unite} » n'est plus écrite`).toContain(unite);
    }
    expect(CHARTS).toMatch(/AxeDatesPdf/);
  });
});

describe("l'indice montre l'activité et la capitalisation", () => {
  it("la figure 1 de la page et des deux PDF porte le montant échangé et le nombre de transactions ; une figure de capitalisation suit", () => {
    expect(PAGE).toMatch(/<IndexCurve/);
    expect(PAGE).toMatch(/<CapChart/);
    expect(FIGURES).toMatch(/labels\.transactions/);
    expect(QUARTER).toMatch(/<CourbeActivite/);
    expect(QUARTER).toMatch(/<CourbeCapitalisation/);
    expect(MONTH).toMatch(/<CourbeActivite/);
    expect(MONTH).toMatch(/<CourbeCapitalisation/);
  });
});

describe("le ton de la note", () => {
  const TOUT = { page: PAGE, trimestrielle: QUARTER, mensuelle: MONTH };
  it("elle ne parle ni de travaux ni de discussions en cours", () => {
    for (const [nom, src] of Object.entries(TOUT)) {
      expect(src, `${nom} : une mention de travaux en cours`).not.toMatch(/en cours de confirmation|ouvert avec la BVMAC|à confirmer auprès|methodOpen/);
    }
  });
  it("les sections 6 et 7 ne reviennent plus sur ce que l'indice ne mesure pas ni ne dit", () => {
    for (const [nom, src] of Object.entries(TOUT)) {
      expect(src, `${nom} : « ce qu'il ne mesure pas »`).not.toMatch(/ne mesure pas|ne dit pas|Ce n.est pas (une|un)|vrai baromètre/);
    }
  });
  it("la méthode se dit en texte simple : ni encadré, ni titre de méthode", () => {
    expect(PAGE).not.toMatch(/styles\.box|<h3>\{t\("Méthode"\)\}/);
    expect(QUARTER).not.toMatch(/s\.box|>Méthode</);
    expect(PAGE).toMatch(/Comment sont faits les chiffres/);
  });
  it("l'avertissement obligatoire reste", () => {
    expect(PAGE).toMatch(/ne constitue ni un conseil en investissement/);
    expect(QUARTER).toMatch(/ne constitue ni un conseil en investissement/);
    expect(MONTH).toMatch(/ne constitue ni un conseil en investissement/);
  });
});
