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

  /**
   * NI SOUS-TITRE NI CHIFFRE SOUS LE NOM. Les trois mots sont partis le matin
   * du 5 octobre 2026, le chiffre des listes d'achat l'après-midi : la tuile
   * est une silhouette et un nom, et chaque étage de texte rendu sous l'icône
   * ramène la rangée pleine largeur que la grille a remplacée. Le chiffre vit
   * toujours dans le menu large, à côté du nom de sa page.
   */
  it("ne pose ni sous-titre ni chiffre dans la feuille du dock", () => {
    const shell = readFileSync(join(process.cwd(), "src/components/mobile/MobileShell.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(shell, "la feuille du dock ne passe plus de sous-titre à ses tuiles").not.toMatch(/mots:/);
    expect(shell, "la feuille du dock ne passe plus de chiffre à ses tuiles").not.toMatch(/compte:/);
  });

  /* Et la grille elle-meme n a plus de quoi en afficher un : la prop retiree
     d un seul appelant se rebranche trop facilement. */
  it("n'a plus de chiffre à afficher dans la grille", () => {
    const grille = readFileSync(join(process.cwd(), "src/components/nav/Tuiles.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(grille, "la tuile ne porte plus de compte").not.toMatch(/compte/);
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
 * LA FEUILLE UNIQUE, DEPUIS LE 5 OCTOBRE 2026.
 *
 * Ses huit destinations sont écrites dans la feuille, pas dans une table
 * partagée. Trois choses s'y perdent en silence : un dessin absent, qui laisse
 * un cadre vide ; l'état du dossier, qui traverse t() sous forme de variable
 * et resterait en français dans une interface anglaise ; et, depuis la fusion,
 * un réglage oublié au passage d'une feuille à l'autre.
 */
describe("la feuille unique du compte", () => {
  const source = readFileSync(join(process.cwd(), "src/components/mobile/AccountMenu.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("donne un dessin à chacune des huit", () => {
    const dessins = [...source.matchAll(/\bd: D\.(\w+)/g)].map((m) => m[1]);
    const table = /const D = \{([\s\S]*?)\n\};/.exec(source);
    expect(table, "la table des dessins a changé de forme").toBeTruthy();
    const connus = new Set([...table![1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
    expect(dessins.length, "les deux grilles portent huit tuiles").toBe(8);
    expect(
      dessins.filter((k) => !connus.has(k)),
      "ces tuiles afficheraient un cadre vide",
    ).toEqual([]);
  });

  /**
   * UNE SEULE PORTE QUAND ON EST CONNECTÉ. Le « ⋮ » et l'initiale ouvraient
   * deux feuilles qui disaient la même chose : 2 433 px pour neuf pages, cinq
   * destinations écrites deux fois. Le jour où le « ⋮ » revient pour un client
   * connecté, le doublon revient avec lui.
   */
  it("ne laisse qu'une porte au client connecté", () => {
    const menu = readFileSync(join(process.cwd(), "src/components/AppMenu.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(menu, "le « ⋮ » s'ouvre de nouveau à côté de l'initiale").toMatch(/if \(signedIn && !desk\) return null;/);
  });

  /**
   * CE QUE LA FUSION NE DOIT PAS PERDRE. Les quatre réglages, les couleurs, la
   * recherche, le contact et les deux sorties vivaient dans l'une ou l'autre
   * feuille ; en fondre deux en une est exactement le geste qui en laisse
   * tomber un au passage.
   */
  it("garde tout ce que les deux feuilles portaient", () => {
    /* Le CORPS, pas les imports : un composant importé puis jamais rendu est
       exactement la façon dont un réglage disparaît sans bruit. */
    const corps = source.slice(source.indexOf("export function AccountMenu"));
    for (const quoi of ["MenuRecherche", "MenuContact", "MenuRejouables", "MenuPied", "PaletteSwitch", "LangSwitch", "PushToggle", "statementsByEmail", "reach", "logoutEverywhere"]) {
      expect(corps, `${quoi} a disparu de la feuille unique`).toContain(quoi);
    }
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
