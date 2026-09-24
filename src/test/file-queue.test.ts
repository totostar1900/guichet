import { describe, expect, it } from "vitest";
import { clientDirectory, clientMatches, waiting } from "@/lib/kyc/queue";
import type { ClientFile } from "@/lib/domain/kyc";

/**
 * La colonne de gauche des Dossiers.
 *
 * Elle a d'abord porté tous les dossiers en cartes, puis seulement ce qui
 * attendait une main, l'annuaire étant parti au Répertoire. La file était
 * courte, mais elle répondait à une question qu'on pose rarement plutôt qu'à
 * celle qu'on pose tout le temps : « ouvre-moi untel ». Elle porte donc de
 * nouveau tout le monde, en rangées d'une ligne et demie, et c'est la
 * recherche qui fait le travail. Ce qui suit la tient honnête.
 */
const file = (id: string, status: ClientFile["status"], name = id, over: Partial<ClientFile["identity"]> = {}): ClientFile =>
  ({ id, userId: `u-${id}`, status, kind: "physique", identity: { name, city: "Douala", ...over }, updatedAt: "2026-09-24T10:00:00Z" }) as unknown as ClientFile;

const ALL = [file("a", "soumis", "Awa Mbarga"), file("b", "en_revue", "Blaise Ondo"), file("c", "complements", "Chantal Eyenga"), file("d", "approuve", "Didier Nkolo"), file("e", "clos", "Estelle Mvondo"), file("f", "brouillon", "Fabrice Abega")];

describe("l'annuaire des dossiers", () => {
  it("porte tout le monde quand on ne cherche rien", () => {
    // C'est le changement : la colonne n'écarte plus les dossiers réglés, sans
    // quoi le desk devait passer par le Répertoire pour rouvrir un client.
    expect(clientDirectory(ALL).map((f) => f.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(clientDirectory(ALL, "   ")).toHaveLength(6);
  });

  it("marque encore ce qui attend une main", () => {
    // « Compléments » attend le client, pas le classement : un dossier en
    // attente de pièces se relance, donc il compte comme en attente.
    expect(waiting(file("x", "complements"))).toBe(true);
    expect(waiting(file("y", "approuve"))).toBe(false);
    expect(waiting(file("z", "brouillon"))).toBe(false);
  });

  it("cherche dans tous les états, y compris les dossiers clos", () => {
    expect(clientDirectory(ALL, "Estelle").map((f) => f.id)).toEqual(["e"]);
    expect(clientDirectory(ALL, "nkolo").map((f) => f.id)).toEqual(["d"]);
  });

  it("ignore la casse et les accents", () => {
    const list = [file("g", "clos", "Gaëtan Ébodé")];
    for (const q of ["gaetan", "GAËTAN", "ebode"]) expect(clientDirectory(list, q).map((f) => f.id), q).toEqual(["g"]);
  });

  it("trouve un numéro comme on s'en souvient, pas comme il est écrit", () => {
    // Le desk tape « 699 88 » ; la base porte « +237 699 88 77 66 ». Les
    // espaces, les points et l'indicatif ne doivent pas être à retaper.
    const list = [file("h", "approuve", "Hervé Fouda", { phone: "+237 699 88 77 66" })];
    for (const q of ["699 88", "699.88", "+237699", "69988776"]) expect(clientDirectory(list, q).map((f) => f.id), q).toEqual(["h"]);
    expect(clientDirectory(list, "655").map((f) => f.id)).toEqual([]);
  });

  it("demande que chaque mot réponde, pas seulement l'un d'eux", () => {
    // « awa douala » doit donner les Awa de Douala, et non tous les Awa plus
    // tous les habitants de Douala : c'est ce qui rend deux mots utiles.
    const list = [file("i", "soumis", "Awa Mbarga", { city: "Douala" }), file("j", "soumis", "Awa Ngo", { city: "Kribi" }), file("k", "soumis", "Paul Eto", { city: "Douala" })];
    expect(clientDirectory(list, "awa douala").map((f) => f.id)).toEqual(["i"]);
    expect(clientDirectory(list, "awa").map((f) => f.id)).toEqual(["i", "j"]);
  });

  it("cherche aussi la ville, l'adresse, l'e-mail et l'immatriculation", () => {
    const list = [file("l", "clos", "Gaston Biya", { city: "Kribi", email: "gaston@exemple.com", address: "rue des Manguiers", registration: "RC/DLA/2019/B/1234" })];
    for (const q of ["kribi", "gaston@exemple", "manguiers", "b/1234"]) expect(clientMatches(list[0], q), q).toBe(true);
  });
});
