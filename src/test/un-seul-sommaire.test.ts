import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UN SEUL SOMMAIRE DE SECTIONS, ET UNE SEULE PLACE POUR LUI.
 *
 * Inventaire du 24 octobre 2026, mesuré page par page à 1440 px : TROIS
 * composants rendaient « les sections de cette page, celle qu'on lit
 * marquée », et SEPT pages posaient chacune leur grille pour l'accueillir.
 *
 *   largeurs   196 · 210 · 212 · 240 · réglable
 *   seuils     900 · 1040 · 1100 · jamais
 *   côtés      à gauche, à droite, et à gauche après retournement
 *   suivis     trois, déjà divergents : le quart de l'écran pour l'un, le
 *              tiers pour l'autre, et le troisième relisait au défilement
 *
 * Aucun de ces écarts n'était une décision : c'est ce qui arrive quand la
 * mise en page d'une chose vit dans la page plutôt que dans la chose.
 *
 * CES ÉPREUVES TIENNENT LA RÈGLE, pas le code : un sommaire de sections se
 * rend avec `PageOutline`, se place avec `Sommaire`, et ne porte que des
 * ancres de la page.
 */
const ROOT = join(process.cwd(), "src");

const fichiers = (dir: string, suffixe: RegExp): string[] => {
  const out: string[] = [];
  for (const nom of readdirSync(dir)) {
    const p = join(dir, nom);
    if (statSync(p).isDirectory()) out.push(...fichiers(p, suffixe));
    else if (suffixe.test(nom)) out.push(p);
  }
  return out;
};
const rel = (p: string) => p.slice(ROOT.length + 1).replace(/\\/g, "/");
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("un seul sommaire de sections", () => {
  const sources = fichiers(ROOT, /\.tsx$/).map((p) => ({ path: rel(p), text: readFileSync(p, "utf8") }));
  const feuilles = fichiers(ROOT, /\.module\.css$/).map((p) => ({ path: rel(p), text: readFileSync(p, "utf8") }));

  it("trouve bien de quoi lire", () => {
    // Une garde qui ne lit rien passe toujours.
    expect(sources.length).toBeGreaterThan(100);
    expect(feuilles.length).toBeGreaterThan(50);
  });

  /**
   * LES DEUX COMPOSANTS DISPARUS NE REVIENNENT PAS. « RailSections » rendait
   * la même liste avec des numéros et son propre suivi de lecture ;
   * « InfoNav » la rendait au Guide en y mêlant six destinations. Les citer de
   * nouveau, c'est rouvrir les trois.
   */
  it("ne laisse revenir ni RailSections ni InfoNav", () => {
    const revenus = sources.filter((f) => /\bRailSections\b|\bInfoNav\b/.test(sansCommentaires(f.text))).map((f) => f.path);
    expect(revenus, "ces fichiers citent un sommaire qui a fondu dans PageOutline").toEqual([]);
  });

  /**
   * LA PLACE DU SOMMAIRE EST ÉCRITE UNE FOIS. Une page qui redéclare une
   * grille « rail + contenu » a repris la main sur la largeur et le seuil, et
   * c'est ainsi qu'on repasse de un à cinq.
   *
   * LES DEUX EXCEPTIONS SONT NOMMÉES ET ONT LA MÊME RAISON : elles portent
   * TROIS colonnes, et `Sommaire` en pose deux. La note trimestrielle ajoute
   * sa fiche technique à droite de l'article ; Analyses au desk ajoute la
   * colonne de commentaires, et sa poignée règle la largeur du rail parce
   * qu'une table à six colonnes et un commentaire qu'on rédige ne veulent pas
   * de la place au même moment. Toutes deux lisent le jeton de largeur.
   */
  it("ne laisse aucune page redéclarer la grille du sommaire", () => {
    const EXCEPTIONS = ["app/indice/note/[trimestre]/note.module.css", "app/desk/analyses/page.module.css"];
    /* On vise les NOMS que les sept avaient pris, et le jeton de largeur. Pas
       « .cols » tout court : cinq pages du desk l'emploient pour deux colonnes
       de contenu à parts égales, ce qui n'est pas un rail et n'a jamais posé
       de question de place. */
    const coupables = feuilles
      .filter((f) => !EXCEPTIONS.includes(f.path) && f.path !== "components/Sommaire.module.css")
      .filter((f) => /\.(withRail|avecRail|colRail)\s*\{/.test(sansCommentaires(f.text)) || sansCommentaires(f.text).includes("--sommaire-w"))
      .map((f) => f.path);
    expect(coupables, "ces feuilles reposent une grille « rail + contenu » ; elle vit dans Sommaire").toEqual([]);
  });

  it("fait lire le jeton de largeur aux deux exceptions", () => {
    for (const f of feuilles.filter((x) => x.path.endsWith("note.module.css") || x.path === "app/desk/analyses/page.module.css")) {
      expect(f.text, `${f.path} : la largeur du rail n'est plus celle de la maison`).toContain("var(--sommaire-w)");
    }
  });

  /**
   * UN SOMMAIRE NE PORTE QUE DES ANCRES. Les trois navigations du Guide
   * portaient chacune un bloc « Pour aller plus loin » : quatre à six liens
   * vers d'autres pages, dont la colonne de la maison en montrait déjà quatre
   * au même moment, sur le même écran. Un rail dont la moitié mène ailleurs
   * cesse d'être la carte de la page qu'on lit.
   */
  it("ne laisse entrer aucune destination dans le sommaire", () => {
    const outline = readFileSync(join(ROOT, "components/PageOutline.tsx"), "utf8");
    const corps = sansCommentaires(outline.slice(outline.indexOf("export function PageOutline")));
    expect(corps, "le sommaire rend un lien d'application : il ne porte que des ancres").not.toContain("next/link");
    expect(corps.match(/href=\{`#\$\{s\.id\}`\}/), "les entrées du sommaire ne sont plus des ancres de la page").toBeTruthy();
  });
});
