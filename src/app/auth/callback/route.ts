import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthClient } from "@/lib/auth/supabase";

/** Magic-link landing: exchanges the code for a session, then redirects. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const sb = await supabaseAuthClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, url.origin));
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", url.origin));
}
