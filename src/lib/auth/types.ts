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
  /** Which auth backed this session : useful in the header and for debugging. */
  provider: "supabase" | "dev";
  /** Second factor: a verified TOTP factor exists, and this session entered its code (aal2). */
  mfaEnrolled: boolean;
  mfaVerified: boolean;
}

export const isDesk = (s: Session | null): boolean => !!s && (s.role === "desk" || s.role === "responsable");
export const isResponsable = (s: Session | null): boolean => !!s && s.role === "responsable";
export const ROLE_LABEL: Record<Role, string> = { client: "Client", desk: "Opérateur desk", responsable: "Responsable" };
