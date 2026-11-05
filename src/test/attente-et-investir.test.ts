import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isInstrumentsSection, isTraderSection } from "@/lib/nav-section";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8");

/**
 * L'ÉCRAN D'ATTENTE ET LE SIÈGE « INVESTIR » (10 novembre 2026).
 *
 * Deux demandes du client sur la lenteur et l'accès aux lignes : un squelette à l'instant du toucher, et un siège du menu du bas qui ouvre Titres, Fonds et Adjudications.
 * La page Trade n'est pas touchée : elle reste la racine de son siège.
 */
describe("l'écran d'attente de toutes les pages", () => {
  const tsx = () => lire("src/app/loading.tsx");
  const css = () => lire("src/app/loading.module.css");
  it("existe à la racine, dit « Chargement de la page » au lecteur d'écran et se pose dans une pile", () => {
    expect(fs.existsSync(path.join(__dirname, "../app/loading.tsx")), "il n'y a plus d'écran d'attente à la racine : un lien ne répond de nouveau qu'après le serveur").toBe(true);
    expect(tsx(), "l'écran d'attente n'est plus un composant client (il lit la langue du contexte)").toMatch(/^"use client";/);
    expect(tsx(), "le texte du lecteur d'écran a disparu").toMatch(/\{t\("Chargement de la page"\)\}/);
    expect(tsx(), "le squelette ne se pose plus dans une pile de la maison").toMatch(/className=\{`pile \$\{styles\.attente\}`\} role="status" aria-busy="true"/);
  });
  it("n'écrit aucun écart ni aucune couleur en dur, et s'arrête pour qui veut moins d'animation", () => {
    const c = css();
    expect(c, "un écart ou une marge est écrit en dur dans le squelette").not.toMatch(/(?:^|\n)\s*(?:margin|gap|padding)[a-z-]*:\s*\d/);
    expect(c, "une couleur est écrite en dur dans le squelette").not.toMatch(/#[0-9a-f]{3,6}\b|rgba?\(/i);
    expect(c, "la pulsation ne s'arrête plus pour moins d'animation").toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?animation: none;/);
    expect(c, "les encadrés ne sont plus en relief").toMatch(/\.carte,\s*\.carteBasse \{[^}]*box-shadow: var\(--shadow\);/);
  });
});

describe("le siège « Investir » du menu du bas", () => {
  const dock = () => lire("src/components/mobile/MobileShell.tsx");
  it("ouvre Titres, Fonds et Adjudications d'un toucher, entre Trade et Marché", () => {
    const d = dock();
    const ordre = [/href: "\/trader", label: t\("Trade"\)/, /href: "\/titres", label: t\("Investir"\)/, /href: "\/marche", label: t\("Marché"\)/].map((r) => d.search(r));
    expect(ordre.every((i) => i > 0), "un des trois sièges a disparu ou changé de mot").toBe(true);
    expect([...ordre].sort((a, b) => a - b), "« Investir » n'est plus entre Trade et Marché").toEqual(ordre);
    expect(d, "« Investir » ne s'allume plus sur les trois familles et leurs fiches").toMatch(/label: t\("Investir"\), icon: I\.investir, match: isInstrumentsSection/);
    expect(d, "Trade s'allume de nouveau sur les familles : deux sièges s'allumeraient ensemble").toMatch(/label: t\("Trade"\), icon: I\.trader, match: isTraderSection/);
  });
  it("Trade ne s'allume que sur sa page, Investir sur les trois familles et leurs fiches", () => {
    for (const p of ["/trader", "/trader/x"]) expect([isTraderSection(p), isInstrumentsSection(p)], p).toEqual([true, false]);
    for (const p of ["/titres", "/fonds", "/calendrier", "/offres/mkt-bhc", "/offres/fund-fcp-ab-avenir"]) expect([isTraderSection(p), isInstrumentsSection(p)], p).toEqual([false, true]);
  });
});
