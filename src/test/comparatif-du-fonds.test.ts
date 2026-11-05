import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8");
const bloc = (css: string, sel: string) => css.match(new RegExp(`(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

/**
 * L'ONGLET « COMPARATIF » DE LA CARTE « ÉVOLUTION » (11 novembre 2026, planche « Comparatif », option A).
 *
 * Le fonds est classé parmi ceux de SA catégorie, sur la période de la carte, avec les chiffres de la liste des fonds. Il remplace la courbe par des barres, sans rien déplacer.
 */
describe("l'onglet Comparatif d'un fonds", () => {
  const courbe = () => lire("src/components/CourbeDeLaVL.tsx");
  const css = () => lire("src/components/CourbeDuCours.module.css");
  const barres = () => lire("src/components/BarresDeRang.tsx");
  const lecture = () => lire("src/app/offres/[id]/FicheReading.tsx");

  it("compare des fonds de la même catégorie, sur une lecture groupée des courbes, et n'existe pas sans pair", () => {
    const r = lecture();
    expect(r, "les pairs ne sont plus ceux de la même catégorie").toMatch(/const pairsOffres = fonds\.filter\(\(x\) => x\.fund && x\.fund\.category === o\.fund!\.category\);/);
    expect(r, "les courbes des pairs ne sont plus lues d'un seul coup avec celle du fonds").toMatch(/await r\.listFundCurves\(\[o\.fund\.key, \.\.\.pairsOffres\.map\(\(x\) => x\.fund!\.key\)\]\)/);
    expect(r, "un fonds sans pair a de nouveau un onglet vide").toMatch(/if \(pairsOffres\.length > 0\) \{/);
    expect(courbe(), "le bouton « Comparatif » paraît sans pair").toMatch(/\(comparaison \? \[\.\.\.MESURES, COMPARATIF\] : MESURES\)\.map/);
  });
  it("mesure la période comme la liste des fonds : une seule définition, de la pastille aux barres", () => {
    const c = courbe();
    expect(c, "la carte ne calcule plus la période avec la fonction de la liste des fonds").toMatch(/ligneDeComparaison\("moi", "", fundCurveFrom\(series\.map\(\(p\) => \(\{ navDate: p\.date, nav: p\.nav \}\)\)\)\)/);
    expect(c, "la courbe ne part plus de la VL que la mesure retient : « 1 M placés » et la pastille se contredisent").toMatch(/const debut = mesureListe\?\.depuis \?\? lue\.serie\[0\]\?\.d/);
    expect(c, "la pastille n'est plus la performance de la liste").toMatch(/perfPeriode !== undefined && <PastilleVariation v=\{perfPeriode\}/);
    expect(c, "la tuile n'est plus la performance de la liste").toMatch(/\[t\("Performance sur la période"\), perfPeriode !== undefined \? signe\(perfPeriode\)/);
    expect(c, "le classement ne passe plus par la fonction de classement").toMatch(/classer\(comparaison\.moi, comparaison\.pairs, cleComparee\)/);
  });
  it("ne compare que les périodes que la liste mesure : 5 ans et Max sont grisés, et le passage à l'onglet quitte une période non comparable", () => {
    const c = courbe();
    expect(c, "une période non comparable n'est plus grisée dans la liste").toMatch(/disabled: !p\.disponible \|\| \(comparatif && !CLE_DE_PERIODE\[p\.cle\]\)/);
    expect(c, "le passage à « Comparatif » ne quitte plus une période que la liste ne mesure pas pour ce fonds").toMatch(/if \(m === "comparatif" && !mesureDe\(lue\.cle\) && periodeComparable\) setPeriode\(periodeComparable\);/);
    expect(c, "un fonds jeune n'a plus de période comparable choisie dans la liste de celles que la liste mesure").toMatch(/\(\["1a", "debut", "6m", "3m", "2a", "3a"\] as PeriodeCours\[\]\)\.find\(\(k\) => mesureDe\(k\)\)/);
  });
  it("dit le rang dans l'en-tête, avec un rang à la française, et garde la hauteur de la carte", () => {
    const c = courbe();
    expect(c, "l'en-tête du comparatif ne dit plus le rang").toMatch(/valeur=\{rangEcrit\(rang\.rang\)\}/);
    expect(c, "le fonds sans mesure sur la période n'est plus dit sans rang").toMatch(/valeur="—" sous=\{<span>\{t\("Pas assez d'historique sur cette période\."\)\}<\/span>\}/);
    expect(bloc(lire("src/components/BarresDeRang.module.css"), ".zone"), "la zone des barres n'a plus la hauteur de la courbe (rapport 320 × 190)").toMatch(/aspect-ratio: 320 \/ 190;/);
    expect(bloc(css(), ".zoneVide"), "la boîte du comparatif vide n'a plus la hauteur de la courbe").toMatch(/aspect-ratio: 320 \/ 190;/);
    expect(css(), "le commutateur n'a plus de quatrième colonne").toMatch(/\.commutateur\.quatre \{\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  });
  it("mène à la page « Comparer » avec le fonds et le pair touché, le premier par défaut, et ouvre la bulle noire", () => {
    const b = barres();
    expect(b, "le lien ne mène plus à la page « Comparer » avec les deux fonds").toMatch(/href=\{`\/comparer\?a=\$\{encodeURIComponent\(idDuFonds\)\}&b=\$\{encodeURIComponent\(pair\.id\)\}`\}/);
    expect(b, "le pair par défaut n'est plus le premier du classement").toMatch(/const pair = lignes\.find\(\(l\) => l\.id === choisi && !l\.moi\) \?\? lignes\.find\(\(l\) => !l\.moi\);/);
    expect(b, "la bulle noire n'est plus posée sur les barres").toMatch(/<BulleNoire lecture=\{lecture\} x=\{160\} W=\{320\} \/>/);
    expect(b, "le fonds lu n'est plus repéré dans les barres").toMatch(/\$\{l\.moi \? styles\.moi : ""\}/);
  });
});
