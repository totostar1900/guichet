import { RACINES } from "./nav-profondeur";

/**
 * LE RUBAN DES SEPT RACINES (18 novembre 2026, planche « Statuts et mouvement », 3C) : Accueil · Activité · Titres · Fonds · Adjudications · Marché · Aide.
 *
 * La barre du bas n'en montre que cinq (Investir porte les trois du milieu), mais un balayage et le glissement d'une page à l'autre suivent les sept, dans l'ordre de `RACINES`.
 * Aller vers une racine plus loin dans le ruban glisse vers la gauche (« nav-avant »), revenir vers une plus proche du début glisse vers la droite (« nav-retour »).
 */
const nettoyer = (chemin: string) => chemin.split("?")[0].replace(/(.)\/$/, "$1");

export const rangDe = (chemin: string): number => (RACINES as readonly string[]).indexOf(nettoyer(chemin));

/** Le sens du glissement pour aller de `de` à `vers` : rien quand l'une des deux n'est pas une racine ou quand c'est la même. */
export function sensEntre(de: string, vers: string): string[] | undefined {
  const a = rangDe(de);
  const b = rangDe(vers);
  if (a < 0 || b < 0 || a === b) return undefined;
  return [b > a ? "nav-avant" : "nav-retour"];
}

/** La racine voisine dans le ruban (+1 : la suivante, -1 : la précédente), ou rien aux deux bouts. */
export function racineVoisine(chemin: string, pas: 1 | -1): string | undefined {
  const i = rangDe(chemin);
  return i < 0 ? undefined : RACINES[i + pas];
}
