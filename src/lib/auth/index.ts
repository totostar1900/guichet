import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readDevSession } from "./dev";
import { isDesk, isResponsable, type Session } from "./types";
import { clientOrigin } from "@/lib/hosts";

export const authMode = (): "supabase" | "dev" => (process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "dev");

/** Current session, or null. Cached per request. Tier 2 comes from an approved KYC file. */
export const getSession = cache(async (): Promise<Session | null> => {
  let s: Session | null;
  if (authMode() === "supabase") {
    const { readSupabaseSession } = await import("./supabase");
    s = await readSupabaseSession();
  } else {
    s = await readDevSession();
  }
  if (s && s.role === "client") {
    const { repo } = await import("@/lib/data");
    const f = await repo().getClientFileByUser(s.userId);
    if (f) {
      // Nominative structure: the account is active once the SVT has returned the sub-account number.
      s.tier = f.status === "approuve" && f.review.custodianAccount ? 2 : 1;
      s.kycStatus = f.status;
      if (f.identity.name) s.name = f.identity.name;
    }
  }
  return s;
});

/** Redirects to login when anonymous; returns the session otherwise. */
export async function requireSession(next = "/"): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return s;
}

/** Second factor is mandatory for the desk unless DESK_MFA=off (documented escape hatch for the very first login). */
export const mfaRequired = (): boolean => process.env.DESK_MFA !== "off";

/** Desk-only areas and actions (opérateur or responsable), behind the second factor. */
export async function requireDesk(next = "/desk"): Promise<Session> {
  const s = await requireSession(next);
  // A client on the desk: back to the client site (on the desk host, « / » would only come back here).
  if (!isDesk(s)) redirect(`${clientOrigin()}/?acces=desk`);
  if (s.provider === "supabase" && mfaRequired()) {
    if (!s.mfaEnrolled) redirect(`/connexion/mfa?enrol=1&next=${encodeURIComponent(next)}`);
    if (!s.mfaVerified) redirect(`/connexion/mfa?next=${encodeURIComponent(next)}`);
  }
  return s;
}

/** Responsable-only: team, approvals. */
export async function requireResponsable(next = "/desk"): Promise<Session> {
  const s = await requireDesk(next);
  if (!isResponsable(s)) redirect("/desk?acces=responsable");
  return s;
}
