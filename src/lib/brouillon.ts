/**
 * L'ORDRE COMMENCÉ ET NON ENVOYÉ.
 *
 * DEMANDÉ LE 28 OCTOBRE 2026 : « sans date limite, s'assurer que l'ordre
 * commencé apparaisse dans les notifications tant qu'il n'est pas confirmé ou
 * annulé ». La question posée était « au bout de combien de temps un ordre
 * commencé cesse-t-il d'attendre ? », et la réponse est : jamais. Il attend
 * jusqu'à ce qu'il parte, ou jusqu'à ce que son auteur le jette.
 *
 * IL VIT SUR L'APPAREIL, ET NULLE PART AILLEURS. Rien n'a été envoyé : la
 * maison ne doit pas détenir un engagement que le client n'a pas pris, et le
 * desk ne doit pas voir au carnet un ordre dont personne ne lui a parlé. Un
 * brouillon est à l'ordre ce qu'une phrase commencée est à une lettre.
 *
 * Il ne porte donc QUE ce qu'il faut pour revenir : la ligne, le sens, le
 * montant. Ni coordonnées, ni message, ni canal — ce sont des données
 * personnelles, et elles se retrouvent toutes seules à l'étape suivante.
 *
 * CE QU'IL DEVIENT :
 *   · l'ordre part — il s'efface, c'est « confirmé » ;
 *   · son auteur le jette — il s'efface, c'est « annulé » ;
 *   · rien ne se passe — il reste, aussi longtemps qu'il faut.
 */
export interface Brouillon {
  offerId: string;
  /** Le nom de la ligne, pour que la notification dise de quoi elle parle. */
  titre: string;
  /** « achat », « ferme »… : l'adresse de reprise la repose telle quelle. */
  type: string;
  /** Ce qui a été tapé, en toutes lettres : « 1 200 000 », « 12,5 ». */
  montant: string;
  /** Quand il a été touché pour la dernière fois. Sert à l'afficher, pas à l'effacer. */
  le: string;
}

const CLEF = "guichet:brouillon";
/** Un signal, pour que la cloche se mette à jour sans recharger la page. */
export const SIGNAL = "guichet:brouillon";

/** Le brouillon gardé sur cet appareil, s'il y en a un. */
export function lireLeBrouillon(): Brouillon | null {
  try {
    const brut = localStorage.getItem(CLEF);
    if (!brut) return null;
    const b = JSON.parse(brut) as Brouillon;
    /* Un brouillon sans ligne ni montant ne se reprend pas : on le traite
       comme absent plutôt que de proposer une notification qui ne mène à
       rien. */
    return b?.offerId && b?.montant ? b : null;
  } catch {
    // Stockage indisponible (navigation privée, site bloqué) : pas de brouillon.
    return null;
  }
}

/**
 * Poser le brouillon, ou l'effacer quand il n'y a plus rien à garder.
 *
 * UN SEUL À LA FOIS, et c'est une décision : deux brouillons sur deux lignes
 * feraient deux notifications, donc une liste à gérer, pour un geste qu'on
 * reprend dans la minute ou qu'on oublie. Le dernier commencé est celui qu'on
 * cherche.
 */
export function poserLeBrouillon(b: Omit<Brouillon, "le"> | null): void {
  try {
    if (!b || !b.montant.trim()) localStorage.removeItem(CLEF);
    else localStorage.setItem(CLEF, JSON.stringify({ ...b, le: new Date().toISOString() }));
  } catch {
    // Stockage indisponible : le brouillon ne survit pas à la page, et c'est tout.
  }
  try {
    window.dispatchEvent(new Event(SIGNAL));
  } catch {
    // Hors navigateur : rien à prévenir.
  }
}

/** L'adresse qui rouvre l'ordre là où il avait été laissé. */
export const reprendre = (b: Brouillon): string => `/offres/${b.offerId}/intention?intent=${encodeURIComponent(b.type)}&qty=${encodeURIComponent(b.montant.replace(/\s/g, ""))}`;
