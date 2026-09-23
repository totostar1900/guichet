import { describe, expect, it } from "vitest";
import { MESSAGES, messagesFor } from "@/lib/documents/messages-catalog";
import { checkPassage, fill, placeholdersIn } from "@/lib/documents/passages-catalog";

/**
 * Les messages préparés : ce qui doit rester vrai de chacun d'eux.
 *
 * Le danger d'un message tout fait n'est pas qu'il soit mal écrit, c'est qu'il
 * parte à moitié rempli. « Il nous manque : {precision} » chez un client vaut
 * pire que le silence.
 */
describe("les messages préparés", () => {
  it("ne promettent rien", () => {
    // checkPassage tient la règle de la maison : pas de « meilleur », pas de
    // « garanti », et aucun champ que le message ne connaît pas.
    for (const m of MESSAGES) expect(checkPassage(m, m.fr, m.en), m.key).toBeUndefined();
  });

  it("déclarent les champs qu'ils emploient, dans les deux langues", () => {
    for (const m of MESSAGES) {
      for (const text of [m.fr, m.en]) {
        for (const k of placeholdersIn(text)) expect(m.placeholders, `${m.key} · {${k}}`).toContain(k);
      }
      // Les deux langues disent la même chose : elles portent donc les mêmes champs.
      expect(placeholdersIn(m.en).sort(), m.key).toEqual(placeholdersIn(m.fr).sort());
    }
  });

  it("demandent une précision exactement quand ils en portent une", () => {
    for (const m of MESSAGES) {
      const asks = Boolean(m.askNote);
      // Un champ de saisie sans {precision} ne sert à rien ; l'inverse laisse un trou.
      expect(placeholdersIn(m.fr).includes("precision"), m.key).toBe(asks);
      if (asks) expect(m.required, m.key).toContain("precision");
    }
  });

  it("ne laissent aucun trou une fois remplis", () => {
    const vars = { client: "Awa Mbarga", ref: "PF-0914-K7Q4", ligne: "OTA 6,5 % 2029", montant: "5 000 000 FCFA", echeance: "15 oct. 2026", precision: "la copie de votre CNI" };
    for (const m of MESSAGES) expect(fill(m.fr, vars), m.key).not.toMatch(/\{[a-z_]+\}/);
  });

  it("mettent d'abord celui que l'état de l'ordre appelle", () => {
    const first = messagesFor("recue")[0];
    expect(first.when).toContain("recue");
    // « Vos propres mots » ferme la marche : c'est le dernier recours, pas le premier geste.
    expect(messagesFor("recue").at(-1)?.key).toBe("autre");
    expect(messagesFor("transmise").at(-1)?.key).toBe("autre");
    // Aucun message ne disparaît : seule la main change.
    expect(messagesFor("transmise")).toHaveLength(MESSAGES.length);
  });
});
