import { describe, expect, it } from "vitest";
import { cheminDu, niveauDu, retourDe, SANS_LISTE } from "@/app/trader/niveaux";
import { RAYONS } from "@/lib/domain/services";

/**
 * LE CRAN QUE « PLACER » A PERDU, ET CE QUI NE DOIT PAS SE PERDRE AVEC LUI.
 *
 * Supprimer un palier laisse toujours deux traces derrière : un chemin qui
 * nomme un écran qu'on ne peut plus ouvrir, et une flèche de retour qui
 * remonte vers une liste qui n'existe plus. Les deux se lisent ici.
 *
 * La règle est testée pour elle-même et non par le texte du composant : une
 * garde qui lit du code tombe au premier reformatage et ne dit rien de ce
 * que le client verra.
 */
describe("les niveaux du parcours de Trade", () => {
  it("nomme un rayon qui existe", () => {
    /* Si le domaine renommait « placer », la règle viserait un rayon fantôme
       et tous les rayons rouvriraient leur liste — en silence. */
    expect(RAYONS.map((r) => r.cle)).toContain(SANS_LISTE);
  });

  it("ouvre la racine quand rien n'est demandé", () => {
    expect(niveauDu(undefined, undefined)).toBe(0);
  });

  it("n'ouvre aucune liste pour le rayon dont les services sont la question de la page", () => {
    expect(niveauDu(SANS_LISTE, undefined)).toBe(0);
  });

  it("ouvre la liste des autres rayons", () => {
    for (const r of RAYONS.filter((x) => x.cle !== SANS_LISTE)) expect(niveauDu(r.cle, undefined), r.cle).toBe(1);
  });

  it("ouvre la fiche dès qu'un service est désigné, rayon avec liste ou non", () => {
    expect(niveauDu(SANS_LISTE, "fonds")).toBe(2);
    expect(niveauDu("programmer", "epargne")).toBe(2);
  });

  it("ramène à la racine depuis une fiche du rayon sans liste", () => {
    /* Et non vers « ?r=placer », qui ne mènerait plus à rien : c'est la
       trace qu'une suppression de cran laisse si on l'oublie. */
    expect(retourDe(2, SANS_LISTE)).toBeUndefined();
  });

  it("ramène à sa liste depuis une fiche d'un rayon qui en a une", () => {
    expect(retourDe(2, "tenir")).toBe("tenir");
  });

  it("ramène à la racine depuis une liste", () => {
    expect(retourDe(1, "programmer")).toBeUndefined();
  });

  it("n'écrit pas de cran pour le rayon sans liste", () => {
    expect(cheminDu("Trade", { cle: SANS_LISTE, nom: "Placer" }, "Investir dans un fonds")).toEqual(["Trade", "Investir dans un fonds"]);
  });

  it("écrit les trois crans pour les autres", () => {
    expect(cheminDu("Trade", { cle: "tenir", nom: "Tenir" }, "Mes documents")).toEqual(["Trade", "Tenir", "Mes documents"]);
  });

  it("n'écrit que le titre à la racine", () => {
    expect(cheminDu("Trade", undefined, undefined)).toEqual(["Trade"]);
  });
});
