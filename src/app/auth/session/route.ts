import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuthClient } from "@/lib/auth/supabase";

/**
 * The session a sign-in link brought back in the URL's hash (implicit flow),
 * handed over by the browser so the server can write the auth cookies: the
 * page that follows is signed in like any other.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { access_token?: string; refresh_token?: string } | null;
  if (!body?.access_token || !body.refresh_token) return NextResponse.json({ error: "tokens" }, { status: 400 });
  const sb = await supabaseAuthClient();
  const { error } = await sb.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  return NextResponse.json({ ok: true });
}
