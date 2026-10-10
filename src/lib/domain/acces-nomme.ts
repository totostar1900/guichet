/**
 * L'ACCÈS NOMMÉ : QUI AGIT SUR UN COMPTE QUI N'EST PAS UNE PERSONNE PHYSIQUE.
 *
 * Un compte porte un identifiant, donc une connexion. Pour une société, une
 * association ou une indivision, cette connexion unique était partagée entre
 * deux ou trois personnes. Trois choses en découlaient, toutes mauvaises : le
 * journal ne pouvait jamais dire laquelle avait agi, la règle de décision du
 * PV ne pouvait pas exister derrière un seul jeu d'identifiants, et retirer
 * une personne du groupe obligeait à changer le code de tout le monde.
 *
 * LE COMPTE NE BOUGE PAS, et c'est ce qui rend la chose possible sans
 * refondre le produit. Positions, espèces, ordres et documents restent rangés
 * sous l'identifiant du compte ; la session porte en plus LA PERSONNE QUI
 * AGIT. Le titulaire reste le titulaire : un ordre est passé au nom du
 * compte, par une personne nommée.
 *
 * L'ACCÈS SE DONNE À UN CANAL, PAS À UN IDENTIFIANT. Le desk désigne une
 * personne déclarée au dossier et le numéro ou l'adresse où elle se
 * connectera ; il n'a de compte à créer pour personne. Le premier qui reçoit
 * le code à ce canal est la personne : la preuve est le code lui-même, comme
 * partout ailleurs dans la maison. L'identifiant se lie à cet instant, et
 * plus jamais après.
 *
 * LA MÊME PROCÉDURE POUR UNE SOCIÉTÉ ET POUR UNE ASSOCIATION. C'est ce que
 * fait la place : les pièces du dossier diffèrent, récépissé contre RCCM,
 * mais le modèle d'accès est le même, parce que la question posée est la
 * même dans les deux cas : qui, parmi les personnes déclarées, peut agir.
 */

/** Les rôles qui donnent le droit d'agir. Un bénéficiaire effectif n'agit pas : détenir n'est pas agir. */
export const ROLES_QUI_AGISSENT = ["representant", "cotitulaire"] as const;
export type RoleQuiAgit = (typeof ROLES_QUI_AGISSENT)[number];
export const peutRecevoirUnAcces = (role: string): role is RoleQuiAgit => (ROLES_QUI_AGISSENT as readonly string[]).includes(role);

export const ROLE_ACCES_LABEL: Record<RoleQuiAgit, string> = {
  representant: "Représentant légal",
  cotitulaire: "Cotitulaire désigné",
};

export interface AccesCompte {
  id: string;
  /** Le compte sur lequel la personne agit. */
  compteUserId: string;
  nom: string;
  role: RoleQuiAgit;
  canal: "phone" | "email";
  /** Normalisé : c'est ce qui se compare à la connexion. */
  canalValeur: string;
  /** Lié à la première connexion, et plus jamais après. */
  personneUserId?: string;
  premiereConnexionLe?: string;
  /** Le plafond par ordre de CETTE personne, quand le PV donne des pouvoirs inégaux. */
  plafondParOrdre?: number;
  accordePar: string;
  accordeLe: string;
  revoqueLe?: string;
  revoquePar?: string;
  revoqueMotif?: string;
}

/** Un accès révoqué n'ouvre plus rien. */
export const accesVivant = (a: AccesCompte): boolean => !a.revoqueLe;

/**
 * LE CANAL, RÉDUIT À CE QUI LE COMPARE.
 *
 * Une adresse se compare en minuscules. Un numéro se compare sur ses
 * chiffres : « +237 6 00 00 00 99 » et « +237600000099 » sont le même, et
 * laisser l'espace décider de qui peut se connecter serait absurde.
 */
export function clefDeCanal(canal: "phone" | "email", valeur: string): string {
  const v = (valeur ?? "").trim();
  if (canal === "email") return v.toLowerCase();
  const chiffres = v.replace(/[^\d]/g, "");
  return chiffres ? `+${chiffres}` : "";
}

/** Ce qui cloche dans un accès qu'on s'apprête à accorder, ou rien. */
export function refusDAcces(o: { nom: string; role: string; canal: "phone" | "email"; valeur: string }): string | undefined {
  if (!o.nom || o.nom.trim().length < 3) return "Choisissez la personne dans celles que le dossier déclare.";
  if (!peutRecevoirUnAcces(o.role)) return "Seuls un représentant légal et un cotitulaire désigné peuvent agir : détenir plus de 25 % n'est pas agir.";
  const clef = clefDeCanal(o.canal, o.valeur);
  if (!clef) return "Indiquez le numéro ou l'adresse où le code de connexion partira.";
  if (o.canal === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clef)) return "Cette adresse ne ressemble pas à une adresse.";
  /* HUIT CHIFFRES AU MOINS, indicatif compris : un numéro trop court est une
     faute de frappe, et un accès posé sur une faute de frappe est un accès
     que personne n'ouvrira jamais, sans que personne ne le sache. */
  if (o.canal === "phone" && clef.replace(/\D/g, "").length < 8) return "Ce numéro est trop court : mettez-le au format international, indicatif compris.";
  return undefined;
}

/**
 * Ce que la personne lit en haut de son espace : sur quel compte elle agit,
 * et à quel titre.
 *
 * Elle prend le rôle et le nom du compte, pas l'accès entier : la session
 * porte déjà ces deux-là, et lui faire relire la table à chaque page pour
 * une phrase serait payer cher un texte.
 */
export const direLAcces = (role: RoleQuiAgit | undefined, nomDuCompte: string): string | undefined =>
  role ? `Vous agissez sur le compte de ${nomDuCompte}, en tant que ${ROLE_ACCES_LABEL[role].toLowerCase()}. Chaque geste est enregistré à votre nom.` : undefined;
