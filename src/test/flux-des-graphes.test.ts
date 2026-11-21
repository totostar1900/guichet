import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pasDesRepères } from "@/components/CompareCharts";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * LES GRAPHES DE FLUX (21 novembre 2026, audit : bulles hors champ, dates superposées, titres invisibles, légende qui nommait un dividende absent).
 */
describe("les repères de date du calendrier des flux", () => {
  it("le pas s'élargit quand la place manque, du mois à vingt ans", () => {
    expect(pasDesRepères(300, 6)).toBe(2);
    expect(pasDesRepères(300, 12)).toBe(1);
    expect(pasDesRepères(900, 5)).toBe(6);
    expect(pasDesRepères(1_800, 5)).toBe(12);
    expect(pasDesRepères(20_000, 4)).toBeGreaterThanOrEqual(120);
    expect(pasDesRepères(10, 2)).toBe(1);
  });
  it("le nombre de repères tient toujours dans la place", () => {
    for (const jours of [30, 200, 400, 800, 1_500, 3_000, 6_000, 12_000]) for (const place of [2, 3, 4, 5, 8, 11]) {
      const pas = pasDesRepères(jours, place);
      expect(Math.ceil(Math.max(1, jours / 30.4) / pas), `${jours} j sur ${place} places`).toBeLessThanOrEqual(place);
    }
  });
});

describe("le calendrier des flux", () => {
  const src = sansNotes(lire("src/components/CompareCharts.tsx"));
  const css = sansNotes(lire("src/components/CompareCharts.module.css"));
  it("le titre d'une ligne suit le thème (il était marine sur marine, invisible en sombre)", () => {
    expect(css).toMatch(/svg \.calLabel \{\s*fill: currentColor;/);
    expect(css).not.toMatch(/calLabel\.a \{\s*fill: var\(--navy\)/);
  });
  it("les barres de chaque ligne suivent aussi le thème (la première était marine sur marine en sombre)", () => {
    expect(css).toMatch(/svg \.inFill \{\s*fill: currentColor;\s*stroke: none;/);
    expect(css).not.toMatch(/\.inFill\.a \{\s*fill: var\(--navy\)/);
    expect(css).not.toMatch(/\.inFill\.b \{\s*fill: #2a8a9a/);
  });
  it("la bulle ne sort pas du cadre : bornée en largeur, son centre est borné des deux côtés", () => {
    expect(src).toMatch(/left: `clamp\(110px, \$\{\(x\(h\.date\) \/ W\) \* 100\}%, calc\(100% - 110px\)\)`/);
    expect(css).toMatch(/\.calTip \{[^}]*max-width: 220px;/);
  });
  it("les premiers et derniers repères s'ancrent dans le cadre au lieu de déborder", () => {
    expect(src).toMatch(/textAnchor=\{x\(d\) < padL \+ 32 \? "start" : x\(d\) > W - 36 \? "end" : "middle"\}/);
  });
  it("la légende ne dit que ce qui est dessiné", () => {
    expect(src).toMatch(/legende\.out && \(/);
    expect(src).toMatch(/legende\.revient\.length > 0 && \(/);
    expect(src).toMatch(/legende\.incertain && \(/);
    expect(src, "la légende nomme encore un dividende en dur").not.toMatch(/<span>\s*<i className=\{styles\.maybeKey\}>■<\/i> \{t\("attendu, pas promis \(dividende\)"\)\}/);
    expect(src).toMatch(/incertainSeulementDividende \? "attendu, pas promis \(dividende\)" : "attendu, pas promis"/);
  });
});

describe("« Comment lire » des pages de comparaison", () => {
  const src = sansNotes(lire("src/components/CompareCharts.tsx"));
  it("passe dans un « i » par carte, plus en paragraphe sous le graphe", () => {
    expect((src.match(/<Info label=\{t\("Comment lire"\)\} contenu=/g) ?? []).length).toBe(4);
    expect(src).not.toMatch(/className=\{styles\.how\}/);
    expect(sansNotes(lire("src/components/Info.tsx"))).toMatch(/contenu \?\? body/);
  });
});

describe("l'échéancier d'un ordre ou d'une ligne, quand il est serré", () => {
  it("garde des repères lisibles et ses titres au lieu de les perdre", () => {
    const f = sansNotes(lire("src/components/FlowsChart.tsx"));
    expect(f).toMatch(/const saut = dense \? Math\.ceil\(pts\.length \/ 6\) : 1;/);
    expect(f).toMatch(/fontSize: dense \? 9\.5 : undefined/);
    expect(f, "le titre du versement disparaît encore dans un échéancier serré").toMatch(/\(!dense \|\| i === 0 \|\| i === pts\.length - 1 \|\| hover === i\) && \(/);
  });
});
