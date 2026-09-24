import { describe, expect, it } from "vitest";
import { DOCUMENT_CHAIN } from "@/data/docs/chain";

/**
 * La chaîne documentaire : une seule liste, deux vues.
 *
 * Elle était écrite deux fois, et les deux copies avaient divergé sans que
 * personne s'en aperçoive : sept étapes dans le tableau du desk, six dans le
 * schéma de la documentation, sous d'autres libellés, sans l'annonce ni l'avis
 * d'opéré. Ce qui suit garde la liste en état ; que les deux vues la lisent est
 * vérifié par le fait qu'il n'en existe plus qu'une.
 */
describe("la chaîne documentaire", () => {
  it("va de l'annonce à la vie du titre, sans trou", () => {
    expect(DOCUMENT_CHAIN.map((c) => c.step.fr)).toEqual(["Annonce", "Intention", "Prise ferme", "Soumission", "Résultats", "Règlement", "Vie du titre"]);
  });

  it("dit pour chaque étape un document, un destinataire et un déclencheur", () => {
    // Le tableau montre les quatre, le schéma deux : aucune vue ne doit tomber
    // sur une case vide parce qu'une étape a été ajoutée à moitié.
    for (const c of DOCUMENT_CHAIN) {
      for (const [field, v] of Object.entries(c)) {
        expect(v.fr.trim(), `${c.step.fr} · ${field} · fr`).not.toBe("");
        expect(v.en.trim(), `${c.step.fr} · ${field} · en`).not.toBe("");
      }
    }
  });

  it("garde des libellés que le schéma peut tenir dans une boîte", () => {
    // Le schéma dessine sept boîtes de 98 px et coupe à trois lignes de quinze
    // caractères : un libellé trop long disparaîtrait sans prévenir.
    for (const c of DOCUMENT_CHAIN) {
      expect(c.doc.fr.length, `${c.step.fr} · document`).toBeLessThanOrEqual(45);
      expect(c.doc.en.length, `${c.step.fr} · document en`).toBeLessThanOrEqual(45);
      expect(c.trigger.fr.length, `${c.step.fr} · déclencheur`).toBeLessThanOrEqual(34);
    }
  });
});
