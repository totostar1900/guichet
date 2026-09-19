"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * A sign-in link that has expired, or was already used (a mail app that
 * previews links uses it first), never reaches /auth/callback: Supabase sends
 * the reader to the site's root with the error in the hash. This turns that
 * hash into the sign-in page and its plain message, instead of a raw URL.
 */
export function AuthHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const h = window.location.hash;
    if (!h || !/(^|[#&])error=/.test(h)) return;
    router.replace("/connexion?erreur=lien");
  }, [router]);
  return null;
}
