import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LESSONS, lessonsForClient } from "@/data/lessons";
import { lessonForTerm, setRegistry, getRegistry } from "@/lib/registry";

const lire = (p: string) => fs.readFileSync(path.join(__dirname, "../..", p), "utf8");
const poids = (v: unknown) => JSON.stringify(v).length;

/**
 * LE REGISTRE ALLÉGÉ POUR LE NAVIGATEUR (11 novembre 2026, point 4 de la lenteur).
 *
 * Les trente-sept éclairages pesaient 48 Ko sur les 79 du registre renvoyé à chaque premier chargement. Le navigateur n'en lit que la clé, le titre et les termes.
 */
describe("les éclairages envoyés au navigateur", () => {
  it("ne gardent que ce que le navigateur lit : clé, titre, durée, termes ; ni textes ni questions", () => {
    const legers = lessonsForClient(LESSONS);
    expect(legers).toHaveLength(LESSONS.length);
    for (const [i, l] of legers.entries()) {
      expect([l.key, l.title, l.minutes, l.terms], l.key).toEqual([LESSONS[i].key, LESSONS[i].title, LESSONS[i].minutes, LESSONS[i].terms]);
      expect(l.body, `${l.key} : le texte de l'éclairage traverse de nouveau`).toEqual([]);
      expect(l.intro, `${l.key} : la phrase d'introduction traverse de nouveau`).toBe("");
      expect(l.quiz.options, `${l.key} : la question traverse de nouveau`).toEqual([]);
    }
  });
  it("pèsent le dixième des éclairages entiers", () => {
    const entiers = poids(LESSONS);
    const legers = poids(lessonsForClient(LESSONS));
    expect(entiers, "les éclairages entiers sont devenus légers : la mesure ne garde plus rien").toBeGreaterThan(30_000);
    expect(legers, `les éclairages du navigateur pèsent ${legers} octets`).toBeLessThan(entiers / 5);
  });
  it("laissent le navigateur trouver l'éclairage d'un mot du glossaire, et son titre", () => {
    const avant = getRegistry();
    setRegistry({ ...avant, lessons: lessonsForClient(LESSONS) });
    try {
      const mot = LESSONS.find((l) => l.terms.length)!;
      const trouve = lessonForTerm(mot.terms[0]);
      expect([trouve?.key, trouve?.title], "la bulle « i » ne retrouve plus son éclairage").toEqual([LESSONS.find((l) => l.terms.includes(mot.terms[0]))!.key, LESSONS.find((l) => l.terms.includes(mot.terms[0]))!.title]);
    } finally {
      setRegistry(avant);
    }
  });
  it("est celui que la mise en page envoie, et le desk et les pages du Guide gardent les éclairages entiers", () => {
    expect(lire("src/app/layout.tsx"), "la mise en page renvoie de nouveau les éclairages entiers au navigateur").toMatch(/lessons=\{lessonsForClient\(registry\.lessons\)\}/);
    expect(lire("src/app/layout.tsx"), "le registre du serveur ne doit pas être celui allégé").toMatch(/loadRegistry\(\)/);
  });
});
