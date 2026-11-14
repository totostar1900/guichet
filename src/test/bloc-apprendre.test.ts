import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NB_ECLAIRAGES_ACCUEIL, premiersNonLus } from "@/components/accueil/ListeApprendre";

const lire = (f: string) => readFileSync(f, "utf8");
const huit = Array.from({ length: 8 }, (_, i) => ({ key: `e${i + 1}`, order: i + 1 }));

/**
 * « APPRENDRE » SUR L'ACCUEIL : trois éclairages non lus, EN PLUS de ce qui y est (14 novembre 2026, planche 3A).
 */
describe("le bloc « Apprendre » de l'Accueil", () => {
  it("montre les trois premiers éclairages non lus, dans leur ordre", () => {
    expect(NB_ECLAIRAGES_ACCUEIL).toBe(3);
    expect(premiersNonLus(huit, new Set()).map((l) => l.key)).toEqual(["e1", "e2", "e3"]);
    expect(premiersNonLus(huit, new Set(["e1", "e3"])).map((l) => l.key)).toEqual(["e2", "e4", "e5"]);
  });

  it("n'en montre que deux quand il n'en reste que deux, et se tait quand tout est lu", () => {
    expect(premiersNonLus(huit, new Set(huit.slice(0, 6).map((l) => l.key)))).toHaveLength(2);
    expect(premiersNonLus(huit, new Set(huit.map((l) => l.key)))).toEqual([]);
  });

  it("avant que l'appareil réponde, montre les trois premiers (la page ne saute pas)", () => {
    expect(premiersNonLus(huit, null).map((l) => l.key)).toEqual(["e1", "e2", "e3"]);
  });

  it("vient EN PLUS : « À la une » et la porte vers le Guide restent, et le bloc est posé entre « À la une » et l'inscription", () => {
    const c = lire("src/app/Console.tsx");
    expect(c, "« À la une » a disparu de l'Accueil").toMatch(/titre="À la une" href="\/actualites"/);
    expect(c, "le bloc « Apprendre » n'est pas posé sur l'Accueil").toMatch(/<BlocApprendre \/>/);
    expect(c.indexOf('titre="À la une"'), "« Apprendre » ne suit plus « À la une »").toBeLessThan(c.indexOf("<BlocApprendre />"));
    expect(c.indexOf("<BlocApprendre />"), "« Apprendre » précède de nouveau l'inscription").toBeLessThan(c.indexOf("<TrustNudge />"));
    expect(lire("src/components/NavTabs.tsx"), "la porte « Guide » du menu a disparu").toMatch(/label: "Guide"/);
  });

  it("ne montre que « Lire une ligne » (les huit premiers éclairages), et mène au Guide par « Tout voir »", () => {
    const s = lire("src/components/accueil/BlocApprendre.tsx");
    expect(s, "les éclairages du parcours entrent dans le bloc").toMatch(/filter\(\(l\) => !l\.section\)/);
    expect(s).toMatch(/href="\/info\/eclairages" tout="Tout voir"/);
  });
});
