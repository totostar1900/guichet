import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "../..");
const lire = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/* Le code sans ce qu'on en dit : ce fichier-ci cite dans ses commentaires les
   classes dont il explique le placement, et une épreuve qui les compterait
   compterait les explications avec elles. */
const code = (p: string) =>
  lire(p)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const TSX = "src/components/IntentForm.tsx";
const CSS = "src/components/IntentForm.module.css";

/**
 * LE CHIFFRE QU'ON TAPE, ET LA CONDITION QU'ON Y MET — RELEVÉ LE 29 OCTOBRE 2026.
 *
 * Le formulaire d'ordre a QUATRE rendus du montant : le trio du marché, le
 * trio de l'adjudication, le champ seul, et la condition du sondage. Le
 * reproche d'origine portait sur un corps plus petit que celui qu'on lit, et
 * il a d'abord été réparé sur UN seul des quatre — mesuré à l'écran le même
 * jour : la limite du marché à 15 px, celle de l'adjudication encore à 12.
 *
 * Un défaut réparé dans une branche et laissé dans les trois autres ne se
 * voit pas : chaque branche a son produit, et personne ne les ouvre côte à
 * côte. D'où ces épreuves, qui tiennent la règle pour TOUTES les branches
 * plutôt que pour celle qu'on avait sous les yeux.
 */
describe("le chiffre qu'on tape", () => {
  /* LA CONDITION SE LIT AU CORPS, PARTOUT. Trois champs portent « limitPrice »
     — le marché, l'adjudication, le sondage —, et c'est sur l'adjudication
     qu'il décide le plus : il dit à quel niveau la demande tient encore. */
  it("donne le même corps à la limite dans chacune de ses branches", () => {
    const src = code(TSX);
    const morceaux = src.split(/<label\b/).filter((m) => /name="limitPrice"/.test(m));
    // Non-vacuité : s'il n'en restait aucun, l'épreuve passerait sans rien tenir.
    expect(morceaux.length, "plus aucun champ de limite dans le formulaire").toBeGreaterThanOrEqual(3);
    for (const m of morceaux) {
      const entete = m.slice(0, m.indexOf("name=\"limitPrice\""));
      expect(entete, `une limite est revenue sans « styles.limite » : ${entete.slice(0, 80).trim()}`).toMatch(/styles\.limite/);
    }
  });

  /* LE NEUVIÈME DEGRÉ EST CELUI DU CHIFFRE QU'ON ÉCRIT DE SA MAIN, et de rien
     d'autre. S'il servait ailleurs, il cesserait de dire « c'est ici que vous
     tapez » : c'est sa rareté qui le fait lire. */
  it("ne donne le neuvième degré qu'au chiffre qu'on tape", () => {
    const css = lire(CSS).replace(/\/\*[\s\S]*?\*\//g, "");
    // La classe en tête du sélecteur, quoi qu'il porte derrière : « .x input »,
    // « .x input[type="number"] », « .x:focus ».
    const porteurs = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter((m) => /--t-9/.test(m[2]))
      .map((m) => (m[1].match(/\.([\w-]+)/) || [])[1]);
    expect(porteurs, "le neuvième degré a quitté le champ qu'on tape").toContain("chiffreTape");
    expect(new Set(porteurs).size, `le neuvième degré sert à plus d'une classe : ${[...new Set(porteurs)].join(", ")}`).toBe(1);
  });

  /* LES QUATRE RENDUS DU MONTANT PORTENT LA MÊME CARTE. Sans elle, le chiffre
     redevient un champ parmi les champs, et c'est ce qu'on reprochait. */
  it("pose la carte du chiffre sur chacun des rendus du montant", () => {
    const src = code(TSX);
    const cartes = (src.match(/styles\.carteDuChiffre/g) || []).length;
    expect(cartes, "un rendu du montant a perdu sa carte").toBeGreaterThanOrEqual(3);
  });

  /* LES DEUX NOTES DU TRIO PRENNENT L'ÉCHELLE. Elles étaient à 0,7 rem, hors
     de l'échelle : plus petites que tout ce que la maison écrit, et posées
     sous le champ qui engage l'argent. L'épreuve ne juge que celles-là — la
     feuille en porte d'autres, plus anciennes, qui n'étaient pas la demande. */
  it("écrit les deux notes du chiffre dans l'échelle de la maison", () => {
    const css = lire(CSS).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const nom of ["typed", "calc"]) {
      const bloc = css.match(new RegExp(`\\.${nom}\\s*\\{([^}]*)\\}`));
      expect(bloc, `la note « ${nom} » a disparu de la feuille`).not.toBeNull();
      expect(bloc![1], `la note « ${nom} » est écrite hors de l'échelle`).toMatch(/font-size:\s*var\(--t-\d\)/);
    }
  });
});
