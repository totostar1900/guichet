import type { MarketBulletin } from "./market";

/**
 * « IL N'Y EST PAS » : LE DESK RÉPOND À UNE REMARQUE DU LECTEUR.
 *
 * LE CONSTAT. Au 11 octobre 2026, devant une remarque, le desk n'avait qu'un
 * seul levier : « Relire ». Mesuré le même jour par essai à blanc sur les 212
 * séances en attente, ce levier ne rend RIEN : 208 séances rendent exactement
 * la même chose, parce que le lecteur d'aujourd'hui lit déjà tout ce que ces
 * PDF portent. Un desk consciencieux appuyait donc sur un bouton qui ne change
 * rien, et n'avait aucun moyen de dire qu'il avait regardé. La remarque était
 * immortelle : elle reparaissait le lendemain, identique.
 *
 * ET LE POINT DE SANTÉ NE POUVAIT PAS DEVENIR VERT. 38 des 212 séances sont
 * retenues par les seuls codes de date : on leur reproche de ne pas porter
 * l'indice BVMAC (absent du bulletin avant le 12/12/2023) ou la table OPCVM
 * (avant le 04/08/2023). Un point rouge quoi qu'on fasse finit par ne plus
 * être lu, ce qui est la façon la plus sûre de perdre une alarme utile.
 *
 * UN JUGEMENT NE CORRIGE RIEN, ET C'EST TOUTE SA SÛRETÉ. Il ne touche ni un
 * cours, ni une VL, ni le statut que le lecteur a posé : la lecture de la
 * machine reste ce qu'elle est, intacte et relisible. Il dit seulement « une
 * personne a regardé, voici ce qu'elle a vu ». C'est pour cela qu'il n'ouvre
 * aucun chemin d'écriture vers les données, et qu'il peut donc se construire
 * avant l'ancre, qui en ouvre un.
 */

/**
 * Ce qu'un jugement peut dire. Liste fermée : un motif libre redeviendrait
 * une phrase.
 *
 * UNE LISTE FERMÉE À LAQUELLE MANQUE LE MOTIF VRAI NE PRODUIT PAS DU SILENCE,
 * ELLE PRODUIT DES FAUX. Les cinq premiers motifs veulent tous dire « cesse
 * de demander ». Le 12 octobre 2026, devant le bulletin du 22 décembre 2023,
 * Georges a cherché comment dire « la ligne est là, page 2, parfaitement
 * lisible, c'est le lecteur qui l'a manquée » : le plus proche affirmait que
 * le document est illisible à cet endroit, ce qui est faux. Signer cela aurait
 * mis au registre une affirmation fausse sur un document, et cette signature
 * aurait ensuite servi à ne plus jamais relire la séance.
 *
 * Le sixième motif répare ce trou, et il a une propriété que les cinq autres
 * n'ont pas : il NE FERME PAS la remarque. Il la redirige. La séance quitte la
 * pile « une personne doit regarder » pour la pile « le lecteur doit être
 * corrigé », et elle y reste jusqu'à ce qu'il le soit.
 */
export const MOTIFS_DE_JUGEMENT = {
  pas_encore_publie: {
    libelle: "La bourse ne publiait pas encore cette donnée",
    dit: "Le document ne peut pas la porter : elle n'existait pas à cette date.",
    /* LE SEUL MOTIF QUI VAUT POUR UNE PÉRIODE, et la raison est de fond : un
       jugement sur une période est une affirmation sur l'HISTOIRE DE LA PLACE,
       que l'on peut tenir sans ouvrir un document. Les autres motifs sont des
       affirmations sur UN document, et personne ne lit cent douze PDF. */
    surUnePeriode: true,
    ferme: true,
    exigeLaPage: false,
  },
  absent_du_document: {
    libelle: "Regardé : la donnée n'est pas dans ce document",
    dit: "Le document a été ouvert à la page indiquée, la donnée n'y figure pas.",
    surUnePeriode: false,
    ferme: true,
    exigeLaPage: true,
  },
  illisible_a_la_source: {
    libelle: "Elle y est, mais le document est illisible à cet endroit",
    dit: "La donnée est imprimée et le document l'abîme : ni le lecteur ni une personne ne peut la relever.",
    surUnePeriode: false,
    ferme: true,
    exigeLaPage: true,
  },
  vraie_sortie_de_cote: {
    libelle: "La ligne a réellement quitté la cote",
    dit: "Ce n'est pas un défaut de lecture : la ligne n'est plus cotée, et elle ne reviendra pas.",
    surUnePeriode: false,
    ferme: true,
    exigeLaPage: false,
  },
  vrai_mouvement: {
    libelle: "Le mouvement est réel",
    dit: "Le saut de valeur a été vérifié à la source : le marché a bougé, le lecteur a bien lu.",
    surUnePeriode: false,
    ferme: true,
    exigeLaPage: false,
  },
  le_lecteur_l_a_manquee: {
    libelle: "Le lecteur l'a manquée : la donnée est là, et lisible",
    dit: "Le document porte la ligne à la page indiquée, et une personne l'a lue sans peine. C'est le lecteur qui doit être corrigé, donc la remarque reste ouverte.",
    surUnePeriode: false,
    /* IL NE FERME PAS. Enterrer un défaut du lecteur sous un jugement serait
       la façon la plus propre de ne jamais le corriger. */
    ferme: false,
    exigeLaPage: true,
  },
} as const;

export type MotifDeJugement = keyof typeof MOTIFS_DE_JUGEMENT;
export const MOTIFS = Object.keys(MOTIFS_DE_JUGEMENT) as MotifDeJugement[];
export const motifSurUnePeriode = (m: MotifDeJugement): boolean => MOTIFS_DE_JUGEMENT[m].surUnePeriode;
/** Ce motif fait-il cesser la question, ou la redirige-t-il vers le lecteur ? */
export const motifFerme = (m: MotifDeJugement): boolean => MOTIFS_DE_JUGEMENT[m].ferme;
/** Ce motif affirme quelque chose sur un endroit du document : il exige la page. */
export const motifExigeLaPage = (m: MotifDeJugement): boolean => MOTIFS_DE_JUGEMENT[m].exigeLaPage;

/**
 * Le jugement d'une personne sur une remarque du lecteur.
 *
 * DEUX PORTÉES, et la seconde est ce qui rend le geste praticable. Une
 * remarque sur une séance se juge séance par séance. Mais « Indice BVMAC
 * introuvable » est identique sur cent douze séances, et demander cent douze
 * gestes aurait garanti que personne n'en fasse aucun. Une portée de période
 * ferme une famille entière d'une seule phrase, et la période est bornée par
 * la date à laquelle la bourse a commencé à publier.
 */
export interface JugementBulletin {
  id: string;
  portee: "seance" | "periode";
  motif: MotifDeJugement;
  /** Portée « séance » : la séance visée. */
  seance?: string;
  /**
   * Portée « séance » : la remarque visée, mot pour mot.
   *
   * ON VISE LA PHRASE, PAS UN NUMÉRO DE LIGNE. Une lecture n'a pas d'index
   * stable : relire une séance réordonne ses remarques, et un jugement
   * accroché au troisième rang se retrouverait sur une autre phrase. Viser le
   * texte a une conséquence voulue : si la remarque change, le jugement cesse
   * de s'appliquer et la remarque revient. C'est exactement ce qu'on veut,
   * puisqu'un jugement porte sur un énoncé précis et non sur une séance en
   * général.
   */
  cible?: string;
  /** Portée « période » : la famille visée (la lettre de remarques.ts) et ses bornes. */
  famille?: string;
  depuis?: string;
  jusquau?: string;
  /**
   * La page du document où la personne a regardé.
   *
   * Exigée par les motifs qui affirment quelque chose sur un ENDROIT : « j'ai
   * regardé, ce n'est pas là », « c'est là et c'est illisible », « le lecteur
   * l'a manquée ». Sans elle ces trois phrases ne sont pas vérifiables, et
   * une affirmation invérifiable sur un document ne vaut pas qu'on la signe.
   */
  page?: number;
  /** Ce que la personne ajoute, et qui n'est jamais le fait lui-même. */
  note?: string;
  par: string;
  parNom?: string;
  at: string;
  /** Retiré, jamais supprimé : un jugement faux doit laisser sa trace. */
  retireLe?: string;
  retirePar?: string;
}

export const jugementVivant = (j: JugementBulletin): boolean => !j.retireLe;

/**
 * Ce jugement couvre-t-il cette remarque de cette séance ?
 *
 * Le classement en familles vit dans `remarques.ts`, qui est pur lui aussi ;
 * on le reçoit en paramètre plutôt que de l'importer, pour que ce module
 * reste jugeable sans monter le classeur.
 */
export function couvre(j: JugementBulletin, seance: string, phrase: string, codeDeLaPhrase: (p: string) => string): boolean {
  if (!jugementVivant(j)) return false;
  /* UN MOTIF QUI NE FERME PAS NE COUVRE PAS. « Le lecteur l'a manquée » vise
     la même remarque, mais il ne la retire pas de la file : il dit où
     regarder, et la question reste posée au lecteur. */
  if (!motifFerme(j.motif)) return false;
  if (j.portee === "seance") return j.seance === seance && j.cible === phrase;
  if (j.famille !== codeDeLaPhrase(phrase)) return false;
  if (j.depuis && seance < j.depuis) return false;
  if (j.jusquau && seance > j.jusquau) return false;
  return true;
}

/**
 * Ce que le desk a INDIQUÉ, et qui attend le lecteur et non une personne.
 *
 * On les compte à part : ce sont les seules remarques dont on sait déjà
 * qu'elles valent un travail de lecteur, et où regarder pour le faire.
 */
export function indications(
  b: Pick<MarketBulletin, "sessionDate" | "warnings" | "anomalies">,
  jugements: JugementBulletin[],
): { phrase: string; page?: number; par: string; note?: string }[] {
  const phrases = new Set([...(b.anomalies ?? []), ...(b.warnings ?? [])]);
  return jugements
    .filter((j) => jugementVivant(j) && !motifFerme(j.motif) && j.portee === "seance" && j.seance === b.sessionDate && j.cible && phrases.has(j.cible))
    .map((j) => ({ phrase: j.cible!, page: j.page, par: j.par, note: j.note }));
}

/** Les remarques d'une séance que personne n'a encore jugées. */
export function remarquesNonJugees(
  b: Pick<MarketBulletin, "sessionDate" | "warnings" | "anomalies">,
  jugements: JugementBulletin[],
  codeDeLaPhrase: (p: string) => string,
): string[] {
  const phrases = [...(b.anomalies ?? []), ...(b.warnings ?? [])];
  return phrases.filter((p) => !jugements.some((j) => couvre(j, b.sessionDate, p, codeDeLaPhrase)));
}

/**
 * Cette séance attend-elle encore quelqu'un ?
 *
 * LE STATUT DU LECTEUR N'EST JAMAIS RÉÉCRIT. On ne fait pas passer une séance
 * en « ok » parce qu'une personne a jugé : la machine a lu ce qu'elle a lu, et
 * son verdict reste consultable tel quel. L'attente est une couche au-dessus,
 * et c'est la seule chose que le jugement déplace.
 *
 * LE GARDE DES SÉANCES SANS AUCUN COURS. Une séance qui ne porte aucun cours
 * d'action ne quitte pas la file sur le seul silence : il faut qu'une
 * personne ait dit quelque chose SUR ELLE. Sans ce garde, un jugement de
 * période fermerait une séance entièrement vide au passage, et c'est le genre
 * de trou qu'on ne retrouve que des mois plus tard.
 */
export function attendEncore(
  b: Pick<MarketBulletin, "sessionDate" | "status" | "counts" | "warnings" | "anomalies">,
  jugements: JugementBulletin[],
  codeDeLaPhrase: (p: string) => string,
): boolean {
  if (b.status === "ok" && b.counts?.equities) return false;
  if (remarquesNonJugees(b, jugements, codeDeLaPhrase).length > 0) return true;
  /* LE LECTEUR A SIGNALÉ QUELQUE CHOSE QUI NE SE JUGE PAS. Un statut « partiel »
     ou « échec » sans aucune remarque ne devrait pas exister, puisque le statut
     se calcule depuis les remarques ; s'il arrive quand même, PERSONNE ne peut
     fermer cette séance, et la faire disparaître de la file la rendrait
     invisible pour toujours. Elle reste donc, avec son statut pour seule
     explication. */
  if (b.status !== "ok" && [...(b.anomalies ?? []), ...(b.warnings ?? [])].length === 0) return true;
  if (!b.counts?.equities) return !jugements.some((j) => jugementVivant(j) && j.portee === "seance" && j.seance === b.sessionDate);
  return false;
}

/** Ce qu'un jugement de période fermerait, pour le montrer avant de l'enregistrer. */
export function porteeDUnJugement(
  j: JugementBulletin,
  bulletins: Pick<MarketBulletin, "sessionDate" | "warnings" | "anomalies">[],
  codeDeLaPhrase: (p: string) => string,
): { seances: number; remarques: number } {
  let seances = 0;
  let remarques = 0;
  for (const b of bulletins) {
    const n = [...(b.anomalies ?? []), ...(b.warnings ?? [])].filter((p) => couvre(j, b.sessionDate, p, codeDeLaPhrase)).length;
    if (n > 0) {
      seances += 1;
      remarques += n;
    }
  }
  return { seances, remarques };
}
