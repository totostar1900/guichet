import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const code = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const offres = code("src/components/OfferBrowser.tsx");
const fonds = code("src/app/fonds/FundsBrowser.tsx");

/** DES FILTRES QUI SE RÉPONDENT (7 novembre 2026) : le nombre d'une pastille vient du crible de la liste, moins son propre filtre. */
describe("les filtres se répondent", () => {
  it("compte les pastilles de Titres et d'Adjudications avec le crible de la liste, sans le filtre de la pastille", () => {
    expect(offres, "le crible ne sait plus ignorer un filtre").toMatch(/const garde = \(o: Offer, ql: string, avecPlages: boolean, sans\?: string\)/);
    expect(offres, "les nombres ne passent plus par le crible de la liste").toMatch(/\(o, cle\) => garde\(o, ql, true, cle\)/);
    for (const f of ["instrument", "pays", "statut", "duree", "rendement"]) expect(offres, `le filtre « ${f} » ne peut plus être ignoré pour son propre compte`).toMatch(new RegExp(`sans !== "${f}"`));
  });
  it("redessine les deux jauges pour ce qui reste, l'ensemble en fond pâle", () => {
    expect(offres, "la jauge de rendement ne suit plus la sélection").toMatch(/<YieldGauge values=\{yieldsRestants\} ensemble=\{yields\}/);
    expect(offres, "la jauge de durée ne suit plus la sélection").toMatch(/<DureeGauge values=\{dureesRestantes\} ensemble=\{durees\}/);
  });
  it("ne propose pas un instrument que la page n'a jamais", () => {
    expect(offres, "les instruments étrangers à la page reviennent").toMatch(/famPresentes\.has\(f\) \|\| kind\.has\(f\)/);
  });
  it("garde une valeur choisie devenue impossible, barrée et retirable", () => {
    expect(offres, "la phrase et le retrait de la valeur impossible ont disparu").toMatch(/impossibles\(g\.selected, comptes\[g\.key\]\)/);
    expect(fonds, "la liste des fonds ne signale plus la valeur impossible").toMatch(/n\(choisi\) === 0/);
  });
  it("trie les sociétés de gestion par nombre de fonds, avec une recherche", () => {
    expect(fonds, "les sociétés ne sont plus triées par nombre").toMatch(/\.sort\(\(x, y\) => n\(y\) - n\(x\)/);
    expect(fonds, "la recherche dans la liste a disparu").toMatch(/chercheSheet/);
  });
});
