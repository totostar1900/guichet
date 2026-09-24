import { describe, expect, it } from "vitest";
import { matchesPerson, parsePeopleQuery, peopleMatch, type Person } from "@/lib/search/people";

/**
 * La recherche de personnes, commune à la colonne des Dossiers et au
 * Répertoire.
 *
 * Les deux cherchaient la même chose chacune à sa façon, sur quatre champs
 * différents et sans accents ni chiffres. Une recherche qui répond d'un côté
 * et pas de l'autre est pire qu'une recherche pauvre : on cesse de lui faire
 * confiance, et on ouvre la base pour vérifier. D'où une seule règle, ici.
 */
const p = (over: Partial<Person> = {}): Person => ({ words: ["Awa Mbarga", "awa@exemple.com", "Douala"], phone: "+237 699 88 77 66", tier: 1, whatsapp: false, email: false, file: false, orders: 0, ...over });

describe("chercher une personne", () => {
  it("ignore les accents et la casse, des deux côtés", () => {
    const g = p({ words: ["Gaëtan Ébodé"] });
    for (const q of ["gaetan", "GAËTAN", "ebode", "Ébodé"]) expect(matchesPerson(g, q), q).toBe(true);
  });

  it("demande que chaque mot réponde, pas seulement l'un d'eux", () => {
    // Sans cela, un second mot élargit la réponse au lieu de la resserrer, et
    // le desk n'a plus aucune raison d'en taper un second.
    expect(matchesPerson(p(), "awa douala")).toBe(true);
    expect(matchesPerson(p(), "awa kribi")).toBe(false);
  });

  it("cherche un numéro par ses chiffres, pas par son écriture", () => {
    for (const q of ["699 88", "699.88", "+237699", "69988776"]) expect(matchesPerson(p(), q), q).toBe(true);
    expect(matchesPerson(p(), "655")).toBe(false);
    // Et un chiffre ne trouve pas quelqu'un qui n'a pas de numéro.
    expect(matchesPerson(p({ phone: undefined }), "699")).toBe(false);
  });

  it("comprend les mots-clefs qui font ce que font les pastilles", () => {
    expect(matchesPerson(p({ tier: 2 }), "palier:2")).toBe(true);
    expect(matchesPerson(p({ tier: 1 }), "palier:2")).toBe(false);
    expect(matchesPerson(p({ tier: 2 }), "tier:compte")).toBe(true);
    expect(matchesPerson(p({ email: true }), "canal:email")).toBe(true);
    expect(matchesPerson(p({ email: true }), "canal:whatsapp")).toBe(false);
    expect(matchesPerson(p({ whatsapp: false, email: false }), "canal:aucun")).toBe(true);
    expect(matchesPerson(p({ file: false }), "dossier:non")).toBe(true);
    expect(matchesPerson(p({ orders: 3 }), "ordres:oui")).toBe(true);
    expect(matchesPerson(p({ orders: 0 }), "ordres:oui")).toBe(false);
  });

  it("combine un mot-clef et des mots, ce qu'aucune pastille ne fait seule", () => {
    // « les comptes ouverts sans dossier, chez les Mbarga » : c'est pour cela
    // que les mots-clefs existent, pas pour remplacer les pastilles.
    const q = parsePeopleQuery("palier:2 dossier:non mbarga");
    expect(q.tier).toBe(2);
    expect(q.file).toBe(false);
    expect(q.words).toEqual(["mbarga"]);
    expect(peopleMatch(p({ tier: 2, file: false }), q)).toBe(true);
    expect(peopleMatch(p({ tier: 2, file: true }), q)).toBe(false);
  });

  it("garde comme un mot ce qui ressemble à un mot-clef sans en être un", () => {
    // Une immatriculation porte des deux-points ; la prendre pour un filtre
    // rendrait zéro ligne sur une recherche parfaitement légitime.
    const q = parsePeopleQuery("rc/dla:2019");
    expect(q.words).toEqual(["rc/dla:2019"]);
    expect(q.unknown).toEqual([]);
  });

  it("dit ce qu'il n'a pas compris plutôt que de rendre zéro ligne en silence", () => {
    const q = parsePeopleQuery("palier:sept");
    expect(q.tier).toBeUndefined();
    expect(q.unknown).toEqual(["palier:sept"]);
  });

  it("rend tout le monde quand rien n'est demandé", () => {
    expect(matchesPerson(p(), "")).toBe(true);
    expect(matchesPerson(p(), "   ")).toBe(true);
  });
});
