import { describe, expect, it } from "vitest";
import { FRAME, MESSAGES, messagesFor } from "@/lib/documents/messages-catalog";
import { checkPassage, fill, placeholdersIn } from "@/lib/documents/passages-catalog";

/**
 * Les messages préparés : ce qui doit rester vrai de chacun d'eux.
 *
 * Le danger d'un message tout fait n'est pas qu'il soit mal écrit, c'est qu'il
 * parte à moitié rempli. « Il nous manque : {precision} » chez un client vaut
 * pire que le silence.
 */
const VARS = { client: "Awa Mbarga", ref: "PF-0914-K7Q4", ligne: "OTA 6,5 % 2029", montant: "5 000 000 FCFA", echeance: "15 oct. 2026", precision: "la copie de votre CNI", conseiller: "Nadège Eyenga", societe: "Purpose Capital" };

/** Un message composé comme le composeur le compose : le corps, puis le cadre autour. */
const compose = (key: string) => {
  const m = MESSAGES.find((x) => x.key === key)!;
  return fill(FRAME.fr, { ...VARS, corps: fill(m.fr, VARS) });
};

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

  it("ne laissent aucun trou une fois composés", () => {
    for (const m of messagesFor("recue")) expect(compose(m.key), m.key).not.toMatch(/\{[a-z_]+\}/);
  });

  it("mettent d'abord celui que l'état de l'ordre appelle", () => {
    const first = messagesFor("recue")[0];
    expect(first.when).toContain("recue");
    // « Vos propres mots » ferme la marche : c'est le dernier recours, pas le premier geste.
    expect(messagesFor("recue").at(-1)?.key).toBe("autre");
    expect(messagesFor("transmise").at(-1)?.key).toBe("autre");
    // Aucun message ne disparaît, sauf le cadre, qui n'est pas un message.
    expect(messagesFor("transmise")).toHaveLength(MESSAGES.length - 1);
    expect(messagesFor("transmise").some((m) => m.key === FRAME.key)).toBe(false);
  });
});

/**
 * La forme, qui n'est pas un détail.
 *
 * Un message se lit sur un téléphone, dans un fil, entre deux messages de la
 * famille. Quarante mots d'un bloc s'y lisent comme un mur, et un mur ne se lit
 * pas : on le fait défiler. Le cadre impose donc la salutation, l'air autour du
 * corps, la formule et la signature, à tous les messages et une seule fois.
 */
describe("la forme d'un message", () => {
  for (const m of MESSAGES.filter((x) => x.key !== FRAME.key)) {
    it(`« ${m.label} » salue, respire et signe`, () => {
      const lines = compose(m.key).split("\n");
      expect(lines[0], "la salutation tient sa ligne").toBe("Bonjour Awa Mbarga,");
      expect(lines[1], "une ligne vide sous la salutation").toBe("");
      expect(compose(m.key), "la formule de politesse").toContain("Nous restons à votre disposition.");
      expect(lines.at(-1), "la signature ferme le message").toBe("Nadège Eyenga · Purpose Capital");
      // Aucun corps ne salue ni ne signe pour son compte : c'est le rôle du cadre.
      expect(m.fr, m.key).not.toMatch(/^Bonjour|disposition/);
    });
  }

  it("garde la même forme en anglais", () => {
    const en = fill(FRAME.en, { ...VARS, corps: "Body." });
    expect(en.split("\n")[0]).toBe("Hello Awa Mbarga,");
    expect(en.split("\n").at(-1)).toBe("Nadège Eyenga · Purpose Capital");
  });
});
