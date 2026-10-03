import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * LES TROIS VUES SE PRÉSENTENT TOUJOURS DANS LE MÊME ORDRE.
 *
 * Le sélecteur « Tableau · Liste · Cartes » de la page Titres existe à deux
 * endroits : la barre d'outils, qui disparaît sous 760 px, et la feuille de
 * filtres, qui est alors le seul chemin. Les deux listes étaient écrites à la
 * main et dans l'ordre inverse l'une de l'autre, chacune mettant sa vue par
 * défaut en tête.
 *
 * CE N'EST PAS UNE COQUETTERIE : un téléphone fait 390 px debout et 844 px
 * couché, donc il traverse la bascule des 760. On tourne l'appareil, les trois
 * boutons sont dans l'autre sens, et le geste appris choisit une autre vue.
 * Mesuré le 4 octobre 2026 sur la page Titres.
 *
 * Deux cliquets, parce que ce sont deux dérives différentes : une page qui
 * réécrit l'ordre chez elle, et deux pages qui ne s'accordent plus.
 */
const SOURCES = ["src/components/OfferBrowser.tsx", "src/app/fonds/FundsBrowser.tsx"] as const;
const lire = (f: string): string => readFileSync(`C:/dev/guichet/${f}`, "utf8");

/** Les tableaux littéraux qui énumèrent les trois vues, où qu'ils soient. */
const ordres = (s: string): string[][] => [...s.matchAll(/\[\s*((?:"(?:table|list|cards)"\s*,\s*){2}"(?:table|list|cards)")\s*\]/g)].map((m) => m[1].split(",").map((x) => x.trim().replace(/"/g, "")));

describe("le sélecteur de vue de la page Titres", () => {
  const source = lire("src/components/OfferBrowser.tsx");

  it("n'écrit l'ordre des vues qu'une fois", () => {
    /* Deux listes écrites à la main peuvent diverger sans que rien ne le dise :
       c'est exactement ce qui s'était passé. Une seule constante, deux lecteurs. */
    expect(ordres(source)).toEqual([["table", "list", "cards"]]);
  });

  it("sert ses deux emplacements depuis cette liste", () => {
    // La barre d'outils et la feuille de filtres : ni l'une ni l'autre ne réénumère.
    expect(source.split("VIEWS.map(").length - 1).toBe(2);
  });

  it("ne refabrique pas les étiquettes au passage", () => {
    /* `v === "table" ? "Tableau" : …` recopié à chaque emplacement est la forme
       qu'avait la dérive : une table nommée se corrige en un endroit. */
    expect(source).not.toMatch(/\?\s*"Tableau"/);
    expect(source).toContain('const VIEW_LABEL: Record<View, string> = { table: "Tableau", list: "Liste", cards: "Cartes" };');
  });
});

describe("toutes les pages qui offrent ces vues", () => {
  it("les présentent dans le même ordre", () => {
    /* Titres et Fonds portent le même sélecteur. Qu'ils divergent coûterait la
       même chose qu'une page qui diverge d'elle-même, et se verrait encore
       moins : il faut passer de l'une à l'autre pour s'en apercevoir. */
    const vus = SOURCES.flatMap((f) => ordres(lire(f)).map((o) => [f, o.join(" · ")] as const));
    expect(vus.length, "aucune page ne liste les trois vues : le cliquet ne regarde plus rien").toBeGreaterThan(1);
    expect(new Set(vus.map(([, o]) => o)).size, `ordres trouvés :\n  ${vus.map(([f, o]) => `${f} : ${o}`).join("\n  ")}`).toBe(1);
  });
});
