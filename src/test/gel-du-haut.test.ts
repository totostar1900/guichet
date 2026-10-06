import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CE QUI SE FIGE EN HAUT SE FIGE SOUS CE QUI EST DÉJÀ GELÉ.
 *
 * Audit du 6 octobre 2026. La barre du desk est devenue collante le matin ;
 * l'après-midi, les rails de gauche du Carnet et de « Cotes et VL »
 * disparaissaient en défilant. Ils ne disparaissaient pas : ils passaient
 * DERRIÈRE elle, parce qu'ils se figeaient à une hauteur réglée avant qu'elle
 * ne colle.
 *
 * Le dénombrement a donné TREIZE expressions pour le même bord, dispersées
 * dans autant de feuilles : 78px, 72px, 52px, 0, var(--bar-h), var(--s-7),
 * des calc() à rallonge. Chacune était juste le jour où sa page a été écrite.
 * C'est la maladie des espaces et des tailles, une troisième fois : une
 * valeur sans nom ne se voit pas vieillir.
 *
 * `--gel-desk` est ce bord, et il se mesure : la barre publie sa propre
 * hauteur, qui vaut 136 px à 1 280 pixels de large parce qu'elle tient alors
 * sur trois lignes. Une constante aurait menti aux deux tiers des largeurs.
 *
 * CE CLIQUET NE DEMANDE PAS D'UNIFORMISER LES PAGES, il demande que rien ne
 * se fige en haut du desk sans dire sous quoi.
 */
const ROOT = path.resolve(__dirname, "../..");

/** Les feuilles du desk, plus les rails partagés qui y vivent. */
const feuilles = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".module.css")) out.push(p);
    }
  };
  walk(path.join(ROOT, "src/app/desk"));
  for (const n of ["PageOutline", "RailMarche", "RailSections", "DeskNav"]) out.push(path.join(ROOT, `src/components/${n}.module.css`));
  return out;
};

/**
 * Un décalage acceptable : le bord nommé, la barre collante elle-même (c'est
 * la barre qui s'y pose), ou zéro — zéro ne vise pas la fenêtre mais le
 * conteneur défilant du bloc, ce que fait un en-tête de tableau haut.
 */
const acceptable = (valeur: string) => /--gel-desk|--barre-collante/.test(valeur) || /^0(px)?$/.test(valeur.trim());

interface Ecart {
  fichier: string;
  valeur: string;
}

const horsRepere = (): Ecart[] => {
  const out: Ecart[] = [];
  for (const f of feuilles()) {
    if (!fs.existsSync(f)) continue;
    const css = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* Un bloc de règles à la fois : « position: sticky » et son « top » ne se
       lisent qu'ensemble, et deux règles voisines ne doivent pas se mêler. */
    for (const bloc of css.split("}")) {
      if (!/position:\s*sticky/.test(bloc)) continue;
      const m = /(?:^|[;{\s])top:\s*([^;]+);/.exec(bloc);
      if (!m) continue;
      if (!acceptable(m[1])) out.push({ fichier: path.relative(ROOT, f).replace(/\\/g, "/"), valeur: m[1].trim() });
    }
  }
  return out;
};

describe("le gel du haut, sur les pages du desk", () => {
  it("ne laisse aucun décalage réglé à la main", () => {
    const ecarts = horsRepere();
    expect(
      ecarts.map((e) => `${e.fichier} · top: ${e.valeur}`),
      "un bloc collant du desk doit se poser sous --gel-desk, ou sur zéro s'il colle dans son propre conteneur",
    ).toEqual([]);
  });

  it("et il regarde bien quelque chose", () => {
    // Non vacuité : un chemin faux rendrait zéro écart, et le test serait vert pour rien.
    const avecGel = feuilles().filter((f) => fs.existsSync(f) && /--gel-desk/.test(fs.readFileSync(f, "utf8")));
    expect(feuilles().length, "aucune feuille du desk trouvée").toBeGreaterThan(20);
    expect(avecGel.length, "aucune feuille n'utilise le repère : le motif ne reconnaît plus rien").toBeGreaterThan(6);
  });

  it("le repère est déclaré, et il se mesure au lieu de se deviner", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    expect(css, "--gel-desk doit être déclaré une fois").toMatch(/--gel-desk:\s*calc\(/);
    expect(css, "--desk-bar-h est la part mesurée : sans elle le repère redevient une constante").toMatch(/--desk-bar-h:/);
    const src = fs.readFileSync(path.join(ROOT, "src/components/BarreGelee.tsx"), "utf8");
    expect(src, "la barre doit publier sa hauteur réelle").toContain("--desk-bar-h");
    expect(src, "et la suivre quand elle change de nombre de lignes").toContain("ResizeObserver");
  });
});
