import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientOrigin, deskHostServes, deskOrigin, deskSplit, isDeskHost } from "@/lib/hosts";
import { estPublic } from "@/lib/porte";

/**
 * Runs before matched routes:
 *  - Two hosts (once NEXT_PUBLIC_DESK_HOST is set): /desk lives on the desk host, the rest on the
 *    client host; a request on the wrong host is sent to the right one, same path.
 *  - Supabase mode: refreshes the auth cookies (server components can't write them).
 *  - Both modes: an anonymous visitor is sent to the login page for every address
 *    outside the public spine (src/lib/porte.ts). /desk is one of those, so it no
 *    longer needs a rule of its own here.
 * Role checks (desk vs client) happen in src/app/desk/layout.tsx and in actions.
 */
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const wantsDesk = path.startsWith("/desk");
  // La porte. Une adresse qui n'est pas sur la colonne vertébrale publique
  // demande une connexion, quelle qu'elle soit.
  const ferme = !estPublic(path);
  if (deskSplit()) {
    const onDesk = isDeskHost(req.headers.get("host"));
    if (onDesk && path === "/") return NextResponse.redirect(new URL("/desk", req.url));
    if (onDesk && !deskHostServes(path) && clientOrigin()) return NextResponse.redirect(clientOrigin() + path + req.nextUrl.search);
    if (!onDesk && wantsDesk) return NextResponse.redirect(deskOrigin() + path + req.nextUrl.search);
  }
  const res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

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
    if (ferme && !user) return redirectToLogin(req);
    return res;
  }

  // Dev mode: presence of the signed cookie is enough here; the layout verifies the signature.
  if (ferme && !req.cookies.get("guichet_dev_session")) return redirectToLogin(req);
  return res;
}

function redirectToLogin(req: NextRequest) {
  const login = new URL("/connexion", req.url);
  // La recherche compte : un lien partagé porte souvent son contexte dedans.
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|css|js)$).*)"],
};
