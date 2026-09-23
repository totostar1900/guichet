import { describe, expect, it } from "vitest";
import { isTombstone, TOMBSTONE } from "@/lib/reference";

/**
 * Supprimer une entrée du référentiel.
 *
 * Le danger d'une pierre tombale est qu'elle ressemble à une valeur : une
 * ligne du référentiel dont le contenu dit « rien ». Si la reconnaissance se
 * relâche, une entrée supprimée revient dans les listes sous la forme d'un
 * objet vide, avec un terme sans texte et une leçon sans titre.
 */
describe("la pierre tombale du référentiel", () => {
  it("se reconnaît, et ne se confond avec aucune valeur", () => {
    expect(isTombstone(TOMBSTONE)).toBe(true);
    for (const value of [null, undefined, {}, [], "", 0, false, { short: "OTA", text: "Obligation du Trésor assimilable." }, { __supprime: false }, { __supprime: "oui" }]) {
      expect(isTombstone(value), JSON.stringify(value) ?? "undefined").toBe(false);
    }
  });

  it("ne porte rien d'autre que son propre aveu", () => {
    // Une pierre qui porterait des champs serait lue comme une valeur par un
    // chargeur distrait, et le terme reviendrait à moitié écrit.
    expect(Object.keys(TOMBSTONE)).toEqual(["__supprime"]);
  });
});
