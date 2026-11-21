import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/core";
import { CATEGORIES, MESSAGES, MOTS_CLES, PHRASES, tirerLesMessages, tirerLesPhrases } from "@/lib/domain/vitrine-messages";

/**
 * LES MESSAGES DE LA VITRINE (18 novembre 2026, planche « Accueil en quatre écrans ») : trois variantes par écran, une tirée à chaque visite, et chacune tient les règles de la vitrine.
 */
describe("les messages de la vitrine", () => {
  const tous = CATEGORIES.flatMap((c) => MESSAGES[c].map((m) => ({ c, m })));

  it("cinq catégories, de trois à quatre variantes chacune (les propositions du 21 novembre 2026 s'ajoutent aux trois d'origine), sans doublon", () => {
    expect([...CATEGORIES]).toEqual(["hub", "futur", "investir", "region", "vous"]);
    for (const c of CATEGORIES) expect(MESSAGES[c].length, c).toBe(c === "vous" ? 3 : 4);
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
      expect(dernier[c]).toBe(MESSAGES[c][MESSAGES[c].length - 1]);
    }
    /* Un tirage au sort réel couvre toutes les variantes sur un grand nombre d'ouvertures. */
    const vus = new Set<string>();
    for (let i = 0; i < 200; i++) vus.add(tirerLesMessages().hub);
    expect(vus.size).toBe(MESSAGES.hub.length);
  });
});

/**
 * LES PHRASES QUI CHANGENT AUSSI, ET LE MOT QUI PREND LE CORAIL (21 novembre 2026, planche « Accueil », choix 1C et 5).
 */
describe("les phrases de l'accueil et leurs mots clés", () => {
  const phrases = Object.entries(PHRASES).flatMap(([place, jeux]) => jeux.flatMap((jeu) => jeu.map((p) => ({ place, p }))));
  const en = translator("en");

  it("six places, chacune avec au moins deux jeux de phrases (l'actuel et le proposé)", () => {
    expect(Object.keys(PHRASES).sort()).toEqual(["choisir", "conseillers", "famille", "ouvrir", "ordre", "vous"].sort());
    for (const [place, jeux] of Object.entries(PHRASES)) expect(jeux.length, place).toBeGreaterThanOrEqual(2);
  });

  it("aucune phrase ne dit « desk » : c'est un mot de la maison, pas du client", () => {
    for (const { place, p } of phrases) expect(p, `« ${p} » (${place})`).not.toMatch(/\bdesk\b/i);
  });

  it("aucune phrase ne porte de chiffre, de taux ni de promesse de gain", () => {
    for (const { place, p } of phrases) {
      expect(p, `« ${p} » (${place}) porte un chiffre`).not.toMatch(/\d/);
      expect(p, `« ${p} » (${place}) parle de taux, de rendement ou de gain`).not.toMatch(/\b(taux|rendement|rendements|gagn\w*|gain|gains|profit\w*|sûr|sans risque)\b/i);
    }
  });

  it("chaque phrase a son anglais", () => {
    for (const { p } of phrases) expect(en(p), `« ${p} » n'est pas traduit`).not.toBe(p);
  });

  it("le tirage rend un jeu par place, et le hasard injecté décide", () => {
    const premier = tirerLesPhrases(() => 0);
    const dernier = tirerLesPhrases(() => 0.999);
    for (const [place, jeux] of Object.entries(PHRASES)) {
      expect(premier[place as keyof typeof PHRASES], place).toEqual(jeux[0]);
      expect(dernier[place as keyof typeof PHRASES], place).toEqual(jeux[jeux.length - 1]);
    }
    const vus = new Set<string>();
    for (let i = 0; i < 200; i++) vus.add(tirerLesPhrases().ordre[0]);
    expect(vus.size).toBe(PHRASES.ordre.length);
  });

  it("chaque titre a son mot clé, qui figure dans la phrase, en français comme en anglais", () => {
    for (const c of CATEGORIES) {
      for (const m of MESSAGES[c]) {
        const mot = MOTS_CLES[m];
        expect(mot, `« ${m} » n'a pas de mot clé`).toBeTruthy();
        expect(m.toLowerCase(), `« ${mot[0]} » ne figure pas dans « ${m} »`).toContain(mot[0].toLowerCase());
        expect(en(m).toLowerCase(), `« ${mot[1]} » ne figure pas dans « ${en(m)} »`).toContain(mot[1].toLowerCase());
      }
    }
    expect(Object.keys(MOTS_CLES).length, "un mot clé ne vise plus aucun titre").toBe(CATEGORIES.reduce((n, c) => n + MESSAGES[c].length, 0));
  });
});
