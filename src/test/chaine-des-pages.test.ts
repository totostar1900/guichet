import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (p: string) => readFileSync(`${__dirname}/../../${p}`, "utf8");

/** Les listes d'entrée lisent en parallèle : une lecture en série coûte un aller-retour entier (11 novembre 2026). */
describe("la chaîne de lecture des listes d'entrée", () => {
  it("les fonds : langue, offres et session partent ensemble", () => {
    const src = lire("src/app/fonds/FondsBody.tsx");
    expect(src, "la langue, les offres et la session ne partent plus ensemble").toMatch(/await Promise\.all\(\[\s*getT\(\),[\s\S]*?r\.listOffers\(\)[\s\S]*?getSession\(\)\.then\(/);
    expect(src, "la session est de nouveau attendue seule, en série").not.toMatch(/const session = await getSession\(\)/);
  });
  it("les titres : langue et session partent ensemble", () => {
    const src = lire("src/app/TitresBody.tsx");
    expect(src, "la langue et la session sont de nouveau en série").toMatch(/\[t, session\] = await Promise\.all\(\[getT\(\), getSession\(\)\]\)/);
  });
});
