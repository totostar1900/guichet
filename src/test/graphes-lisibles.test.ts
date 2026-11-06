import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * LES GRAPHES ET LES TABLEAUX SE LISENT (6 novembre 2026, planche « 1A · 2A · 3A · 4B »).
 * Mesuré sur La Régionale à 390 px : le texte des graphes faisait 4,7 à 8,1 px (dessins de 720 unités réduits à 324 px), le tableau des chiffres clés rognait l'année 2024, les cartes
 * d'un volet se touchaient et deux graphes d'un même panneau étaient à 0 px l'un de l'autre.
 */
const lire = (p: string) => readFileSync(p, "utf8");
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

const FEUILLES_DE_DESSIN = ["src/components/Charts.module.css", "src/components/GrapheComptes.module.css", "src/components/GrapheDeSerie.module.css", "src/components/CourbeDuCours.module.css", "src/components/IndexVsShare.module.css"];
const DESSINS = ["src/components/Charts.tsx", "src/components/GrapheComptes.tsx", "src/components/GrapheDeSerie.tsx", "src/components/IndexVsShare.tsx"];

describe("le texte d'un dessin se lit en pixels, par des jetons", () => {
  const globals = lire("src/app/globals.css");

  it("les jetons existent et ne descendent pas sous 10 px", () => {
    const texte = Number(/--graphe-texte:\s*([\d.]+)px/.exec(globals)?.[1]);
    const valeur = Number(/--graphe-valeur:\s*([\d.]+)px/.exec(globals)?.[1]);
    expect(texte).toBeGreaterThanOrEqual(10);
    expect(valeur).toBeGreaterThanOrEqual(9.5);
    expect(globals).toMatch(/--graphe-max:\s*\d+px/);
  });

  it("aucune feuille de dessin n'écrit une police de texte de graphe en px", () => {
    for (const f of FEUILLES_DE_DESSIN) {
      const css = sansCommentaires(lire(f));
      // Les règles des classes de texte SVG (tick, graduation, unite, value, annee, lastLabel…) lisent un jeton.
      for (const m of css.matchAll(/\.(tick|tickStrong|value|lastLabel|graduation\w*|unite\w*)\s*\{[^}]*font-size:\s*([^;]+);/g)) {
        expect(m[2], `${f} .${m[1]}`).toMatch(/var\(--graphe-(texte|valeur)\)/);
      }
    }
  });

  it("tous les dessins de lecture partagent la boîte « GRAPHE_L » × « GRAPHE_H »", () => {
    for (const f of DESSINS) {
      const src = sansCommentaires(lire(f));
      expect(src, f).toMatch(/GRAPHE_L/);
      expect(src, f).not.toMatch(/viewBox=["'{`]\s*0 0 (720|680)/);
      expect(src, f).not.toMatch(/const W = (720|680)\b/);
    }
  });

  it("la largeur d'un dessin est plafonnée (le texte reste sous 14 px sur grand écran)", () => {
    for (const f of ["Charts", "GrapheComptes", "GrapheDeSerie", "CourbeDuCours"]) {
      const css = lire(`src/components/${f}.module.css`);
      expect(css, f).toMatch(/max-width:\s*var\(--graphe-max\)/);
    }
    expect(lire("src/components/IndexVsShare.module.css")).toMatch(/max-width:\s*var\(--graphe-max\)/);
  });
});

describe("les écarts d'un volet de société suivent trois niveaux", () => {
  const css = sansCommentaires(lire("src/app/societes/[mnemo]/page.module.css"));
  const corps = lire("src/app/societes/[mnemo]/SocieteBody.tsx");

  it("28 px entre deux cartes d'une colonne, par le jeton", () => {
    expect(css).toMatch(/\.grid > div \{[^}]*display: grid;[^}]*gap: var\(--sections-gap\)/);
  });

  it("20 px entre deux blocs d'une carte, 12 px après un titre", () => {
    expect(css).toMatch(/\.panel \{[^}]*display: grid;[^}]*gap: var\(--bloc-gap\)/);
    expect(css).toMatch(/\.panel > h2 \+ \*[^{]*\{\s*margin-top: calc\(var\(--titre-gap\) - var\(--bloc-gap\)\)/);
    expect(lire("src/app/globals.css")).toMatch(/--bloc-gap:\s*20px/);
  });

  it("« Capitaux propres / total bilan » se sépare des barres par un filet et l'air des blocs", () => {
    expect(css).toMatch(/\.sousBloc \{[^}]*border-top: 1px solid var\(--line\);[^}]*padding-top: var\(--bloc-gap\)/);
    expect(corps).toMatch(/<div className=\{styles\.sousBloc\}>\s*<Majeur etiquette=\{t\("Capitaux propres \/ total bilan/);
  });
});

describe("les tableaux de lecture", () => {
  it("corps 13,2 px, en-tête 11,1 px, première colonne de largeur fixe, dernière année jamais rognée", () => {
    const css = sansCommentaires(lire("src/app/societes/[mnemo]/page.module.css"));
    expect(css).toMatch(/\.tbl \{[^}]*font-size: var\(--t-4\)/);
    expect(css).toMatch(/\.tbl th \{[^}]*font-size: var\(--t-2\)/);
    expect(css).toMatch(/\.tbl th:first-child,\s*\.tbl td:first-child \{[^}]*width: 7\.4rem/);
    expect(css).toMatch(/\.tbl th:last-child,\s*\.tbl td:last-child \{[^}]*padding-right: 0/);
    const seances = sansCommentaires(lire("src/app/offres/[id]/FicheAction.module.css"));
    expect(seances).toMatch(/\.seances \{[^}]*font-size: var\(--t-4\)/);
    expect(seances).toMatch(/\.seances th \{[^}]*font-size: var\(--t-2\)/);
  });

  it("un exercice sans dividende s'écrit « aucun », défini sous le tableau", () => {
    const corps = lire("src/app/societes/[mnemo]/SocieteBody.tsx");
    expect(corps).toMatch(/f\.dividendPerShare === null \? t\("aucun"\)/);
    expect(corps).toMatch(/t\("« aucun » : exercice sans dividende distribué\."\)/);
  });
});

describe("les repères d'un axe ne se chevauchent pas (6 novembre 2026)", () => {
  it("la largeur estimée d'un caractère est celle du texte de 10 px, partagée", () => {
    expect(sansCommentaires(lire("src/lib/ui/graphe.ts"))).toMatch(/export const GRAPHE_CAR = 5\.8;/);
    expect(sansCommentaires(lire("src/lib/ui/axes.ts"))).toMatch(/reperesSansChevauchement\(xs: number\[\], etiquettes: string\[\], px = GRAPHE_CAR, marge = 6\)/);
  });

  it("l'unité d'un axe a sa ligne, au-dessus de la plus haute graduation", () => {
    for (const f of ["src/components/GrapheComptes.tsx", "src/components/GrapheDeSerie.tsx"]) expect(sansCommentaires(lire(f)), f).toMatch(/const haut = 26;/);
    const courbe = sansCommentaires(lire("src/components/CourbeDuCours.tsx"));
    expect(courbe).toMatch(/const y = \(v: number\) => 26 \+/);
    expect(courbe).toMatch(/y=\{volTop - 14\}/);
    expect(courbe).toMatch(/y=\{valTop - 14\}/);
  });

  it("les graduations d'une courbe bornent son axe (la plus haute ne sort pas du dessin)", () => {
    expect(sansCommentaires(lire("src/components/Charts.tsx"))).toMatch(/max = Math\.max\(max, ticks\[ticks\.length - 1\]\);/);
  });
});

describe("un seul « i » par graphe et par tableau", () => {
  const corps = lire("src/app/societes/[mnemo]/SocieteBody.tsx");

  it("le tableau des chiffres clés n'a plus un « i » par ligne : un seul, sur son titre, qui dit tous les termes", () => {
    const debut = corps.indexOf('{t("Chiffres clés certifiés")}');
    const tableau = corps.slice(debut, corps.indexOf("</table>", debut));
    expect(tableau).toMatch(/<Info termes=\{\[revenueTerm, "valeur_ajoutee", "resultat_net", "fonds_propres", "total_bilan", "bnpa", "dividende"\]\}/);
    expect(tableau.match(/<Info /g)?.length).toBe(1);
  });

  it("un titre de graphe qui nomme deux termes les réunit dans un seul « i »", () => {
    expect(corps).toMatch(/<Info termes=\{\[revenueTerm, "resultat_net"\]\}/);
    expect(corps).toMatch(/<Info termes=\{\["fonds_propres", "total_bilan"\]\}/);
    expect(corps).not.toMatch(/<Info term="resultat_net" \/>/);
    expect(corps).not.toMatch(/<Info term="total_bilan" \/>/);
  });

  it("la liste des ratios a son « i » sur le titre, pas un terme-lien par ratio", () => {
    expect(corps).toMatch(/\{t\("Ratios, et comment les lire"\)\} <Info termes=\{a\.ratios\.flatMap/);
    expect(corps).not.toMatch(/<Term term=/);
  });

  it("le composant sait dire plusieurs termes dans une seule fenêtre", () => {
    const info = lire("src/components/Info.tsx");
    expect(info).toMatch(/termes\?: TermKey\[\]/);
    expect(info).toMatch(/<dl className=\{styles\.termes\}>/);
  });
});

