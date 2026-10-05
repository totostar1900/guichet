import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INSTRUMENTS_PAGES, MARCHE_PAGES } from "@/lib/nav-groups";
import { estIci, ongletsDuSiege } from "@/lib/nav-onglets";
import { isInstrumentsSection } from "@/lib/nav-section";

/**
 * UNE LISTE PAR SIÈGE, ET UNE SEULE.
 *
 * La rangée enjambait les deux sièges : un toucher sur « Titres » depuis
 * « /marche » changeait la pastille du dock sans qu'on ait changé de barre.
 * En la rendant complète sur les deux sièges, j'ai créé l'excès inverse : le
 * marché avait déjà ses pastilles sur téléphone et son rail sur écran large,
 * et la rangée y faisait un second bandeau. Mesuré le 5 octobre 2026 sur
 * « /indice » : 93 pixels de navigation empilés avant la page.
 *
 * La règle qui tient les deux : la rangée sert le siège qui n'a rien, donc
 * Instruments, et elle ne paraît nulle part ailleurs.
 */
const sourcesDeLaRoute = (href: string): string => {
  const dir = join(process.cwd(), "src", "app", href.replace(/^\//, ""));
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
};

describe("la rangée d'onglets du siège", () => {
  it("ne liste que ce qui s'achète", () => {
    for (const p of INSTRUMENTS_PAGES) {
      const onglets = ongletsDuSiege(p.href);
      expect(onglets.map((x) => x.key)).toEqual(INSTRUMENTS_PAGES.map((x) => x.key));
      for (const o of onglets) expect(isInstrumentsSection(o.href), o.href).toBe(true);
    }
  });

  /* Le marché a déjà sa liste, deux fois : les pastilles et le rail. */
  it("ne paraît sur aucune page du marché", () => {
    for (const p of MARCHE_PAGES) {
      expect(ongletsDuSiege(p.href), p.href).toEqual([]);
      if (p.href.startsWith("/info")) continue;
      expect(sourcesDeLaRoute(p.href), `${p.href} pose un second bandeau`).not.toContain("<OngletsMarche");
    }
  });

  it("paraît sur les trois pages de son siège", () => {
    for (const p of INSTRUMENTS_PAGES) expect(sourcesDeLaRoute(p.href), p.href).toContain("<OngletsMarche");
  });

  it("allume un onglet exactement sur chacune de ces pages", () => {
    for (const p of INSTRUMENTS_PAGES) {
      const allumes = ongletsDuSiege(p.href).filter((o) => estIci(o, p.href));
      expect(allumes.map((o) => o.key), p.href).toEqual([p.key]);
    }
  });

  /* Une fiche vit sous « /offres », où seul le préfixe « fund- » dit s'il
     s'agit d'un fonds : c'est « nav-section » qui tranche. */
  it("allume l'onglet de la page même quand l'adresse ne la nomme pas", () => {
    const quiEstIci = (path: string) =>
      ongletsDuSiege(path)
        .filter((o) => estIci(o, path))
        .map((o) => o.key);
    expect(quiEstIci("/offres/fund-abc")).toEqual(["fonds"]);
    expect(quiEstIci("/offres/autre")).toEqual(["titres"]);
    expect(quiEstIci("/calendrier")).toEqual(["calendrier"]);
  });
});
