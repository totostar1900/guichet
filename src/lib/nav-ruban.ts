import { RACINES } from "./nav-profondeur";

/**
 * LE RUBAN DU BALAYAGE : CINQ PLACES (18 novembre 2026, planche « Le balayage », 2A ; avant, sept racines).
 *
 * Accueil · Activité · Investir · Marché · Aide, comme la barre du bas. Investir porte trois sections (Titres, Fonds, Adjudications) mais ne compte que pour UNE place : un balayage la quitte d'un seul geste (avant, il en fallait trois pour passer de Titres à Marché).
 * Les trois sections se changent par leurs onglets du haut, et par un balayage posé sur la rangée d'onglets (`data-balayage-sections`).
 * En arrivant dans Investir par un balayage, on retrouve la dernière section vue (« derniere »), Titres à défaut.
 *
 * Aller vers une place plus loin dans le ruban glisse vers la gauche (« nav-avant »), revenir vers une plus proche du début glisse vers la droite (« nav-retour »).
 */
const nettoyer = (chemin: string) => chemin.split("?")[0].replace(/(.)\/$/, "$1");

/** Les trois sections de la place Investir, dans l'ordre des onglets. */
export const SECTIONS_INVESTIR = ["/titres", "/fonds", "/calendrier"] as const;
/** Les cinq places ; Investir est nommée par sa première section, que la barre du bas ouvre aussi. */
export const PLACES = ["/", "/activite", "/titres", "/marche", "/place", "/aide"] as const;
/** Les places que le ruban saute quand l'interrupteur de la place de marché est fermé : le balayage ne mène jamais à une page qui répond 404. */
const SANS_PLACE = ["/place"];

/** Le rang d'une racine parmi les sept (l'ordre des onglets d'Investir en dépend). */
export const rangDe = (chemin: string): number => (RACINES as readonly string[]).indexOf(nettoyer(chemin));

/** La place d'une racine dans le ruban de cinq : les trois sections d'Investir n'en font qu'une. -1 hors ruban. */
export function placeDe(chemin: string): number {
  const c = nettoyer(chemin);
  if ((SECTIONS_INVESTIR as readonly string[]).includes(c)) return PLACES.indexOf("/titres");
  return (PLACES as readonly string[]).indexOf(c);
}

/** Le sens du glissement pour aller de `de` à `vers` : rien quand l'une des deux n'est pas une racine ou quand c'est la même. Entre deux sections d'Investir, l'ordre des onglets. */
export function sensEntre(de: string, vers: string): string[] | undefined {
  const a = placeDe(de);
  const b = placeDe(vers);
  if (a < 0 || b < 0) return undefined;
  if (a !== b) return [b > a ? "nav-avant" : "nav-retour"];
  const ra = rangDe(de);
  const rb = rangDe(vers);
  return ra === rb ? undefined : [rb > ra ? "nav-avant" : "nav-retour"];
}

/**
 * La place voisine dans le ruban (+1 : la suivante, -1 : la précédente), ou rien aux deux bouts. Quand c'est Investir, la dernière section vue (`derniere`), Titres à défaut.
 */
export function racineVoisine(chemin: string, pas: 1 | -1, derniere?: string, placeOuverte = true): string | undefined {
  const i = placeDe(chemin);
  if (i < 0) return undefined;
  const ruban = placeOuverte ? PLACES : PLACES.filter((p) => !SANS_PLACE.includes(p));
  const j = ruban.indexOf(PLACES[i]);
  if (j < 0) return undefined;
  const v = ruban[j + pas];
  if (v === "/titres") return derniere && (SECTIONS_INVESTIR as readonly string[]).includes(derniere) ? derniere : "/titres";
  return v;
}

/** La section voisine d'Investir (balayage sur la rangée d'onglets), ou rien aux deux bouts et hors d'Investir. */
export function sectionVoisine(chemin: string, pas: 1 | -1): string | undefined {
  const c = nettoyer(chemin);
  const i = (SECTIONS_INVESTIR as readonly string[]).indexOf(c);
  return i < 0 ? undefined : SECTIONS_INVESTIR[i + pas];
}

/** Le mot de la place où le geste mène, pour l'aperçu dans l'écart (la clé de traduction est le mot lui-même). */
export const NOM_DE_PLACE: Record<string, string> = {
  "/": "Accueil",
  "/activite": "Activité",
  "/titres": "Investir",
  "/fonds": "Fonds",
  "/calendrier": "Adjudications",
  "/marche": "Marché",
  "/place": "Place",
  "/aide": "Aide",
};
