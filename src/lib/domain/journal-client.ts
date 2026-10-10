/**
 * LE JOURNAL DES GESTES D'UN CLIENT.
 *
 * Sur les quarante et un gestes qu'un client peut faire dans le Guichet, huit
 * laissaient une trace au 10 octobre 2026, et seulement parce qu'ils
 * touchaient à une décision du desk. Les trente-trois autres, signer un
 * mandat, prouver un numéro, déposer une pièce, enrôler une clef, abandonner
 * un dossier à mi-chemin, ne s'écrivaient nulle part : la maison ne savait de
 * son client que ce qu'il avait acheté.
 *
 * POURQUOI UN SECOND REGISTRE, ET NON LA CHAÎNE D'AUDIT. L'audit enchaîne
 * chaque maillon au précédent par un condensé, ce qui lui impose de relire son
 * dernier maillon avant chaque écriture. C'est juste pour une décision du
 * desk, et intenable pour des milliers de gestes de clients : chaque écriture
 * deviendrait une lecture puis une écriture, sérialisées. Mêmes colonnes donc,
 * sans la chaîne. L'audit reste le registre des DÉCISIONS, celui-ci est le
 * registre des GESTES.
 *
 * CE QUI N'Y ENTRE PAS, et c'est une limite tenue : ni la durée d'une visite,
 * ni le défilement, ni la souris, ni l'ordre des écrans. Une consultation s'y
 * écrit par l'objet regardé, une fois par jour et par objet. L'objet dit déjà
 * ce qu'on veut savoir ; le reste ferait un journal de lecture, qu'il faudrait
 * justifier et qui n'apprendrait rien de plus.
 */

/** Les familles, pour filtrer un registre de milliers de lignes. */
export const GENRES = ["ordre", "especes", "piece", "canal", "securite", "consultation", "relation"] as const;
export type Genre = (typeof GENRES)[number];

export const GENRE_LABEL: Record<Genre, string> = {
  ordre: "Ordre",
  especes: "Espèces",
  piece: "Pièce du dossier",
  canal: "Canal et consentement",
  securite: "Sécurité",
  consultation: "Consultation",
  relation: "Relation",
};

/**
 * Le catalogue des gestes : un nom stable, sa famille, et la phrase qui le dit.
 *
 * LA PHRASE EST ICI, PAS À L'APPEL. Elle se lit dans deux écrans, celui du
 * desk et celui du client, et dans deux langues. Écrite à l'appel, elle
 * dériverait d'un endroit à l'autre et il faudrait relire quarante fichiers
 * pour savoir ce qu'un geste raconte.
 *
 * Le nom ne change JAMAIS une fois posé : il est écrit dans des lignes déjà
 * enregistrées. Un geste qui change de sens prend un nouveau nom.
 */
export interface Geste {
  genre: Genre;
  /** Au client, à la deuxième personne. */
  phrase: string;
  /** Au desk, à la troisième. */
  auDesk: string;
}

export const GESTES: Record<string, Geste> = {
  /* Les ordres et leur suite. */
  "ordre.depose": { genre: "ordre", phrase: "Vous avez déposé un ordre", auDesk: "a déposé un ordre" },
  "ordre.appetit": { genre: "ordre", phrase: "Vous avez déposé un appétit", auDesk: "a déposé un appétit" },
  "ordre.signe": { genre: "ordre", phrase: "Vous avez signé un ordre", auDesk: "a signé un ordre" },
  "ordre.retire": { genre: "ordre", phrase: "Vous avez retiré votre ordre", auDesk: "a retiré son ordre" },
  "ordre.contre.acceptee": { genre: "ordre", phrase: "Vous avez accepté la contre-proposition", auDesk: "a accepté la contre-proposition" },
  "ordre.contre.refusee": { genre: "ordre", phrase: "Vous avez refusé la contre-proposition", auDesk: "a refusé la contre-proposition" },
  "ordre.reinvesti": { genre: "ordre", phrase: "Vous avez réinvesti un encaissement", auDesk: "a réinvesti un encaissement" },

  /* L'argent, et ce qui le commande. */
  "epargne.creee": { genre: "especes", phrase: "Vous avez programmé une épargne", auDesk: "a programmé une épargne" },
  "epargne.modifiee": { genre: "especes", phrase: "Vous avez modifié votre épargne programmée", auDesk: "a modifié son épargne programmée" },
  "epargne.arretee": { genre: "especes", phrase: "Vous avez arrêté votre épargne programmée", auDesk: "a arrêté son épargne programmée" },
  "mandat.cree": { genre: "especes", phrase: "Vous avez préparé un mandat de prélèvement", auDesk: "a préparé un mandat de prélèvement" },
  "mandat.signe": { genre: "especes", phrase: "Vous avez signé un mandat de prélèvement", auDesk: "a signé un mandat de prélèvement" },
  "mandat.revoque": { genre: "especes", phrase: "Vous avez révoqué un mandat de prélèvement", auDesk: "a révoqué un mandat de prélèvement" },
  "releve.demande": { genre: "especes", phrase: "Vous avez demandé un relevé", auDesk: "a demandé un relevé" },

  /* Le dossier et ses pièces. */
  "dossier.ouvert": { genre: "piece", phrase: "Vous avez commencé votre dossier", auDesk: "a commencé son dossier" },
  "dossier.identite": { genre: "piece", phrase: "Vous avez renseigné votre identité", auDesk: "a renseigné son identité" },
  "dossier.finances": { genre: "piece", phrase: "Vous avez renseigné votre profil financier", auDesk: "a renseigné son profil financier" },
  "dossier.personne.ajoutee": { genre: "piece", phrase: "Vous avez ajouté une personne au dossier", auDesk: "a ajouté une personne au dossier" },
  "dossier.personne.retiree": { genre: "piece", phrase: "Vous avez retiré une personne du dossier", auDesk: "a retiré une personne du dossier" },
  "dossier.piece.deposee": { genre: "piece", phrase: "Vous avez déposé une pièce", auDesk: "a déposé une pièce" },
  "dossier.piece.retiree": { genre: "piece", phrase: "Vous avez retiré une pièce", auDesk: "a retiré une pièce" },
  "dossier.soumis": { genre: "piece", phrase: "Vous avez soumis votre dossier", auDesk: "a soumis son dossier" },

  /* Les canaux, les consentements, la convention. */
  "canal.preuve.envoyee": { genre: "canal", phrase: "Vous avez demandé un code de vérification", auDesk: "a demandé un code de vérification" },
  "canal.prouve": { genre: "canal", phrase: "Vous avez prouvé un moyen de contact", auDesk: "a prouvé un moyen de contact" },
  "consentement.pose": { genre: "canal", phrase: "Vous avez réglé vos consentements", auDesk: "a réglé ses consentements" },
  "convention.acceptee": { genre: "canal", phrase: "Vous avez accepté la convention", auDesk: "a accepté la convention" },
  "profil.modifie": { genre: "canal", phrase: "Vous avez modifié vos coordonnées", auDesk: "a modifié ses coordonnées" },
  "preferences.posees": { genre: "canal", phrase: "Vous avez réglé vos préférences", auDesk: "a réglé ses préférences" },

  /* La sécurité du compte : ce que le client doit pouvoir relire en premier. */
  "securite.clef.enrolee": { genre: "securite", phrase: "Vous avez enrôlé une clef d'accès", auDesk: "a enrôlé une clef d'accès" },
  "securite.code.pose": { genre: "securite", phrase: "Vous avez posé un code sur cet appareil", auDesk: "a posé un code sur un appareil" },
  "securite.appareil.oublie": { genre: "securite", phrase: "Vous avez retiré un appareil", auDesk: "a retiré un appareil" },
  "securite.banque.changee": { genre: "securite", phrase: "Vous avez modifié votre compte bancaire", auDesk: "a modifié son compte bancaire" },

  /* Ce que le client regarde : par objet, une fois par jour. */
  "vu.fiche": { genre: "consultation", phrase: "Vous avez consulté une fiche", auDesk: "a consulté une fiche" },
  "vu.document": { genre: "consultation", phrase: "Vous avez ouvert un document", auDesk: "a ouvert un document" },
  "vu.portefeuille": { genre: "consultation", phrase: "Vous avez ouvert votre portefeuille", auDesk: "a ouvert son portefeuille" },
  "vu.seance": { genre: "consultation", phrase: "Vous avez consulté une séance", auDesk: "a consulté une séance" },

  /* Ce qui passe par une personne. */
  "message.envoye": { genre: "relation", phrase: "Vous nous avez écrit", auDesk: "a écrit au desk" },
  "reclamation.deposee": { genre: "relation", phrase: "Vous avez déposé une réclamation", auDesk: "a déposé une réclamation" },
  "ligne.suivie": { genre: "relation", phrase: "Vous avez suivi une ligne", auDesk: "a suivi une ligne" },
  "ligne.delaissee": { genre: "relation", phrase: "Vous ne suivez plus une ligne", auDesk: "ne suit plus une ligne" },
};

export const estGeste = (nom: string): boolean => nom in GESTES;
export const genreDe = (nom: string): Genre => GESTES[nom]?.genre ?? "relation";

/** Une ligne du registre, telle qu'elle se garde. */
export interface ActionClient {
  id: string;
  at: string;
  userId: string;
  /** Un nom du catalogue. */
  geste: string;
  genre: Genre;
  /** Ce sur quoi le geste a porté : une référence, un identifiant, un titre. */
  objet?: string;
  /** Le détail court qui s'affiche à côté de la phrase. */
  detail?: string;
  canal?: string;
  /** La personne qui a fait le geste, quand le compte est à plusieurs. Vide, c est le titulaire. */
  agissant?: string;
  ip?: string;
  userAgent?: string;
}

/** Ce qu'on dépose : l'identifiant et l'heure viennent du dépôt. */
export type NouvelleActionClient = Omit<ActionClient, "id" | "at"> & { clefDuJour?: string };

/**
 * UNE CONSULTATION PAR JOUR ET PAR OBJET, et la clef qui le garantit.
 *
 * Sans cette clef, ouvrir dix fois la même fiche dans l'après-midi écrirait
 * dix lignes, le fil du client deviendrait illisible et le registre grossirait
 * de ce qui n'apprend rien. La clef se calcule avant l'écriture ; le dépôt
 * refuse un doublon.
 */
export const clefDuJour = (userId: string, geste: string, objet: string | undefined, jour: string): string =>
  `${userId}|${geste}|${objet ?? ""}|${jour}`;

/** Les gestes dont on ne garde qu'une occurrence par jour. */
/**
 * TREIZE MOIS DE DÉTAIL, PUIS DES COMPTEURS, et c'est écrit à l'article 8 de
 * la convention : ce n'est donc plus un réglage, c'est une promesse.
 *
 * Treize et non douze : une comparaison d'une année sur l'autre doit toujours
 * tomber dans le détail, sinon le mois de référence disparaît la veille du
 * jour où on le compare. Le score, lui, ne regarde que douze mois : il n'est
 * donc jamais touché par la purge.
 */
export const MOIS_DE_DETAIL = 13;

/** La borne : tout geste antérieur se résume et part. */
export function borneDeLaPurge(now = new Date()): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() - MOIS_DE_DETAIL);
  return d;
}

export const estQuotidien = (geste: string): boolean => genreDe(geste) === "consultation";
