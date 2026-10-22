import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const lire = (p: string): string => fs.readFileSync(path.join(ROOT, p), "utf8");

/**
 * DEUX RANGÉES SE FIGENT DANS CE TABLEAU, ET ELLES NE SE FIGENT PAS AU MÊME
 * ENDROIT.
 *
 * La tête de colonnes vit dans le « thead ». Le titre de section est une
 * rangée pleine largeur du CORPS, et c'est un « th » lui aussi (« .secRow th »,
 * un « th colSpan=8 », parce que le tableau n'a pas deux façons de nommer un
 * groupe). Une règle écrite « .table th » les attrape donc toutes les deux :
 * même « top », même z-index, et les deux bandes se superposaient au pixel
 * près. Signalé à l'écran le 22 octobre 2026 sur « /calendrier » et
 * « /titres » : la bande dorée d'une section paraissait traversée par le
 * tableau.
 *
 * LE DÉCALAGE NE S'ÉCRIT PAS EN DUR NON PLUS. « --header-h: 62px » vivait dans
 * la feuille de la liste et ne connaissait qu'une des trois mises en page.
 * Mesuré en 1440 px, où la barre du haut n'existe plus et où « --bar-h » vaut
 * zéro : la tête se figeait à 62 px sous un vide, et les lignes défilaient à
 * découvert dans la bande laissée au-dessus d'elle. « --barre-collante »
 * (globals.css) est la seule mesure qui connaisse les trois.
 *
 * Rien de tout cela ne se voit en développement sur un écran moyen, et aucun
 * rendu n'échoue. D'où ces quatre épreuves.
 */
describe("la pile collante du tableau des offres", () => {
  const CSS = lire("src/components/OfferBrowser.module.css");

  it("ne fige pas tous les « th » d'un seul coup", () => {
    /* La règle large attraperait le titre de section avec la tête de
       colonnes. On vérifie que « .table th » ne porte plus de position. */
    const bloc = CSS.match(/\.table th \{[^}]*\}/)?.[0] ?? "";
    expect(bloc, "le bloc « .table th » est introuvable").not.toBe("");
    expect(bloc.includes("position: sticky"), "« .table th » fige de nouveau toutes les rangées, titres de section compris").toBe(false);
  });

  it("fige la tête de colonnes sous la barre, et sous elle seule", () => {
    expect(CSS, "la tête de colonnes ne se cale plus sur « --barre-collante »").toMatch(/\.table thead th \{[^}]*top: var\(--barre-collante\);/);
  });

  it("range le titre de section SOUS la tête de colonnes", () => {
    /* La tête nomme les colonnes qu'on lit : elle ne disparaît jamais, et le
       titre de section passe dessous en s'en allant. */
    expect(CSS, "le titre de section ne se range plus sous la hauteur déclarée de la tête").toMatch(/\.secRow th \{[^}]*top: calc\(var\(--barre-collante\) \+ var\(--entete-h\)\);/);
    const tete = CSS.match(/\.table thead th \{[^}]*\}/)?.[0] ?? "";
    const section = CSS.match(/\.secRow th \{[^}]*\}/)?.[0] ?? "";
    const z = (b: string) => Number(b.match(/z-index: (\d+)/)?.[1] ?? "0");
    expect(z(tete) > z(section), "le titre de section repasse au-dessus de la tête de colonnes").toBe(true);
  });

  it("déclare la hauteur de la tête plutôt que de la deviner", () => {
    /* La leçon de la bande des fonds : sept pixels d'écart laissaient voir
       les cartes défiler entre la bande et le titre. Une hauteur dont un
       autre étage dépend se déclare, et l'étage la reçoit. */
    expect(CSS, "« --entete-h » n'est plus déclarée").toMatch(/--entete-h: \d+px;/);
    expect(CSS, "la tête ne vaut plus la hauteur qu'elle déclare").toMatch(/\.table thead th \{[^}]*height: var\(--entete-h\);/);
    /* Hors commentaires : la note qui raconte pourquoi « --header-h » est
       parti le nomme forcément, et elle a le droit de le nommer. */
    const sansNotes = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(sansNotes.includes("--header-h"), "« --header-h », le 62 px codé en dur, est revenu").toBe(false);
  });
});
