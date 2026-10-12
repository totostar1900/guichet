/**
 * client : a prospect or account holder.
 * desk : opérateur : validates, publishes, treats intents, edits the référentiel.
 * responsable : desk + team management, approvals, four-eyes on money terms.
 * (The « système » actor is not a user: crons and the robot hold CRON_SECRET / the service key.)
 */
import type { CauseDeRetrait } from "@/lib/domain/acces-nomme";

export type Role = "client" | "desk" | "responsable";

/** Level of relationship : see onboarding notes. 0 visitor, 1 identified, 2 account open. */
export type Tier = 0 | 1 | 2;

export interface Session {
  userId: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  /** Le numéro a été confirmé par un code à la connexion : il vaut preuve, comme l’adresse d’une connexion par e-mail. */
  phoneVerified?: boolean;
  segment: string; // "Personne physique · Douala"
  tier: Tier;
  /** KYC file status when one exists (brouillon → approuve). */
  kycStatus?: string;
  /**
   * La convention d'ouverture est acceptée.
   *
   * Elle se signe après l'approbation, donc « approuvé » ne suffit plus à ouvrir
   * un passage : sans cette signature, rien ne lie encore le client, et aucune
   * prise ne doit partir. Les deux portes qui lisaient « approuvé » lisent aussi
   * ceci.
   */
  conventionAccepted?: boolean;
  /**
   * QUI AGIT, QUAND CE N'EST PAS LE COMPTE LUI-MÊME.
   *
   * `userId` reste le COMPTE : positions, espèces, ordres et documents y sont
   * rangés, et rien dans le domaine n'a eu à changer. Ce champ dit la
   * PERSONNE qui tient le clavier, quand un représentant légal ou un
   * cotitulaire désigné se connecte sur le compte d'une société, d'une
   * association ou d'une indivision.
   *
   * Absent, c'est le titulaire lui-même : le cas de l'immense majorité.
   */
  agissant?: { accesId: string; nom: string; role: "representant" | "cotitulaire" };
  /**
   * LE PLAFOND PAR ORDRE QUI S APPLIQUE À CETTE SESSION.
   *
   * Calculé une fois ici, où le dossier et l accès sont déjà lus : le plus
   * bas du plafond du compte et de celui de la personne. Le garde le lit
   * sans rien relire. Absent, il n y a pas de plafond.
   */
  plafondParOrdre?: number;
  /** D où il vient, pour que la phrase du refus dise la vérité. */
  plafondSource?: "compte" | "personne";
  /**
   * L ACCÈS QUI A ÉTÉ RETIRÉ À CETTE PERSONNE.
   *
   * Elle se connecte, n arrive sur rien, et croirait à une panne : la panne
   * muette appliquée à quelqu un qui n a même plus de compte où se plaindre.
   * Le compte ne bascule pas pour autant ; elle reste chez elle, avec une
   * phrase. La cause de conformité n en dit jamais le pourquoi.
   */
  accesRetire?: { nomDuCompte: string; le: string; cause?: CauseDeRetrait };
  /** Which auth backed this session : useful in the header and for debugging. */
  provider: "supabase" | "dev";
  /** Second factor: a verified TOTP factor exists, and this session entered its code (aal2). */
  mfaEnrolled: boolean;
  mfaVerified: boolean;
}

/**
 * DEUX CHAÎNES DE CONSERVATION, DONC DEUX CAPACITÉS, ET NON UNE ÉCHELLE.
 *
 * Un titre public ou une ligne cotée s'inscrit dans un compte-titres, au
 * dépositaire, par un sous-compte nominatif ouvert chez le teneur de compte.
 * Une part d'OPCVM, non : elle s'inscrit au registre des porteurs tenu par le
 * dépositaire du fonds, au nom du porteur, et ne demande aucun compte-titres.
 *
 * Le code le savait à un seul endroit, dans la règle des intentions, et partout
 * ailleurs un « palier » unique servait de mesure. Or ce palier ne mesure que la
 * chaîne titres : un client parfaitement en règle qui ne détient que des parts
 * n'y arrive jamais. Les deux capacités portent donc leur nom.
 *
 * Le palier reste ce qui les stocke : on nomme la lecture, on ne refait pas la
 * plomberie.
 */
/** Souscrire et faire racheter des parts d'OPCVM : dossier approuvé et convention acceptée suffisent. */
export const peutOPCVM = (s: Session | null | undefined): boolean => !!s && s.kycStatus === "approuve" && Boolean(s.conventionAccepted);
/** Passer des ordres sur des titres : il y faut en plus le sous-compte nominatif rendu par le teneur. */
export const peutTitres = (s: Session | null | undefined): boolean => peutOPCVM(s) && (s?.tier ?? 0) >= 2;

export const isDesk = (s: Session | null): boolean => !!s && (s.role === "desk" || s.role === "responsable");

/**
 * LE COMPTE EST CRÉÉ, LE DOSSIER N'EST PAS PASSÉ : c'est un état, et il a
 * désormais son écran.
 *
 * Il existait déjà, sans nom et sans surface. Quelqu'un qui venait de prouver
 * son adresse arrivait sur la console du client : un portefeuille à zéro, des
 * flux vides, un relevé de rien, et une pastille grise « Dossier à compléter »
 * au milieu. L'écran lui montrait donc ce qu'il n'avait pas, ce qui est la
 * pire des deux fautes possibles ici. L'autre serait de ne rien lui montrer
 * du tout.
 *
 * LA RÈGLE : ce qu'il n'a pas encore, il ne le voit pas ; ce qui lui manque,
 * il le lit en une ligne. Le desk est hors de cette règle, son dossier n'étant
 * pas un dossier de client.
 */
export const surSonDossier = (s: Session | null | undefined): boolean => !!s && !isDesk(s) && !peutOPCVM(s);
export const isResponsable = (s: Session | null): boolean => !!s && s.role === "responsable";
export const ROLE_LABEL: Record<Role, string> = { client: "Client", desk: "Opérateur", responsable: "Responsable du desk" };
