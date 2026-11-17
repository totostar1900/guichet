/**
 * QUATRE FACETTES QUE LES LIGNES PORTENT, ET QUE LA FEUILLE « FILTRER » N'OFFRAIT PAS (17 novembre 2026, planche « Investir », 2).
 *
 * La clôture, le ticket minimum, le dividende et le sens de la variation se lisent déjà sur chaque carte ; ils ne se filtraient pas, si bien que la feuille d'une sélection d'une ou deux lignes
 * ouvrait sur rien. Chaque facette est une valeur par ligne, ou aucune quand la ligne n'a pas la donnée : une ligne sans clôture n'est ni « passée » ni « plus tard ». Module sans dépendance.
 */
export type CleDeFacette = "cloture" | "ticket" | "dividende" | "variation";

/** Les valeurs de chaque facette, dans l'ordre où la feuille les montre. Les libellés sont des clefs de traduction. */
export const VALEURS_DE_FACETTE: Record<CleDeFacette, [string, string][]> = {
  cloture: [
    ["7j", "Sous 7 jours"],
    ["30j", "Sous 30 jours"],
    ["plus", "Plus tard"],
    ["passee", "Passée"],
  ],
  ticket: [
    ["petit", "Moins de 100 000 FCFA"],
    ["moyen", "100 000 à 1 000 000 FCFA"],
    ["grand", "Plus de 1 000 000 FCFA"],
  ],
  dividende: [
    ["avec", "Avec dividende"],
    ["sans", "Sans dividende"],
  ],
  variation: [
    ["hausse", "En hausse"],
    ["baisse", "En baisse"],
  ],
};

export const TITRE_DE_FACETTE: Record<CleDeFacette, string> = { cloture: "Clôture", ticket: "Ticket minimum", dividende: "Dividende", variation: "Variation sur 3 mois" };

const JOUR = 86_400_000;

/** « Sous 7 jours », « Sous 30 jours », « Plus tard », « Passée » : depuis maintenant, ou rien sans date de clôture. */
export function fenetreDeCloture(clotureMs: number | undefined, maintenantMs: number): string | undefined {
  if (clotureMs == null || Number.isNaN(clotureMs)) return undefined;
  const d = clotureMs - maintenantMs;
  return d < 0 ? "passee" : d <= 7 * JOUR ? "7j" : d <= 30 * JOUR ? "30j" : "plus";
}

/** Le ticket minimum en FCFA, rangé en trois tranches ; rien sans ticket. */
export function trancheDeTicket(montant: number | undefined): string | undefined {
  if (montant == null || !(montant > 0)) return undefined;
  return montant < 100_000 ? "petit" : montant <= 1_000_000 ? "moyen" : "grand";
}

/** Le sens d'une variation connue ; une variation nulle ne dit rien, et n'est ni hausse ni baisse. */
export function sensDeVariation(pct: number | undefined): string | undefined {
  if (pct == null || pct === 0) return undefined;
  return pct > 0 ? "hausse" : "baisse";
}
