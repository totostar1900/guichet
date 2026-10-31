import type { Favori, Offer, Watch } from "./types";
import { lignesSuivies } from "./suivies";
import { JOURS_URGENT, type Echeance } from "./echeances";

/**
 * LES FAVORIS D'UN CLIENT : DES LIGNES ET DES PAGES, DANS UNE LISTE.
 *
 * Décidé le 31 octobre 2026 : UNE SEULE ÉTOILE. La ligne qu'on met en favori
 * est la ligne qu'on suit — même geste, mêmes rappels — et la liste des
 * favoris n'a donc pas de table pour les lignes : elle relit les veilles.
 * Seules les PAGES (un éclairage, l'indice, un fonds) ont leur table.
 *
 * LES LIGNES PASSENT PAR « lignesSuivies », pas par un second calcul : une
 * veille dont l'offre a disparu n'est pas un favori, et la page « Lignes
 * suivies » l'écarte déjà.
 */
export interface Favoris {
  lignes: Offer[];
  pages: Favori[];
}

export const lesFavoris = (watches: Watch[], offers: Offer[], pages: Favori[]): Favoris => ({ lignes: lignesSuivies(watches, offers), pages });

/**
 * Ce qu'on accepte de mettre en favori : un chemin INTERNE d'une page de
 * lecture du client. Ni un domaine (un favori ne mène jamais hors de la
 * maison), ni une page qui n'a de sens que pour elle-même (les favoris, les
 * échéances), ni le desk, ni la connexion, ni les routes techniques.
 *
 * Rend le chemin nettoyé, ou « null » : la requête est gardée (« /fonds?cat=O »
 * est une page à part entière), le fragment ne l'est pas.
 */
const REFUSEES = ["/favoris", "/echeances", "/connexion", "/desk", "/api", "/auth", "/ouvrir-un-compte", "/ne-plus-recevoir"];
export function cheminDeFavori(brut: string): string | null {
  const s = brut.trim().split("#")[0];
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("\\") || /[\u0000-\u001f]/.test(s)) return null;
  const chemin = s.split("?")[0];
  if (REFUSEES.some((r) => chemin === r || chemin.startsWith(`${r}/`))) return null;
  // Une fiche de ligne se suit avec son étoile : c'est la ligne qui est le favori, pas sa page.
  if (chemin.startsWith("/offres/")) return null;
  return s.length > 300 ? null : s;
}

/** Les lignes qui ferment sous sept jours : le nombre que porte l'horloge, et rien en dessous de un. */
export const echeancesUrgentes = (e: Echeance[]): number => e.filter((x) => x.jours <= JOURS_URGENT).length;
