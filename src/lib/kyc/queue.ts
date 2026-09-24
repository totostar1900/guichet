import { matchesPerson } from "@/lib/search/people";
import type { ClientFile } from "@/lib/domain/kyc";

/**
 * Ce que la colonne de gauche des Dossiers montre.
 *
 * Elle a été une file de travail : seulement ce qui n'était pas réglé, le
 * reste renvoyé au Répertoire. La file était courte, mais elle répondait à une
 * question que le desk ne pose pas si souvent (« qu'est-ce qui attend ») et
 * pas à celle qu'il pose tout le temps (« ouvre-moi untel »). La colonne porte
 * donc de nouveau tout le monde, en rangées d'une ligne et demie qui se
 * cherchent : trois cents rangées de ce format tiennent dans une colonne qui
 * défile, là où trois cents cartes ne tenaient pas.
 *
 * Ce qui attend garde sa marque et l'ordre de la page le met en tête : la file
 * n'a pas disparu, elle est devenue le haut de l'annuaire.
 *
 * La recherche elle-même est celle du Répertoire, à la virgule près : voir
 * `@/lib/search/people`. Deux recherches de personnes qui ne répondent pas
 * pareil, c'est une recherche à laquelle on cesse de se fier.
 */
export const waiting = (f: ClientFile): boolean => f.status === "soumis" || f.status === "en_revue" || f.status === "complements";

/** Ce sur quoi la colonne cherche : ce qu'elle montre, et ce qu'elle tait. */
const person = (f: ClientFile) => ({
  words: [f.identity.name, f.identity.email, f.identity.city, f.identity.country, f.identity.address, f.identity.registration, f.identity.taxId],
  phone: f.identity.phone,
});

export const clientMatches = (f: ClientFile, query: string): boolean => matchesPerson(person(f), query);

/** Tout le monde, dans l'ordre reçu, moins ce que la recherche écarte. */
export function clientDirectory(files: ClientFile[], query = ""): ClientFile[] {
  const q = query.trim();
  return q ? files.filter((f) => clientMatches(f, q)) : files;
}
