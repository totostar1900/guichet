"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * What a sign-in link may leave in the URL's hash when it lands on the site's
 * root instead of /auth/callback (Supabase falls back to the site URL):
 * a session (implicit flow) is handed to the server and the page reloads
 * signed in; an error (expired, or already used by a mail app that previews
 * links) becomes the sign-in page and its plain message.
 */
export function AuthHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const h = window.location.hash;
    if (!h || h.length < 2) return;
    const p = new URLSearchParams(h.slice(1));
    const access = p.get("access_token");
    const refresh = p.get("refresh_token");
    if (access && refresh) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      fetch("/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ access_token: access, refresh_token: refresh }) })
        .then((r) => (r.ok ? router.refresh() : router.replace("/connexion?erreur=lien")))
        .catch(() => router.replace("/connexion?erreur=lien"));
      return;
    }
    if (p.get("error")) router.replace("/connexion?erreur=lien");
  }, [router]);
  return null;
}
