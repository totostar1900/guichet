import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translatable } from "@/i18n/core";
import { INSTRUMENTS_PAGES, MARCHE_PAGES, PORTEFEUILLE_PAGES, type NavPage } from "@/lib/nav-groups";

/**
 * LES MOTS DES TABLES NE PASSENT PAS PAR UN LITTÉRAL.
 *
 * Le nom, le nom court, les trois mots de la tuile et la phrase vivent dans
 * une table et traversent t() sous forme de variable : le scanner de clefs ne
 * les voit pas, et une entrée manquante laisse du français dans une interface
 * anglaise sans que rien n'échoue. C'est le premier des trois angles morts, et
 * il a déjà coûté.
 *
 * La question posée est une couverture et non une ressemblance : « le
 * dictionnaire connaît-il cette clef » est un fait.
 */
const TOUTES: NavPage[] = [...PORTEFEUILLE_PAGES, ...INSTRUMENTS_PAGES, ...MARCHE_PAGES];

describe("les mots de la navigation, en anglais", () => {
  it("couvre le nom, le nom court, la tuile et la phrase de chaque page", () => {
    const manquants: string[] = [];
    for (const p of TOUTES) {
      for (const [champ, texte] of [
        ["label", p.label],
        ["short", p.short],
        ["tuile", p.tuile],
        ["hint", p.hint],
      ] as const) {
        if (texte && !translatable(texte)) manquants.push(`${p.key}.${champ} : « ${texte} »`);
      }
    }
    expect(manquants, `à traduire dans src/i18n :\n${manquants.join("\n")}`).toEqual([]);
  });

  /**
   * LES TROIS MOTS NE S'AFFICHENT PLUS DANS LES FEUILLES DU DOCK, décision du
   * 5 octobre 2026 : à 80 px de cadre et 1,05 rem de nom, la silhouette et le
   * nom portent la tuile, et neuf phrases à lire pour choisir une destination
   * étaient neuf de trop. Les mots restent dans la table, où la feuille du
   * compte et d'autres surfaces peuvent les reprendre ; ils ne sont donc plus
   * exigés, mais s'ils existent ils tiennent en trois ou quatre mots.
   */
  it("garde des mots courts, là où une table en porte", () => {
    for (const p of TOUTES) {
      if (!p.tuile) continue;
      expect(p.tuile.length, `${p.key} : « ${p.tuile} » est une phrase`).toBeLessThanOrEqual(36);
    }
  });

  it("ne pose plus les trois mots dans la feuille du dock", () => {
    const shell = readFileSync(join(process.cwd(), "src/components/mobile/MobileShell.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(shell, "la feuille du dock ne passe plus de sous-titre à ses tuiles").not.toMatch(/mots:/);
  });
});

/**
 * LA TUILE SANS DESSIN EST UNE PANNE MUETTE.
 *
 * Une clef absente de la table des icônes ne casse rien : le cadre reste, vide,
 * et la grille continue de se rendre. C'est la forme la plus coûteuse de
 * défaut dans ce dépôt, celle qui ne se signale pas, et une page ajoutée à un
 * siège est exactement le moment où elle arrive.
 */
describe("les tuiles du dock", () => {
  it("donne une icône à chaque page des trois sièges", async () => {
    const { ICONE_PAGE } = await import("@/components/nav/IconesPages");
    const sans = TOUTES.filter((p) => !ICONE_PAGE[p.key]).map((p) => p.key);
    expect(sans, "ces pages afficheraient un cadre vide").toEqual([]);
  });
});

/**
 * LES HUIT DESTINATIONS DU COMPTE.
 *
 * Elles ne vivent pas dans une table partagée : elles sont écrites dans la
 * feuille, avec les noms courts et les trois mots. Deux choses s'y perdent en
 * silence : une clef sans icône, qui laisse un cadre vide, et l'état du
 * dossier, qui traverse t() sous forme de variable et resterait donc en
 * français dans une interface anglaise.
 */
describe("les tuiles du compte", () => {
  const source = readFileSync(join(process.cwd(), "src/components/mobile/AccountMenu.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("donne une icône à chacune des huit", async () => {
    const { ICONE_PAGE } = await import("@/components/nav/IconesPages");
    const clefs = [...source.matchAll(/icone: ICONE_PAGE\.(\w+)/g)].map((m) => m[1]);
    expect(clefs.length, "les deux grilles portent huit tuiles").toBe(8);
    expect(
      clefs.filter((k) => !ICONE_PAGE[k]),
      "ces tuiles afficheraient un cadre vide",
    ).toEqual([]);
  });

  /* L'état du dossier prend la place des trois mots : c'est la seule chose
     vivante des deux grilles, et la seule qui ne passe pas par un littéral. */
  it("couvre les cinq états du dossier d'ouverture", () => {
    const table = /const KYC_HINT: Record<string, string> = \{([^}]*)\}/.exec(source);
    expect(table, "la table des états du dossier a changé de forme").toBeTruthy();
    const etats = [...table![1].matchAll(/: "([^"]+)"/g)].map((m) => m[1]);
    expect(etats.length, "cinq états, de « commencé » à « à reprendre »").toBe(5);
    expect(
      etats.filter((e) => !translatable(e)),
      "à traduire dans src/i18n",
    ).toEqual([]);
  });
});
