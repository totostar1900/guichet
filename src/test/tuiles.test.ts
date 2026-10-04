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

  /* Une tuile sans ses trois mots ne dit pas ce qu'elle ouvre, et c'est le
     défaut des grilles d'icônes. La phrase entière, elle, y est illisible. */
  it("donne trois ou quatre mots à chaque tuile, jamais zéro, jamais une phrase", () => {
    for (const p of TOUTES) {
      expect(p.tuile, `${p.key} n'a pas de mots de tuile`).toBeTruthy();
      expect(p.tuile!.length, `${p.key} : « ${p.tuile} » est une phrase`).toBeLessThanOrEqual(36);
    }
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
