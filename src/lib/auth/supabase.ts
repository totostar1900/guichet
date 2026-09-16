import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Role, Session, Tier } from "./types";

/**
 * Supabase Auth on the server (App Router). Cookies are read here and written
 * back only where Next allows it (server actions, route handlers, proxy).
 */
export async function supabaseAuthClient() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

const deskEmails = () =>
  (process.env.DESK_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

type ProfileRow = { role: Role; display_name: string | null; segment: string | null; tier: number | null; phone: string | null; mfa_enrolled_at: string | null };

export async function readSupabaseSession(): Promise<Session | null> {
  const sb = await supabaseAuthClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb.from("profiles").select("role, display_name, segment, tier, phone, mfa_enrolled_at").eq("id", user.id).maybeSingle();
  const p = (data ?? null) as ProfileRow | null;
  const email = user.email?.toLowerCase();
  let role: Role = p?.role === "desk" || p?.role === "responsable" ? p.role : "client";
  // DESK_EMAILS only bootstraps: the first login of a listed address becomes responsable, persisted, then the team page rules.
  if (role === "client" && email && deskEmails().includes(email)) {
    role = "responsable";
    try {
      const { repo } = await import("@/lib/data");
      await repo().setRole(user.id, "responsable", "DESK_EMAILS");
      await repo().logEvent({ kind: "system", html: `<b>${email}</b> promu responsable à la première connexion (DESK_EMAILS)` });
    } catch {
      // Without the service key the promotion stays in memory for this request; the next login retries.
    }
  }
  // Second factor: verified TOTP factor on the account, and the current session's assurance level.
  let mfaEnrolled = false;
  let mfaVerified = false;
  if (role !== "client") {
    const [{ data: factors }, { data: aal }] = await Promise.all([sb.auth.mfa.listFactors(), sb.auth.mfa.getAuthenticatorAssuranceLevel()]);
    mfaEnrolled = (factors?.totp ?? []).some((f) => f.status === "verified");
    mfaVerified = aal?.currentLevel === "aal2";
  }
  return {
    mfaEnrolled,
    mfaVerified,
    userId: user.id,
    role,
    name: p?.display_name || email?.split("@")[0] || "Client",
    email: user.email ?? undefined,
    phone: p?.phone ?? user.phone ?? undefined,
    segment: p?.segment || "Prospect identifié",
    tier: ((p?.tier ?? 1) as Tier) || 1,
    provider: "supabase",
  };
}
