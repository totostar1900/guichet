import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * CE QUE LE LOT A PRODUIT DOIT PARAÎTRE LÀ OÙ LE DESK COMMENCE SA JOURNÉE.
 *
 * Les quatre files du lot des espèces vivaient sur `/desk/encaissements` et
 * `/desk/sante`, où il fallait aller les chercher. Un opérateur ouvre
 * « Aujourd'hui » : une file vraie que personne ne regarde est exactement le
 * défaut que ce lot corrige partout ailleurs, et nous l'avions laissé entrer
 * par la porte de derrière.
 *
 * ELLES RESTENT VISIBLES À ZÉRO, comme les sept autres. La maquette montrait
 * qu'une tuile qui se cache demanderait deux règles à l'écran : les anciennes
 * constantes, les nouvelles intermittentes. La maison a tranché pour
 * l'uniformité, et ce cliquet tient ce choix : si quelqu'un les rend
 * conditionnelles plus tard, ce sera une décision, pas une dérive.
 */
const source = readFileSync("C:/dev/guichet/src/app/desk/today/today.ts", "utf8");

describe("les quatre tuiles du lot des espèces", () => {
  it("sont sur l'accueil du desk", () => {
    for (const clef of ["versements", "ecarts", "temoignages", "robots"]) {
      expect(source, clef).toMatch(new RegExp(`key: "${clef}"`));
    }
  });

  it("mènent chacune à sa file", () => {
    expect(source).toMatch(/key: "versements"[\s\S]{0,400}href: "\/desk\/encaissements"/);
    expect(source).toMatch(/key: "ecarts"[\s\S]{0,400}href: "\/desk\/encaissements"/);
    expect(source).toMatch(/key: "robots"[\s\S]{0,400}href: "\/desk\/sante#robots"/);
  });

  it("ne disparaissent pas à zéro", () => {
    /* Chaque `tiles.push` des quatre est inconditionnel : il vit dans un `try`
       qui le tait si le calcul échoue, jamais derrière un `if` sur le compte.
       Un `if (n)` autour d'un push serait le début des deux règles. */
    const lignes = source.split("\n");
    for (const clef of ["versements", "ecarts", "temoignages", "robots"]) {
      const i = lignes.findIndex((l) => l.includes(`key: "${clef}"`));
      expect(i, clef).toBeGreaterThan(0);
      /* La ligne qui ouvre le push ne porte QUE le push. Mes deux premières
         assertions regardaient les 220 caractères d'avant et laissaient passer
         un « if (n) tiles.push({ » sur une seule ligne : vu en les faisant
         échouer, ce qu'une lecture n'aurait pas montré. */
      expect(lignes[i - 1], clef).toMatch(/^\s*tiles\.push\(\{$/);
    }
  });

  it("disent quelque chose d'utile quand elles sont à zéro", () => {
    /* Une tuile toujours visible doit mériter sa place les jours calmes : « 0 »
       sans phrase occuperait une case pour rien, et c'est le reproche qu'on
       pouvait faire au choix de les garder. */
    for (const phrase of ["aucune demande en attente", "reçu et dû concordent", "aucun témoignage à traiter", "tous ont tourné dans leur cadence"]) {
      expect(source, phrase).toContain(phrase);
    }
  });

  it("peignent l'écart et le témoignage en rouge, le versement en orange", () => {
    /* Un écart est une créance qui reste et un « rien reçu » est une créance à
       poursuivre : les deux appellent quelqu'un. Une demande de versement est
       du travail ordinaire, et la peindre en rouge userait la couleur. */
    expect(source).toMatch(/key: "ecarts"[\s\S]{0,400}tone: ecarts\.length \? "crit"/);
    expect(source).toMatch(/key: "temoignages"[\s\S]{0,400}tone: charges\.length \? "crit"/);
    expect(source).toMatch(/key: "versements"[\s\S]{0,400}tone: demandes\.length \? "warn"/);
  });

  it("ne font pas tomber l'accueil quand une table manque", () => {
    // L'en-tête du fichier le promet : « a tile that cannot be computed is quiet ».
    const i = source.indexOf(`key: "versements"`);
    expect(source.slice(Math.max(0, i - 1200), i)).toMatch(/try \{/);
    expect(source).toMatch(/listTours\(200\)\.catch\(\(\) => \[\]\)/);
    expect(source).toMatch(/listTemoignages\(\)\.catch\(\(\) => \[\]\)/);
  });
});
