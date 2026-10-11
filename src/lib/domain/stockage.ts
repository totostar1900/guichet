/**
 * LE PLAFOND DU STOCKAGE, ANNONCÉ AVANT QU'IL NE TOMBE.
 *
 * La maison reste au plan gratuit de Supabase, décidé le 11 octobre 2026 en
 * connaissance de cause : la base ne pèse rien, et la vraie échéance est le
 * gigaoctet de stockage. Une décision prise pour plus tard n'est dangereuse
 * que si « plus tard » arrive sans prévenir.
 *
 * On ne mesure donc pas un pourcentage, on mesure un NOMBRE DE JOURS. « 81 %
 * occupé » ne dit pas s'il faut agir cette semaine ou dans six mois ; « il
 * reste vingt-trois jours » le dit, et c'est la seule forme sur laquelle on
 * peut décider.
 */

/**
 * Le plafond du plan en cours, en octets. Plan gratuit : un gigaoctet.
 *
 * IL SE CHANGE À LA MAIN AVEC LE PLAN, et c'est voulu : lu quelque part,
 * il suivrait l'abonnement en silence et le point cesserait d'alerter sans
 * que personne ne l'ait décidé. Au passage à Pro, le porter à 8 Go.
 */
export const PLAFOND_STOCKAGE = 1024 * 1024 * 1024;

export interface Stockage {
  octets: number;
  fichiers: number;
  /** La MÉDIANE des octets ajoutés par jour sur trente jours. */
  octetsParJour: number;
}

export interface LectureDuStockage {
  /** Part occupée, de 0 à 1. */
  part: number;
  /** Octets par jour, sur les trente derniers. */
  parJour: number;
  /** Jours avant le plafond au rythme observé ; absent si rien ne grossit. */
  jours?: number;
}

/**
 * Ce que le stockage dit de lui-même.
 *
 * UNE REPRISE HISTORIQUE N'EST PAS UNE PENTE, et la fenêtre glissante ne
 * suffit pas à s'en protéger : c'est l'erreur que cette fonction a faite en
 * naissant. Le versement des bulletins passés, 576 Mo le 14 septembre 2026,
 * tombait DANS la fenêtre de trente jours ; la moyenne donnait 21,8 Mo par
 * jour et annonçait le plafond pour dans dix-sept jours, quand le rythme
 * réel est de 1,7. Le point serait né rouge, et un point qui naît rouge
 * pour une mauvaise raison n'est jamais cru la fois d'après.
 *
 * La MÉDIANE des additions journalières ne bronche pas devant un versement
 * unique. Elle sous-estime en revanche si les reprises deviennent la règle,
 * et c'est le bon sens de l'erreur : la conduite à tenir dit qu'une nouvelle
 * reprise mange le reste d'un coup.
 */
export function lireLeStockage(s: Stockage, plafond = PLAFOND_STOCKAGE): LectureDuStockage {
  const parJour = Math.max(0, s.octetsParJour);
  const reste = Math.max(0, plafond - s.octets);
  return {
    part: plafond > 0 ? s.octets / plafond : 0,
    parJour,
    jours: parJour > 0 ? Math.floor(reste / parJour) : undefined,
  };
}

/** Soixante jours pour décider, vingt et un pour agir : un abonnement se prend sans courir. */
export const JOURS_POUR_DECIDER = 60;
export const JOURS_POUR_AGIR = 21;

export function niveauDuStockage(l: LectureDuStockage): "ok" | "warn" | "crit" {
  if (l.jours == null) return "ok";
  if (l.jours <= JOURS_POUR_AGIR) return "crit";
  if (l.jours <= JOURS_POUR_DECIDER) return "warn";
  return "ok";
}

export const enGo = (octets: number): string => `${(octets / (1024 * 1024 * 1024)).toFixed(2)} Go`;
export const enMo = (octets: number): string => `${Math.round(octets / (1024 * 1024))} Mo`;
