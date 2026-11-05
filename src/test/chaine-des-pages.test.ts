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
  it("favoris : langue, session, onglet et offres partent ensemble", () => {
    const src = lire("src/app/favoris/page.tsx");
    expect(src, "favoris : la langue, la session, l'onglet et les offres ne partent plus ensemble").toMatch(/\[t, s, sp, offers\] = await Promise\.all\(\[getT\(\), requireSession\("\/favoris"\), searchParams, r\.listOffers\(\)/);
  });
  it("calendrier : langue, offres et alertes partent ensemble", () => {
    const src = lire("src/app/calendrier/page.tsx");
    expect(src, "calendrier : la langue, les offres et les alertes ne partent plus ensemble").toMatch(/\[t, offers, veilles, session\] = await Promise\.all\(\[getT\(\), repo\(\)\.listOffers\(\)/);
  });
  it("recherche : session, question et langue partent ensemble", () => {
    const src = lire("src/app/recherche/page.tsx");
    expect(src, "recherche : la session, la question et la langue ne partent plus ensemble").toMatch(/Promise\.all\(\[requireSession\("\/recherche"\), searchParams, getT\(\), getLang\(\)\]\)/);
  });
  it("comparer : colonnes, historiques, indice et rotations partent dans un seul étage", () => {
    const src = lire("src/app/comparer/ComparerBody.tsx");
    expect(src, "comparer : les lectures des colonnes ne partent plus ensemble").toMatch(/\[variations, chartLines, bulletins, quotes, rotations\] = await Promise\.all\(/);
    expect(src, "comparer : une lecture est de nouveau attendue en série").not.toMatch(/await r\.(listBulletins|latestQuotes)|const variations = await/);
  });
});
