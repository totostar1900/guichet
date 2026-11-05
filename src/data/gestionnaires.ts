/**
 * LES SOCIÉTÉS DE GESTION D'OPC : CE QUE LA MAISON SAIT D'ELLES (10 novembre 2026, planche « fonds » 3A).
 *
 * Le siège, le numéro et la date d'agrément de la COSUMAF s'affichent sur l'onglet « Société de gestion » d'un fonds. LE LIVRÉ EST VIDE, ET C'EST VOULU : aucun de ces faits
 * n'est écrit sans une source officielle lue (la liste actualisée des sociétés de gestion d'OPC de la COSUMAF, ou la décision d'agrément). Le desk les saisit dans
 * Référentiel › Sociétés de gestion, avec la source et le jour où il l'a relue ; une tuile sans valeur n'est pas écrite.
 *
 * La clef est le nom de la société tel que le bulletin le porte, mis en minuscules sans accent, les séparateurs en tirets : deux graphies du même nom donnent la même clef.
 */
export interface Gestionnaire {
  key: string;
  name: string;
  /** Ville et pays du siège, tels que la source les donne. */
  siege?: string;
  /** Numéro de la décision d'agrément. */
  agrementNo?: string;
  /** AAAA-MM-JJ. */
  agrementDate?: string;
  /** Où ces faits ont été lus : le texte ou l'adresse. Obligatoire. */
  source: string;
  /** AAAA-MM-JJ : le jour où le desk a relu la source. */
  verifiedOn: string;
}

export const GESTIONNAIRES: Gestionnaire[] = [];

export const cleDeGestionnaire = (nom: string): string =>
  nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
