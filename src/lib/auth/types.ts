/**
 * client : a prospect or account holder.
 * desk : opérateur : validates, publishes, treats intents, edits the référentiel.
 * responsable : desk + team management, approvals, four-eyes on money terms.
 * (The « système » actor is not a user: crons and the robot hold CRON_SECRET / the service key.)
 */
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
  /** Which auth backed this session : useful in the header and for debugging. */
  provider: "supabase" | "dev";
  /** Second factor: a verified TOTP factor exists, and this session entered its code (aal2). */
  mfaEnrolled: boolean;
  mfaVerified: boolean;
}

/**
 * Le dossier est approuvé ET la convention acceptée.
 *
 * C'est la porte des fonds : ils s'inscrivent au nom du client chez le
 * dépositaire, sans sous-compte SVT, donc le dossier suffit. Mais « approuvé »
 * seul ne suffit plus depuis que la signature vient après la décision. La règle
 * tient ici pour qu'elle ne soit pas réécrite trois fois.
 */
export const compteOuvert = (s: Session | null | undefined): boolean => !!s && s.kycStatus === "approuve" && Boolean(s.conventionAccepted);

export const isDesk = (s: Session | null): boolean => !!s && (s.role === "desk" || s.role === "responsable");
export const isResponsable = (s: Session | null): boolean => !!s && s.role === "responsable";
export const ROLE_LABEL: Record<Role, string> = { client: "Client", desk: "Opérateur", responsable: "Responsable du desk" };
