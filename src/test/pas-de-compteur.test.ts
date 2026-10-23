import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

/**
 * ON N'ANNONCE PAS SUR UNE PAGE CE QUE PORTE LA PAGE SUIVANTE.
 *
 * La maison l'avait déjà écrit pour les intentions — « le compteur est parti,
 * les cartes portent le nombre par leur présence » — et trois tuiles du relevé
 * l'avaient gardé. Le 24 octobre 2026, l'une d'elles mentait de la pire
 * façon : « Vos ordres passés · 4 » ouvrait « Vos opérations », qui répondait
 * « aucun mouvement encore porté au journal ».
 *
 * LE COMPTE N'ÉTAIT PAS FAUX, IL COMPTAIT AUTRE CHOSE. Quatre intentions
 * closes d'un côté, zéro écriture au journal des espèces de l'autre : deux
 * sources pour une seule promesse. C'est la règle générale, et la raison pour
 * laquelle elle ne souffre pas d'exception de bonne foi — un nombre posé sur
 * la page d'avant se calcule toujours ailleurs que là où il sera vérifié, et
 * rien ne les tient ensemble.
 *
 * Le compteur coûtait en plus deux lectures du dépôt à chaque affichage du
 * tableau de bord, pour écrire « 0 relevé(s) ».
 *
 * CE QUI RESTE PERMIS, et la distinction est tout l'objet de la règle : dire
 * combien d'éléments DE CETTE PAGE-CI restent cachés. « et {n} autres » sous
 * une liste tronquée compte ce qu'on a sous les yeux, pas ce qu'il y a
 * ailleurs ; il se vérifie sur place.
 */
const SUR_PLACE = [
  "src/components/CeQuiVousAttend.tsx",
  /* LA BARRE DU GUIDE COMPTE UNE PROGRESSION, PAS UN CONTENU : « 3 / 8 »
     mesure le LECTEUR, et ses deux termes sortent de la même liste — ils ne
     peuvent donc pas se contredire. C'est exactement ce qui manquait au
     relevé, où le nombre venait d'une source et la page d'une autre. Un
     rapport sur une seule source se vérifie ; une promesse sur deux, jamais. */
  "src/app/info/GuideBar.tsx",
];

const fichiersDuGuichet = (): string[] => {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "desk") continue;
        walk(p);
      } else if (e.name.endsWith(".tsx")) out.push(p);
    }
  };
  walk(path.join(ROOT, "src/app"));
  walk(path.join(ROOT, "src/components"));
  return out.filter((p) => !p.includes(`${path.sep}desk${path.sep}`));
};

describe("aucune page n'annonce le contenu de la suivante", () => {
  it("ne pose pas de compteur dans un lien", () => {
    const fautifs: string[] = [];
    for (const p of fichiersDuGuichet()) {
      const rel = path.relative(ROOT, p);
      if (SUR_PLACE.includes(rel.split(path.sep).join("/"))) continue;
      const src = fs.readFileSync(p, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
      /* Un « <Link … > » et, avant sa fermeture, un gabarit qui interpole un
         nombre tiré d'une longueur. */
      for (const m of src.matchAll(/<Link\b[\s\S]{0,600}?<\/Link>/g)) {
        if (/\{\s*n:\s*String\([^)]*\.length\)/.test(m[0]) || /\{[a-zA-Z.]*\.length\}/.test(m[0])) {
          const ligne = src.slice(0, m.index).split("\n").length;
          fautifs.push(`${rel}:${ligne}`);
        }
      }
    }
    expect(fautifs, `ces liens annoncent un nombre calculé ailleurs que là où il sera vérifié :\n  ${fautifs.join("\n  ")}`).toEqual([]);
  });

  /* Non vacuité : un chemin faux rendrait zéro faute partout. */
  it("regarde bien quelque chose", () => {
    const tous = fichiersDuGuichet();
    expect(tous.length).toBeGreaterThan(80);
    /* Le relevé a été l'ancre de ce contrôle jusqu'au 24 octobre 2026 ; il
       n'existe plus comme fichier — ses sections sont devenues des pages, et
       ses trois tuiles à compteur, des bandes. L'ancre passe à la page qui
       le portait, et d'où la règle est en réalité tirée. */
    expect(tous.some((p) => p.endsWith(`app${path.sep}Console.tsx`)), "la page d'accueil, d'où la règle est tirée, n'est plus regardée").toBe(true);
  });
});
