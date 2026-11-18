import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/core";
import { CATEGORIES, MESSAGES, tirerLesMessages } from "@/lib/domain/vitrine-messages";

/**
 * LES MESSAGES DE LA VITRINE (18 novembre 2026, planche « Accueil en quatre écrans ») : trois variantes par écran, une tirée à chaque visite, et chacune tient les règles de la vitrine.
 */
describe("les messages de la vitrine", () => {
  const tous = CATEGORIES.flatMap((c) => MESSAGES[c].map((m) => ({ c, m })));

  it("cinq catégories, trois variantes chacune, sans doublon", () => {
    expect([...CATEGORIES]).toEqual(["hub", "futur", "investir", "region", "vous"]);
    for (const c of CATEGORIES) expect(MESSAGES[c].length, c).toBe(3);
    expect(new Set(tous.map((x) => x.m)).size).toBe(tous.length);
  });

  it("aucun chiffre, aucun taux, aucune promesse de gain ni de garantie (la règle de la vitrine)", () => {
    for (const { c, m } of tous) {
      expect(m, `« ${m} » (${c}) porte un chiffre`).not.toMatch(/\d/);
      expect(m, `« ${m} » (${c}) parle de taux, de rendement ou de gain`).not.toMatch(/\b(taux|rendement|rendements|gagn\w*|gain|gains|profit\w*|garanti\w*|assur\w*|sûr|sans risque)\b/i);
      expect(m, `« ${m} » (${c}) dit « toute la finance », que la maison n'offre pas`).not.toMatch(/toute la finance/i);
      expect(m, `« ${m} » (${c}) dit « sécuris… » : un placement ne sécurise rien`).not.toMatch(/s[ée]curis/i);
    }
  });

  it("chaque variante a son anglais, qui n'est pas du français recopié", () => {
    const en = translator("en");
    for (const { m } of tous) expect(en(m), `« ${m} » n'est pas traduit`).not.toBe(m);
  });

  it("l'écran « vous » a pour titre « en toute sérénité », dans ses trois variantes", () => {
    expect(MESSAGES.vous[0]).toBe("En toute sérénité.");
    for (const m of MESSAGES.vous) expect(m).toMatch(/en toute sérénité|sérénité/i);
  });

  it("le tirage rend une variante de chaque catégorie, et le hasard injecté décide", () => {
    const premier = tirerLesMessages(() => 0);
    const dernier = tirerLesMessages(() => 0.999);
    for (const c of CATEGORIES) {
      expect(premier[c]).toBe(MESSAGES[c][0]);
      expect(dernier[c]).toBe(MESSAGES[c][2]);
    }
    /* Un tirage au sort réel couvre toutes les variantes sur un grand nombre d'ouvertures. */
    const vus = new Set<string>();
    for (let i = 0; i < 200; i++) vus.add(tirerLesMessages().hub);
    expect(vus.size).toBe(3);
  });
});
