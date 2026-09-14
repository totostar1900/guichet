export type Role = "client" | "desk";

/** Level of relationship — see onboarding notes. 0 visitor, 1 identified, 2 account open. */
export type Tier = 0 | 1 | 2;

export interface Session {
  userId: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  segment: string; // "Personne physique · Douala"
  tier: Tier;
  /** Which auth backed this session — useful in the header and for debugging. */
  provider: "supabase" | "dev";
}

export const isDesk = (s: Session | null): s is Session => !!s && s.role === "desk";
