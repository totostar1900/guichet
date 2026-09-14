import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before matched routes:
 *  - Supabase mode: refreshes the auth cookies (server components can't write them).
 *  - Both modes: sends anonymous visitors of /desk to the login page.
 * Role checks (desk vs client) happen in src/app/desk/layout.tsx and in actions.
 */
export async function proxy(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const wantsDesk = req.nextUrl.pathname.startsWith("/desk");

  if (url) {
    const sb = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    });
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (wantsDesk && !user) return redirectToLogin(req);
    return res;
  }

  // Dev mode: presence of the signed cookie is enough here; the layout verifies the signature.
  if (wantsDesk && !req.cookies.get("guichet_dev_session")) return redirectToLogin(req);
  return res;
}

function redirectToLogin(req: NextRequest) {
  const login = new URL("/connexion", req.url);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|css|js)$).*)"],
};
