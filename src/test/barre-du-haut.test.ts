import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COMPANY } from "@/lib/config";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code, pas ce qu'on en dit : ces fichiers citent justement la marque dans
   leurs commentaires, pour expliquer pourquoi elle n'y est plus. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const BARRE = "src/components/mobile/MobileShell.tsx";
const FEUILLE = "src/components/mobile/MobileShell.module.css";

/**
 * LA BARRE DU HAUT DU TÉLÉPHONE, APRÈS LE 24 OCTOBRE 2026.
 *
 * Elle portait « PURPOSE CAPITAL · Guichet » sur le tiers gauche de tous les
 * sièges du dock, c'est-à-dire sur l'écran le plus étroit de la maison, pour
 * dire au client ce qu'il sait déjà : chez qui il est. Elle porte maintenant
 * le nom de la PAGE, et le cède au `h1` tant qu'il est à l'écran.
 */
describe("la barre du haut", () => {
  it("ne nomme plus la maison là où la place manque", () => {
    const src = code(BARRE);
    expect(src, "la marque est revenue en littéral dans la barre du téléphone").not.toMatch(/PURPOSE\s+CAPITAL/i);
    expect(src, `« ${COMPANY.name} » est revenu dans la barre du téléphone`).not.toContain(COMPANY.name);
    expect(code(FEUILLE), "les mesures de la marque sont restées dans la feuille").not.toContain(".brand");
  });

  /* ET ELLE SE NOMME TOUJOURS, SINON C'EST UNE AUTRE FAUTE. Retirer un nom
     d'un endroit trop étroit est une chose ; le retirer de partout en est une
     autre.
     CETTE ÉPREUVE DISAIT « au pied de chaque page », ET C'ÉTAIT INEXACT :
     le pied réglementaire ne paraît qu'à qui n'est PAS entré. Pour un
     visiteur, c'est lui qui porte la raison sociale, l'agrément et
     l'adresse ; pour un client, c'est l'enseigne de l'écran large, qui nomme
     la maison sans plus y mener — la navigation a son siège « Accueil ».
     Les deux publics sont donc vérifiés séparément. */
  it("laisse la maison se nommer au visiteur, dans le pied réglementaire", () => {
    const layout = lire("src/app/layout.tsx");
    expect(layout, "le pied de page ne nomme plus la société").toContain("COMPANY.legalName");
    expect(layout, "l'agrément a quitté le pied de page").toContain("COMPANY.licence");
  });

  it("laisse la maison se nommer au client, dans l'enseigne de l'écran large", () => {
    const layout = code("src/app/layout.tsx");
    expect((layout.match(/COMPANY\.name\.toUpperCase\(\)/g) ?? []).length, "l'enseigne ne nomme plus la maison sur l'écran large : un client ne la lirait plus nulle part").toBeGreaterThanOrEqual(2);
  });

  /* ET ELLE N'Y MÈNE PLUS, POUR UN CLIENT. L'onglet « Accueil » de la barre
     large et le groupe « Accueil » de la colonne portent déjà la racine :
     une enseigne qui y mène aussi donne deux cibles pour une destination,
     à quelques dizaines de pixels l'une de l'autre. C'est le défaut que la
     barre du téléphone s'est fait retirer, où l'enseigne menait à « / »
     depuis « / ». */
  it("ne fait plus de l'enseigne une seconde porte vers la racine", () => {
    const layout = code("src/app/layout.tsx");
    for (const classe of ["styles.brand", "styles.marque"]) {
      const i = layout.indexOf(`<span className={${classe}}>`);
      expect(i, `l'enseigne « ${classe} » n'a plus de variante muette pour le client`).toBeGreaterThan(0);
      /* La variante muette est bien choisie quand une session existe. */
      expect(layout.slice(Math.max(0, i - 220), i), `l'enseigne « ${classe} » ne dépend plus de la session`).toMatch(/session \?/);
    }
  });

  /* LE DÉCALAGE D'UNE COLONNE, qu'on ne voit que sur un siège du dock.
     La barre est une grille de trois colonnes — retour, titre, icônes — et
     la flèche ne paraît pas sur une racine, qui n'a pas de parent. Sans
     place écrite, le placement automatique rangerait alors le titre en
     première colonne et les icônes en deuxième. */
  it("écrit la place de chaque pièce, pour le jour où la flèche manque", () => {
    const css = lire(FEUILLE);
    const bloc = (nom: string) => css.match(new RegExp(`\\.${nom}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
    expect(bloc("title"), "le titre n'a plus de colonne : sans flèche il glisse à gauche").toMatch(/grid-column:\s*2/);
    expect(bloc("right"), "les icônes n'ont plus de colonne : sans flèche elles glissent d'un cran").toMatch(/grid-column:\s*3/);
  });

  /* UNE RACINE N'A PAS DE PARENT. La flèche y renverrait au hasard de
     l'historique, ou nulle part. */
  it("ne pose la flèche de retour que là où l'on peut remonter", () => {
    expect(code(BARRE), "la flèche de retour n'est plus conditionnée à la racine").toMatch(/\{!isRoot && \(/);
  });
});
