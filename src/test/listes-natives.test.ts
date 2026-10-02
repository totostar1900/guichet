import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PAS DE LISTE NATIVE DANS LES ÉCRANS DU CLIENT.
 *
 * Une liste déroulante native s'ouvre en roue au bas du téléphone, avec la
 * typographie du système, sans la phrase qui dit ce que chaque ligne est, et
 * sans recherche quand la liste est longue. La maison a la sienne,
 * `components/ui/Select`, et elle sert déjà au réinvestissement.
 *
 * Ce cliquet existe parce que la règle est invisible : un formulaire neuf écrit
 * avec une balise native marche parfaitement, se relit sans gêne, et personne
 * ne voit qu'il a quitté la langue de la maison. C'est à l'écran du téléphone,
 * et seulement là, que la différence se remarque.
 *
 * Le desk n'est pas tenu : il se travaille au clavier sur grand écran, et la
 * liste native y est plus rapide à parcourir.
 */
const RACINE = "C:/dev/guichet/src";

/** Les exceptions, nommées une par une, avec ce qui les justifie. */
const TOLEREES: Record<string, string> = {
  "components/market/EcartTresors.tsx": "servie au desk seulement, sur /desk/analyses",
  "components/market/PointsCourbe.tsx": "servie au desk seulement, sur /desk/analyses",
};

function fichiers(dossier: string, out: string[] = []): string[] {
  for (const e of readdirSync(dossier)) {
    const p = path.join(dossier, e);
    if (statSync(p).isDirectory()) {
      if (e === "desk") continue;
      fichiers(p, out);
    } else if (/\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

describe("les listes déroulantes du client", () => {
  it("passent toutes par celle de la maison", () => {
    const fautifs: string[] = [];
    for (const f of fichiers(RACINE)) {
      const rel = path.relative(RACINE, f).replace(/\\/g, "/");
      if (rel.includes("/desk/") || rel.startsWith("app/desk") || TOLEREES[rel]) continue;
      if (/<select[\s>]/.test(readFileSync(f, "utf8"))) fautifs.push(rel);
    }
    expect(fautifs).toEqual([]);
  });

  it("n'oublie pas de vérifier quoi que ce soit", () => {
    // Non vacuité : un parcours qui ne lirait plus rien passerait au vert.
    expect(fichiers(RACINE).length).toBeGreaterThan(100);
    // Et les exceptions doivent exister : une exception qui ne désigne plus un
    // fichier est une permission oubliée.
    for (const rel of Object.keys(TOLEREES)) expect(() => statSync(path.join(RACINE, rel)), rel).not.toThrow();
  });
});
