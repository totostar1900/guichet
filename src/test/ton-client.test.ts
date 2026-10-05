import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UN ÉCRAN DIT CE QU'IL FAIT, PAS CE QUE LA MAISON NE PEUT PAS FAIRE.
 *
 * « La maison n'a pas l'agrément pour choisir à votre place le mois venu »
 * disait vrai, et parlait de nous. Le client veut savoir ce que l'écran fait
 * pour lui ; le reste appartient aux mentions, qui existent et qui restent.
 *
 * La règle est invisible : ces phrases sont justes, honnêtes, et elles se
 * relisent sans gêne. Rien ne signale qu'on a glissé de servir à se justifier.
 *
 * Le cliquet ne juge donc pas le sens, ce qui serait un détecteur, et les
 * détecteurs ont échoué deux fois dans ce dépôt. Il nomme les tournures, une à
 * une, et la liste se discute à chaque ajout.
 *
 * Ce qu'il ne regarde pas : les mentions et les risques, qui sont dus ; le
 * desk, qui parle entre professionnels ; la documentation et les éclairages, qui
 * expliquent le modèle et dont c'est le métier ; les commentaires du code,
 * qui s'adressent à nous.
 */
const RACINE = "C:/dev/guichet/src";

const TOURNURES = ["n'a pas l'agrément", "pas d'agrément", "ne conseille pas", "à votre place", "ne recommande", "la maison ne choisit", "n'est pas habilité", "ne sommes pas autorisés"];

/**
 * `data/risques` est la page des limites, et c'est son métier de les dire : la
 * vitrine ne plaide plus, les limites ont un seul endroit, et il est nommé.
 */
const HORS_CHAMP = ["/desk/", "app/desk", "i18n/", "test/", "data/docs/", "data/lessons", "data/legal", "data/risques", "info/mentions", "info/risques", "documents/passages-catalog", "news/model"];

function fichiers(dossier: string, out: string[] = []): string[] {
  for (const e of readdirSync(dossier)) {
    const p = path.join(dossier, e);
    if (statSync(p).isDirectory()) fichiers(p, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

/** Les commentaires s'adressent au lecteur du code, jamais au client. */
const estCommentaire = (ligne: string): boolean => {
  const l = ligne.trim();
  return l.startsWith("*") || l.startsWith("//") || l.startsWith("/*");
};

describe("le ton des écrans du client", () => {
  it("ne justifie pas ce que la maison ne peut pas faire", () => {
    const fautifs: string[] = [];
    for (const f of fichiers(RACINE)) {
      const rel = path.relative(RACINE, f).replace(/\\/g, "/");
      if (HORS_CHAMP.some((s) => rel.includes(s))) continue;
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((ligne, i) => {
          if (estCommentaire(ligne)) return;
          for (const t of TOURNURES) if (ligne.includes(t)) fautifs.push(`${rel}:${i + 1} · ${t}`);
        });
    }
    expect(fautifs).toEqual([]);
  });

  it("regarde bien quelque chose", () => {
    // Non vacuité : un parcours qui ne lirait plus rien passerait au vert.
    const vus = fichiers(RACINE).filter((f) => !HORS_CHAMP.some((s) => path.relative(RACINE, f).replace(/\\/g, "/").includes(s)));
    expect(vus.length).toBeGreaterThan(100);
  });
});
