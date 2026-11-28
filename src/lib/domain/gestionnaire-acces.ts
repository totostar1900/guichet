/**
 * L'ACCÈS D'UN GESTIONNAIRE DE FONDS (28 novembre 2026, planche « Espace gestionnaire », 1B : un hôte à lui, un utilisateur externe invité par la direction).
 *
 * Un accès dit QUI (une adresse e-mail), POUR QUELLE SOCIÉTÉ DE GESTION (le nom tel que le bulletin le porte : c'est lui qui désigne ses fonds) et s'il est actif. Il vit dans la table réservée du desk
 * (`desk_prive`, kind « gestionnaire_acces »), écrit par la direction seule. Aucun rôle de plus dans la base : la session reste celle d'un compte ordinaire, c'est la LISTE qui dit qu'une adresse
 * peut lire l'espace. Retirer l'accès, c'est le passer à inactif ; la ligne reste (qui, quand, par qui).
 *
 * Module sans dépendance : il se lit du serveur comme du navigateur.
 */
export const KIND_ACCES_GESTIONNAIRE = "gestionnaire_acces";

export interface AccesGestionnaire {
  /** L'adresse, en minuscules : c'est la clef. */
  email: string;
  /** La personne, pour l'écran. */
  nom: string;
  /** Les sociétés de gestion dont elle lit les fonds, au nom du bulletin. */
  gestionnaires: string[];
  actif: boolean;
  invitePar: string;
  /** AAAA-MM-JJ. */
  le: string;
}

export const cleDeLAcces = (email: string): string => email.trim().toLowerCase();

/** Lit un accès stocké sans faire confiance à sa forme. */
export function accesLu(key: string, brut: unknown): AccesGestionnaire | undefined {
  const x = brut as Partial<AccesGestionnaire> | null | undefined;
  if (!x || typeof x !== "object") return undefined;
  const gestionnaires = Array.isArray(x.gestionnaires) ? x.gestionnaires.filter((g): g is string => typeof g === "string" && g.trim().length > 0) : [];
  return { email: cleDeLAcces(key), nom: typeof x.nom === "string" ? x.nom : key, gestionnaires, actif: x.actif !== false, invitePar: typeof x.invitePar === "string" ? x.invitePar : "", le: typeof x.le === "string" ? x.le : "" };
}

/** L'adresse de la démonstration : en mode démonstration seulement, elle entre sans invitation et lit les fonds de « Corridor Asset Management ». */
export const EMAIL_DE_DEMONSTRATION = "gestion@demo.guichet";
export const ACCES_DE_DEMONSTRATION: AccesGestionnaire = { email: EMAIL_DE_DEMONSTRATION, nom: "Gestionnaire de démonstration", gestionnaires: ["Corridor Asset Management"], actif: true, invitePar: "démonstration", le: "2026-11-28" };
