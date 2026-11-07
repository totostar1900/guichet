import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * LA FICHE D'UN ÉMETTEUR NE MONTRE QUE DES FAITS (7 novembre 2026, décidé par le dirigeant : « pas de commentaire »).
 *
 * Trois clauses tiennent cette règle : aucun champ de texte libre à la saisie, aucun mot de verdict à l'écran, et chaque chiffre porte son année et sa source.
 */
const lire = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const FICHE = lire("src/app/pays/[slug]/page.tsx");
const FORM = lire("src/app/desk/pays/FaitForm.tsx");
const ACTIONS = lire("src/app/desk/pays/actions.ts");
const BLOC = lire("src/app/offres/[id]/IssuerCard.tsx");

describe("les fiches pays : des faits, jamais un commentaire", () => {
  it("la saisie n'a aucun champ de texte libre", () => {
    expect(FORM, "un <textarea> ouvre la porte au commentaire de la maison").not.toMatch(/<textarea/i);
    expect(FORM).not.toMatch(/name="(commentaire|note_interne|avis|analyse)"/);
    expect(ACTIONS).not.toMatch(/commentaire|avis\b|analyse\b/i);
  });

  it("la page n'écrit aucun verdict de la maison", () => {
    const VERDICTS = /\b(préoccupan|inquiétan|rassuran|solid|fragil|sain|vulnérab|risqué|dangereu|alarman|sous contrôle|soutenab)/i;
    expect(FICHE).not.toMatch(VERDICTS);
    expect(BLOC).not.toMatch(VERDICTS);
  });

  it("chaque chiffre porte son année et sa source, et dit s'il est estimé", () => {
    for (const src of [FICHE, BLOC]) {
      expect(src).toMatch(/\.annee/);
      expect(src).toMatch(/\.source/);
      expect(src).toMatch(/\.estime/);
    }
  });

  it("un chiffre absent est nommé, jamais comblé", () => {
    expect(FICHE).toMatch(/non publié par la source/);
    expect(FICHE).not.toMatch(/\?\?\s*0\b/);
  });

  it("le lien du bloc de l'Émetteur mène à la fiche de l'État", () => {
    expect(BLOC).toMatch(/\/pays\/\$\{fiche\.slug\}/);
  });
});
