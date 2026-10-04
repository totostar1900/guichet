import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INSTRUMENTS_PAGES, MARCHE_PAGES, type NavPage } from "@/lib/nav-groups";
import { estIci, ongletsDuSiege } from "@/lib/nav-onglets";
import { isInstrumentsSection, isMarcheSection } from "@/lib/nav-section";

/**
 * LA RANGÉE D'ONGLETS EST CELLE DU SIÈGE, ET D'UN SEUL.
 *
 * Elle enjambait les deux : un toucher sur « Titres » depuis « /marche »
 * changeait la pastille du dock sans qu'on ait changé de barre. Elle
 * n'existait aussi que sur quatre des neuf pages de la famille, et son dernier
 * onglet menait à une page qui ne la portait pas.
 *
 * Trois choses sont tenues ici : la rangée ne mélange pas deux sièges, elle
 * paraît sur toutes les pages du sien, et un onglet exactement s'y allume.
 */

/** Les pages qui portent une rangée, et le siège attendu de chacune. */
const DU_SIEGE = [
  ...INSTRUMENTS_PAGES.map((p) => ({ p, instruments: true })),
  ...MARCHE_PAGES.filter((p) => !p.guide).map((p) => ({ p, instruments: false })),
];

/** Les fichiers de la route : la rangée peut être posée par la page ou son corps.
    L import ne compte pas, il restait en place quand la pose avait disparu. */
const sourcesDeLaRoute = (href: string): string => {
  const dir = join(process.cwd(), "src", "app", href.replace(/^\//, ""));
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
};

describe("la rangée d'onglets du siège", () => {
  it("ne met jamais dans une rangée une page de l'autre siège", () => {
    for (const { p, instruments } of DU_SIEGE) {
      for (const onglet of ongletsDuSiege(p.href)) {
        expect(isInstrumentsSection(onglet.href), `${p.href} → ${onglet.href}`).toBe(instruments);
        expect(isMarcheSection(onglet.href), `${p.href} → ${onglet.href}`).toBe(!instruments);
      }
    }
  });

  it("paraît sur toutes les pages de son siège, pas seulement quatre", () => {
    for (const { p } of DU_SIEGE) {
      expect(sourcesDeLaRoute(p.href), p.href).toContain("<OngletsMarche");
    }
  });

  it("allume un onglet exactement sur chacune de ces pages", () => {
    for (const { p } of DU_SIEGE) {
      const allumes = ongletsDuSiege(p.href).filter((o) => estIci(o, p.href));
      expect(allumes.map((o) => o.key), p.href).toEqual([p.key]);
    }
  });

  /* Les adresses qu'un préfixe range mal : une fiche, une note, un émetteur. */
  it("allume l'onglet de la page même quand l'adresse ne la nomme pas", () => {
    const quiEstIci = (path: string) =>
      ongletsDuSiege(path)
        .filter((o) => estIci(o, path))
        .map((o) => o.key);
    expect(quiEstIci("/offres/fund-abc")).toEqual(["fonds"]);
    expect(quiEstIci("/offres/autre")).toEqual(["titres"]);
    expect(quiEstIci("/indice/notes")).toEqual(["notes"]);
    expect(quiEstIci("/indice/note/2026-T3")).toEqual(["notes"]);
    expect(quiEstIci("/emetteurs/etat-du-cameroun")).toEqual(["societes"]);
  });

  it("laisse la leçon hors de la rangée, où sa pastille ne s'allumerait jamais", () => {
    const lecon = MARCHE_PAGES.find((p) => p.guide) as NavPage;
    expect(lecon.href).toBe("/info/indice-bvmac");
    expect(ongletsDuSiege("/marche").map((p) => p.key)).not.toContain(lecon.key);
  });
});
