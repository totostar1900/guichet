import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { controlesOfferts, sensNaturel, triEffectif, type FaitsDeLigne } from "@/lib/domain/controles";

const lire = (f: string) => readFileSync(f, "utf8");
const ligne = (o: Partial<FaitsDeLigne>): FaitsDeLigne => ({ deadline: false, coupon: false, tenor: false, yield: false, variation: false, minimum: true, famille: "ACTION", pays: "Gabon", statut: "quoted", ...o });
const action = (o: Partial<FaitsDeLigne> = {}) => ligne({ yield: true, variation: true, ...o });
const obligation = (o: Partial<FaitsDeLigne> = {}) => ligne({ deadline: true, coupon: true, tenor: true, yield: true, famille: "OTA", statut: "open", ...o });

/**
 * LES CONTRÔLES D'UNE LISTE SUIVENT LA SÉLECTION (14 novembre 2026) : une action n'a ni coupon, ni clôture, ni échéance.
 */
describe("une sélection d'actions n'offre que ce que les actions ont", () => {
  const o = controlesOfferts([action(), action({ pays: "Cameroun" })]);

  it("pas de tri par coupon, par clôture, par échéance ; la variation, le rendement et le nom y sont", () => {
    for (const k of ["deadline", "coupon", "tenor"] as const) expect(o.tris, `« ${k} » est offert sur des actions`).not.toContain(k);
    for (const k of ["variation", "yield", "minimum", "title", "issuer"] as const) expect(o.tris).toContain(k);
  });

  it("pas de colonne clôture, échéance ni durée ; la variation s'ajoute", () => {
    expect(o.colonnes).toEqual({ deadline: false, yield: true, tenor: false, minimum: true, variation: true });
  });

  it("pas de filtre durée, ni de statut quand toutes sont cotées, ni d'instrument quand il n'y en a qu'un ; le pays reste quand il y en a deux", () => {
    expect(o.filtres).toEqual({ instrument: false, pays: true, statut: false, duree: false, rendement: true });
  });

  it("la variation est le tri par défaut, du plus haut au plus bas", () => {
    expect(triEffectif(null, o)).toBe("variation");
    expect(sensNaturel("variation")).toBe("desc");
  });
});

describe("une sélection d'obligations garde les contrôles d'aujourd'hui, sans la variation", () => {
  const o = controlesOfferts([obligation(), obligation({ statut: "closed", pays: "Cameroun" })]);

  it("les tris, colonnes et filtres des obligations", () => {
    expect(o.tris).toEqual(["deadline", "yield", "coupon", "tenor", "minimum", "title", "issuer"]);
    expect(o.colonnes).toEqual({ deadline: true, yield: true, tenor: true, minimum: true, variation: false });
    expect(o.filtres).toEqual({ instrument: false, pays: true, statut: true, duree: true, rendement: true });
  });

  it("la clôture est le tri par défaut", () => {
    expect(triEffectif(null, o)).toBe("deadline");
    expect(sensNaturel("deadline")).toBe("asc");
  });
});

describe("une sélection mêlée offre l'union, et une sélection vide garde tout", () => {
  it("actions et obligations ensemble : tout, variation comprise ; l'instrument se choisit", () => {
    const o = controlesOfferts([action(), obligation()]);
    expect(o.tris).toHaveLength(8);
    expect(o.colonnes.variation).toBe(true);
    expect(o.filtres.instrument).toBe(true);
  });

  it("aucune ligne : tous les contrôles, rien ne se vide pour une section en attente", () => {
    const o = controlesOfferts([]);
    expect(o.filtres).toEqual({ instrument: true, pays: true, statut: true, duree: true, rendement: true });
    expect(o.tris).toContain("deadline");
  });
});

describe("le tri demandé par l'adresse", () => {
  const actions = controlesOfferts([action()]);

  it("un tri que la sélection n'offre pas est ignoré, au lieu de ranger sur du vide", () => {
    expect(triEffectif("coupon", actions)).toBe("variation");
    expect(triEffectif("n'importe quoi", actions)).toBe("variation");
  });

  it("un tri offert est suivi", () => {
    expect(triEffectif("title", actions)).toBe("title");
  });

  it("sans clôture, sans variation ni rendement : le nom", () => {
    expect(triEffectif(null, controlesOfferts([ligne({ famille: "FONDS" })]))).toBe("title");
  });
});

describe("la liste lit ces contrôles, et seulement la section et l'instrument les fixent", () => {
  const src = lire("src/components/OfferBrowser.tsx");
  const debut = src.indexOf("const dispo = useMemo");
  const bloc = src.slice(debut, src.indexOf("const sort: SortKey", debut));

  it("la sélection ne compte ni le pays, ni le statut, ni la recherche : un filtre posé ne doit pas faire disparaître son propre contrôle", () => {
    expect(bloc).toMatch(/sectionDe\(o\) === sectionChoisie/);
    expect(bloc).toMatch(/kind\.has\(offerFamily\(o\)\)/);
    expect(bloc, "le pays ou le statut fixent la sélection des contrôles").not.toMatch(/country\.|status\.|tenor\.|fold\(q/);
  });

  it("le tri offert, les filtres, la feuille, les jauges et les colonnes passent par les contrôles offerts", () => {
    expect(src).toMatch(/options: dispo\.tris\.map/);
    for (const f of ["instrument", "pays", "statut", "duree", "rendement"]) expect(src, `le filtre « ${f} » ne suit pas la sélection`).toMatch(new RegExp(`dispo\\.filtres\\.${f}`));
    expect(src).toMatch(/groups\.filter\(\(g\) => dispo\.filtres/);
    expect(src).toMatch(/cols=\{dispo\.colonnes\}/);
    expect(src, "la liste des tris est encore écrite en dur").not.toMatch(/options: \(Object\.keys\(SORT_LABEL\)/);
  });

  it("un filtre déjà posé reste offert, pour qu'on puisse le défaire", () => {
    expect(src).toMatch(/dispo\.filtres\.instrument \|\| kind\.size > 0/);
    expect(src).toMatch(/dispo\.filtres\.pays \|\| country\.size > 0/);
    expect(src).toMatch(/dispo\.filtres\.statut \|\| status\.size > 0/);
    expect(src).toMatch(/dispo\.filtres\.duree \|\| tenor\.size > 0/);
  });

  it("le tableau compte ses colonnes au lieu de supposer huit", () => {
    expect(src).not.toMatch(/colSpan=\{8\}/);
    expect(src).toMatch(/colSpan=\{nbCols\}/);
  });

  it("une ligne sans échéance le dit, au lieu d'un tiret seul", () => {
    expect(src).toMatch(/t\("sans échéance"\)/);
    expect(src).toMatch(/t\("non connue"\)/);
  });
});
