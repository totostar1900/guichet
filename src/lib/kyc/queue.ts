import { fold } from "@/lib/text";
import type { ClientFile } from "@/lib/domain/kyc";

/**
 * Ce que la colonne de gauche des Dossiers montre, et comment elle cherche.
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
 */
export const waiting = (f: ClientFile): boolean => f.status === "soumis" || f.status === "en_revue" || f.status === "complements";

/** Un numéro ne se cherche pas comme un mot : « 699 88 » doit trouver « +237 699 88 77 66 ». */
const digits = (v: string) => v.replace(/\D+/g, "");

const fields = (f: ClientFile) => ({
  words: [f.identity.name, f.identity.email, f.identity.city, f.identity.country, f.identity.address, f.identity.registration, f.identity.taxId].map((v) => fold(v ?? "")).filter(Boolean),
  tel: digits(f.identity.phone ?? ""),
});

/**
 * Un dossier répond à une recherche quand chacun des mots tapés répond.
 *
 * Chacun, et non l'un d'eux : « awa douala » doit donner les Awa de Douala et
 * non tous les Awa plus tous les habitants de Douala. Un mot fait de chiffres
 * est comparé au numéro réduit à ses chiffres, de sorte que l'indicatif, les
 * espaces et les points n'aient pas à être tapés comme ils sont écrits.
 */
export function clientMatches(f: ClientFile, query: string): boolean {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const { words, tel } = fields(f);
  return tokens.every((tk) => {
    const numeric = !/[a-z]/.test(tk) && digits(tk).length >= 2;
    return (numeric && tel.includes(digits(tk))) || words.some((w) => w.includes(tk));
  });
}

/** Tout le monde, dans l'ordre reçu, moins ce que la recherche écarte. */
export function clientDirectory(files: ClientFile[], query = ""): ClientFile[] {
  const q = query.trim();
  return q ? files.filter((f) => clientMatches(f, q)) : files;
}
