import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENTS } from "@/lib/config";
import { FAMILLE_BOOT, familleDe } from "@/lib/famille";

const lire = (f: string) => readFileSync(f, "utf8");
const sansNotes = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * L'ACCENT D'UNE FAMILLE, EN UN MOT (21 novembre 2026, planche « Marché en bleu », 1A · 2A · 3A · 4A).
 *
 * Le Marché passe de l'or au bleu par UN mot de configuration (`ACCENTS.marche`). « or » le rend tel qu'il était, sans toucher une page : c'est la promesse « défaire en un prompt », et ce fichier la garde. Les changements de structure (titres à plat, porte des séances) se défont par le dépôt, pas par ce mot.
 */
describe("la famille « marché »", () => {
  it("couvre les six pages de la navigation, et pas les adjudications ni le reste", () => {
    for (const ok of ["/marche", "/indice", "/indice/notes", "/societes", "/societes/bhc", "/emetteurs", "/actualites", "/comparer"]) expect(familleDe(ok), ok).toBe("marche");
    for (const non of ["/", "/titres", "/fonds", "/calendrier", "/activite", "/aide", "/marche/adjudications", "/moi/compte", "/parametres"]) expect(familleDe(non), non).toBeNull();
  });
  it("le script du <head> lit les mêmes préfixes que la navigation", () => {
    const run = (path: string) => {
      const attrs: Record<string, string> = {};
      const root = { setAttribute: (k: string, v: string) => (attrs[k] = v), removeAttribute: (k: string) => delete attrs[k] };
      new Function("location", "document", FAMILLE_BOOT)({ pathname: path }, { documentElement: root });
      return attrs["data-famille"] ?? null;
    };
    for (const p of ["/marche", "/indice/note/2026-t3", "/societes/bhc", "/comparer"]) expect(run(p), p).toBe("marche");
    for (const p of ["/", "/titres", "/marche/adjudications", "/activite"]) expect(run(p), p).toBeNull();
  });
});

describe("l'accent bleu du Marché", () => {
  const css = sansNotes(lire("src/app/globals.css"));
  it("est choisi par UN mot, lu par la mise en page et par la feuille de style", () => {
    expect(ACCENTS.marche).toBe("bleu");
    expect(sansNotes(lire("src/app/layout.tsx"))).toMatch(/data-accent-marche=\{ACCENTS\.marche\}/);
    expect(sansNotes(lire("src/app/layout.tsx"))).toMatch(/__html: FAMILLE_BOOT/);
    expect(css).toMatch(/html\[data-accent-marche="bleu"\]\[data-famille="marche"\] :is\(main, \[aria-current="page"\]\) \{\s*--gold: var\(--info\);\s*--gold-ink: var\(--info\);\s*--gold-soft: var\(--info-soft\);/);
  });
  it("ne se pose QUE quand le mot est « bleu » : « or » retire tout le bloc", () => {
    const blocs = css.match(/[^{}]*data-famille="marche"[^{}]*\{[^}]*\}/g) ?? [];
    expect(blocs.length).toBeGreaterThanOrEqual(3);
    for (const b of blocs) expect(b, "un bloc de la famille ne dépend plus du mot").toMatch(/data-accent-marche="bleu"/);
  });
  it("laisse l'or à la barre du haut et au bouton flottant : seuls le contenu et l'entrée de menu active sont touchés", () => {
    for (const b of css.match(/[^{}]*data-famille="marche"[^{}]*\{/g) ?? []) {
      expect(b, "le bleu a quitté « main » et l'entrée active").toMatch(/:is\(main, \[aria-current="page"\]\)/);
      expect(b, "le bleu touche la barre du haut").not.toMatch(/\bheader\b|BarreDuHaut|MarketFab/);
    }
  });
  it("le bouton principal et les segments ne passent au bleu qu'en sombre (en clair ils sont marine)", () => {
    const sombre = css.match(/\[data-theme="dark"\] :is\(main, \[aria-current="page"\]\) \{[^}]*\}/)?.[0] ?? "";
    expect(sombre).toMatch(/--fill: var\(--info\);/);
    expect(sombre).toMatch(/--select: var\(--info\);/);
  });
});

describe("le Marché sans « Ce qui s'est échangé »", () => {
  const page = lire("src/app/marche/page.tsx");
  it("n'a plus la carte, ni la phrase « Les N autres », ni son mot dans l'en-tête", () => {
    expect(page).not.toMatch(/id="echanges"/);
    expect(page).not.toMatch(/Les \{n\} autres, et toutes/);
    expect(page).not.toMatch(/ce qui s'est échangé/);
  });
  it("garde une porte vers le tableau des séances, au pied de la carte de l'indice", () => {
    expect(page).toMatch(/seances=\{\{ href: "\/indice#seances"/);
    expect(lire("src/components/IndexPulse.tsx")).toMatch(/seances && !pied && !aPlat/);
  });
  it("ses sections ont le titre de l'Accueil, à plat, au-dessus de la carte", () => {
    expect((page.match(/<TitreDeBloc /g) ?? []).length).toBe(6);
    expect(page).not.toMatch(/className="panel-h"/);
  });
});
