import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readDevSession } from "./dev";
import type { Session } from "./types";

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
      s.tier = f.status === "approuve" ? 2 : 1;
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

/** Desk-only areas and actions. */
export async function requireDesk(next = "/desk"): Promise<Session> {
  const s = await requireSession(next);
  if (s.role !== "desk") redirect("/?acces=desk");
  return s;
}
