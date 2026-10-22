import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const TSX = fs.readFileSync(path.join(ROOT, "src/components/Colonne.tsx"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "src/components/Colonne.module.css"), "utf8");

/**
 * LA COLONNE ESCAMOTÉE SE MONTRE AU SURVOL DU BORD, et trois règles la
 * tiennent. Aucune des trois ne casse un rendu quand elle s'en va : elles se
 * gardent donc ici.
 *
 *   LA POIGNÉE RESTE. Le survol n'existe ni au doigt ni au clavier. En faire
 *   le seul chemin rendrait la navigation inatteignable sur un téléphone et
 *   pour qui tabule.
 *
 *   UNE LISIÈRE ET UN DÉLAI, PAS UN BORD. Deux pixels déclenchés à l'instant
 *   s'ouvrent quand on vise la barre de défilement ou qu'on revient du
 *   bureau.
 *
 *   SURVOLER N'EST PAS CHOISIR. Le coup d'œil ne retient rien : l'état
 *   escamoté reste celui que la personne a posé, et seule la poignée le
 *   change. Sans cela un geste involontaire réécrirait une préférence — le
 *   défaut que le 19 octobre avait corrigé sur le pliage des groupes.
 */
describe("la colonne escamotée se montre au survol du bord", () => {
  it("garde la poignée à côté de la lisière", () => {
    /* Les deux sont rendus par la même branche : la lisière s'ajoute, elle ne
       remplace pas. */
    const branche = TSX.match(/if \(effectif === "escamotee" && !lorgne\)[\s\S]{0,700}?\n    \);/)?.[0] ?? "";
    expect(branche, "la branche escamotée est introuvable").not.toBe("");
    expect(branche, "la poignée a disparu de la branche escamotée").toMatch(/styles\.poignee/);
    expect(branche, "la lisière n'est plus posée à côté d'elle").toMatch(/styles\.lisiere/);
  });

  it("ne pose la lisière que là où le survol existe", () => {
    /* Au doigt, « hover » se simule au premier appui : sans cette requête de
       média, la lisière avalerait le premier geste de chaque page. */
    expect(CSS, "la lisière n'est plus éteinte par défaut").toMatch(/\.lisiere \{\s*display: none;\s*\}/);
    expect(CSS, "elle n'est plus réservée aux pointeurs qui survolent").toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]{0,200}\.lisiere \{[\s\S]{0,200}display: block;/);
  });

  it("attend avant d'ouvrir, et laisse le temps de revenir", () => {
    expect(TSX, "le délai d'entrée a disparu").toMatch(/setTimeout\(\(\) => setLorgne\(true\), 200\)/);
    expect(TSX, "la grâce de sortie a disparu").toMatch(/setTimeout\(\(\) => setLorgne\(false\), 400\)/);
  });

  it("ne retient jamais le coup d'œil", () => {
    /* « retenir » écrit la préférence. Il ne doit pas être appelé depuis les
       deux mains du survol, ni depuis l'effet qui referme la colonne. */
    const mainsDuSurvol = TSX.match(/const entrerAuBord[\s\S]*?const quitterLeBord[\s\S]*?\}, \[\]\);/)?.[0] ?? "";
    expect(mainsDuSurvol, "les deux mains du survol sont introuvables").not.toBe("");
    expect(mainsDuSurvol.includes("retenir"), "le survol écrit la préférence de la personne").toBe(false);
    /* Et l'état du coup d'œil ne part pas dans le stockage. */
    expect(TSX, "« lorgne » n'est plus un simple état de session").toMatch(/const \[lorgne, setLorgne\] = useState\(false\)/);
    expect(TSX.includes("setItem(CLEF_ETAT, lorgne") || TSX.includes("lorgne ? \"escamotee\""), "le coup d'œil se retrouve dans le stockage").toBe(false);
  });
});
