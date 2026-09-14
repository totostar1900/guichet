import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readDevSession } from "./dev";
import type { Session } from "./types";

export const authMode = (): "supabase" | "dev" => (process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "dev");

/** Current session, or null. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  if (authMode() === "supabase") {
    const { readSupabaseSession } = await import("./supabase");
    return readSupabaseSession();
  }
  return readDevSession();
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
