import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EN_ALL } from "@/i18n/core";

/**
 * UNE SÉANCE SERVIE NE SE DIT PAS « INDICATIVE ».
 *
 * Vu à l'écran le 4 octobre 2026, juste après avoir appliqué la séance
 * congolaise du 15 septembre : la fiche du bon annonçait « Taux servi 6,97 %
 * précompté » et, trois centimètres au-dessus, « Indicatif : prix à fixer par
 * le desk ». Les deux ne peuvent pas être vrais en même temps.
 *
 * LA CAUSE EST UN CHAMP QUI N'EXISTE PAS POUR UN BON. Le tampon testait
 * `servedPricePct`, qu'`applyResults` laisse délibérément vide pour un BTA :
 * un bon se sert à un TAUX, pas à un prix, et c'est `precountRate` qui le
 * porte. La condition tombait donc dans la branche « indicatif » quelle que
 * soit la séance, depuis toujours, pour tous les bons.
 *
 * `resultLine` est écrit dans les deux cas : c'est lui qui dit qu'une séance a
 * rendu son verdict, et c'est lui qu'il fallait lire.
 */
const SOURCES = ["src/app/offres/[id]/FicheReading.tsx", "src/app/offres/[id]/intention/page.tsx"] as const;

describe("le tampon d'une fiche dit ce que la séance a fait", () => {
  for (const f of SOURCES) {
    const src = readFileSync(`C:/dev/guichet/${f}`, "utf8");

    it(`${f} : lit le verdict, pas le prix`, () => {
      /* `servedPricePct` seul rate tous les bons. Le contrôle vise la ligne du
         tampon, pas le fichier : une autre lecture du champ ailleurs est
         légitime. */
      const ligne = src.split("\n").find((l) => l.includes('"Indicatif : prix à fixer par le desk"'));
      expect(ligne, "le tampon a disparu").toBeDefined();
      expect(ligne).toContain("servie ?");
      expect(ligne).not.toMatch(/o\.servedPricePct \?/);
    });

    it(`${f} : un bon dit « taux », une obligation dit « prix »`, () => {
      // Dire « prix servi » sur un bon précompté nomme une chose qui n'existe pas.
      expect(src).toContain(`o.kind === "BTA" ? "Taux servi à l'adjudication" : "Prix servi à l'adjudication"`);
    });

    it(`${f} : « servie » se décide sur resultLine`, () => {
      expect(src).toContain("const servie = Boolean(o.servedPricePct || o.resultLine);");
    });
  }

  it("le nouveau mot existe en anglais", () => {
    expect(EN_ALL["Taux servi à l'adjudication"]).toBeDefined();
    expect(EN_ALL["Prix servi à l'adjudication"]).toBeDefined();
  });
});
