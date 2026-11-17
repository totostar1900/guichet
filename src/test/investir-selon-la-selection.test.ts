import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * INVESTIR : DES CONTRÔLES QUI SUIVENT LA SÉLECTION (17 novembre 2026, planche « Investir », 1A à 6A).
 *
 * Mesuré à 390 px : « Filtrer » s'ouvrait sur une feuille vide sur trois sélections de Titres sur quatre, la barre « Rendement et durée » se dépliait sur un cadre vide, la recherche ne proposait rien,
 * et une émission clôturée se lisait sous « En souscription ». Chaque clause tient une des corrections.
 */
const O = readFileSync("src/components/OfferBrowser.tsx", "utf8");
const F = readFileSync("src/app/fonds/FundsBrowser.tsx", "utf8");

describe("Titres : la feuille n'est jamais vide, la barre cède la place à un bandeau", () => {
  it("à zéro ou une ligne, « Filtrer » et « Affichage » laissent la place à un bandeau, sauf si un choix est posé", () => {
    expect(O).toMatch(/const minimal = dispo\.lignes <= 1 && filterCount === 0 && !q && !sp\.get\("tri"\)/);
    expect(O).toMatch(/\{!minimal && <button type="button" className=\{styles\.sheetBtn\}/);
    expect(O).toMatch(/\{!minimal && \(\s*<Affichage/);
    expect(O).toMatch(/\{minimal && \(\s*<div className=\{styles\.bandeauUneLigne\}/);
  });
  it("les valeurs sans ligne se rangent en une phrase, et une valeur déjà choisie reste une pastille", () => {
    expect(O).toMatch(/\(comptes\[g\.key\]\?\.\[v\] \?\? 0\) === 0 && !g\.selected\.has\(v\)/);
    expect(O).toMatch(/t\("Sans ligne : \{l\}"/);
  });
  it("les quatre facettes ajoutées sont crible, comptes, groupes et « Tout effacer »", () => {
    expect(O).toMatch(/for \(const cle of \["cloture", "ticket", "dividende", "variation"\] as CleDeFacette\[\]\)/);
    expect(O).toMatch(/\["instrument", "pays", "statut", "cloture", "ticket", "dividende", "variation"\]/);
    expect(O).toMatch(/const reset = \(\) => update\(\{ cloture: undefined, ticket: undefined, dividende: undefined, variation: undefined/);
  });
});

describe("la recherche propose avant qu'on tape, et élargit quand rien ne répond", () => {
  it("le champ nomme sa portée et propose les récents puis ce que la sélection contient", () => {
    expect(O).toMatch(/placeholder=\{lieu === "cote" && sectionChoisie \? t\("Recherche dans \{s\}"/);
    expect(O).toMatch(/champ && draft === "" && !q && \(recents\.length > 0 \|\| dansLaSelection\.length > 0\)/);
    expect(O).toMatch(/guichet:recherches:\$\{lieu\}/);
  });
  it("sans résultat dans la section, un geste cherche dans tous les titres, avec le nombre de lignes", () => {
    expect(O).toMatch(/const horsSelection = q\.trim\(\) && sectionChoisie \? offers\.filter\(\(o\) => foinDe\(o\)\.includes\(fold\(q\.trim\(\)\)\)\)\.length : 0/);
    expect(O).toMatch(/update\(\{ section: "tout" \}\)\}>\s*\{horsSelection === 1/);
  });
  it("le texte cherché est écrit une seule fois : le crible et l'élargissement lisent la même fonction", () => {
    expect(O.match(/const foinDe = /g) ?? []).toHaveLength(1);
    expect(O).toMatch(/foinDe\(o, fam\)\.includes\(ql\)/);
  });
});

describe("une barre n'est offerte que si elle dessine quelque chose", () => {
  it("le nuage veut trois points ; sous ce seuil, une ligne de chiffres", () => {
    expect(O).toMatch(/const nuageUtile = pointsDuNuage\.length >= 3/);
    expect(O).toMatch(/!nuageUtile && resumeNuage\.n > 0 && \(\s*<p className=\{styles\.resumeSeul\}/);
  });
  it("« Souscription » a son calendrier des clôtures, à partir de deux dates", () => {
    expect(O).toMatch(/sectionChoisie === "souscription" && calendrierDesClotures\.length >= 2/);
  });
  it("Fonds : moins de deux fonds chiffrés, la bande cède la place à « depuis l'origine »", () => {
    expect(F).toMatch(/const bandeUtile = pourLaBande\.length >= 2/);
    expect(F).toMatch(/\{bandeUtile && <BandeauRepliable/);
    expect(F).toMatch(/!bandeUtile && depuisLOrigine\.length > 0/);
  });
});

describe("« En souscription » se range par statut, et Fonds n'offre que des facettes qui coupent", () => {
  it("ouvertes d'abord, à venir ensuite, clôturées en dernier et repliées", () => {
    expect(O).toMatch(/const parStatutDeSouscription = /);
    expect(O).toMatch(/\["open", "quoted"\]\.includes\(normStatus\(s\.st\)\)/);
    expect(O).toMatch(/b\.clef === "souscription-closes"/);
  });
  it("Fonds : une facette à une seule valeur ne s'offre pas, sauf déjà choisie ; sans facette, pas de bouton « Filtrer »", () => {
    expect(F).toMatch(/\.filter\(\(\[, , valeurs, choisi\]\) => valeurs\.length > 1 \|\| Boolean\(choisi\)\)/);
    expect(F).toMatch(/\{facettesDeFonds\.length > 0 && <button type="button" className=\{styles\.filtrer\}/);
  });
});
