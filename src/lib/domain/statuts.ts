import { PHRASE_INTERDITE } from "./annonce";
import type { Offer } from "./types";

/**
 * LES STATUTS (17 novembre 2026, décidé sur la planche « Accueil et insights », idée 1) : UNE RANGÉE DE RONDS, UNE LIGNE PAR ROND, CHOISIE PAR LE DESK.
 *
 * Le desk décide quelles lignes y passent, dans quel ordre, et écrit le message de la première page. Le client touche un rond : une première page (le message,
 * le logo en fond), puis une page par ligne avec « Voir la fiche » et « Passer un ordre ». C'est une information de la maison : jamais un conseil, jamais une urgence.
 *
 * Ils vivent dans la table « reference » (genre « statut »), comme l'annonce : une ligne par ligne retenue, plus une ligne pour le message. Rien ne s'efface : une ligne
 * retirée garde la date et la personne.
 */
export const REF_STATUT = "statut";
export const STATUTS_MAX = 8;
export const MESSAGE_MIN = 8;
export const MESSAGE_MAX = 160;
export const MESSAGE_PAR_DEFAUT = "Les lignes que le bureau retient cette semaine.";

export interface StatutLigne {
  kind: "ligne";
  id: string;
  offerId: string;
  position: number;
  ajouteePar: string;
  ajouteeLe: string;
  retireeLe?: string;
  retireePar?: string;
}
export interface StatutMessage {
  kind: "message";
  id: "message";
  texte: string;
  par: string;
  le: string;
}
export type StatutRow = StatutLigne | StatutMessage;

export const idDeLigne = (offerId: string): string => `l-${offerId}`;

/** Le message refusé, ou rien quand il est recevable (même règle que l'annonce : ni conseil, ni promesse, ni urgence). */
export function verifierMessage(texte: string): string | undefined {
  const t = texte.trim();
  if (t.length < MESSAGE_MIN) return `Écrivez une phrase d'au moins ${MESSAGE_MIN} caractères.`;
  if (t.length > MESSAGE_MAX) return `Le message tient en ${MESSAGE_MAX} caractères au plus.`;
  if (PHRASE_INTERDITE.test(t)) return "Le message informe : ni conseil, ni promesse, ni urgence (« meilleur », « garanti », « dernière chance »…).";
  return undefined;
}

/** Les lignes retenues, non retirées, dans l'ordre du desk. */
export const lignesRetenues = (rows: StatutRow[]): StatutLigne[] =>
  rows
    .filter((r): r is StatutLigne => r.kind === "ligne" && !r.retireeLe)
    .sort((a, b) => a.position - b.position || a.ajouteeLe.localeCompare(b.ajouteeLe));

export const messageDe = (rows: StatutRow[]): string => rows.find((r): r is StatutMessage => r.kind === "message")?.texte ?? MESSAGE_PAR_DEFAUT;

/**
 * Ce que le client voit : les lignes retenues QUI EXISTENT ENCORE parmi celles qu'il peut lire (publiées, non masquées). Une ligne retirée du catalogue sort de la
 * rangée sans que le desk ait rien à faire ; elle reste écrite, et le desk la voit « hors catalogue ».
 */
export function statutsAffiches(rows: StatutRow[], visibles: Offer[]): { ligne: StatutLigne; offre: Offer }[] {
  const parId = new Map(visibles.map((o) => [o.id, o]));
  return lignesRetenues(rows)
    .map((ligne) => ({ ligne, offre: parId.get(ligne.offerId) }))
    .filter((x): x is { ligne: StatutLigne; offre: Offer } => Boolean(x.offre))
    .slice(0, STATUTS_MAX);
}
