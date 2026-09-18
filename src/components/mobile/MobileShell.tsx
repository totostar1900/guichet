"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./MobileShell.module.css";

/**
 * The phone shell (≤ 760 px): a top bar with a real « back » and the page
 * title, and a bottom tab bar with the four destinations. Desktop keeps the
 * site header; both are rendered, CSS shows one. The back arrow returns to
 * the list the reader came from — same filters, same scroll — using the
 * browser history when it is ours, or the last list URL we remembered.
 */
export const LAST_LIST_KEY = "guichet:lastList";

const ROOTS = ["/", "/fonds", "/moi", "/info", "/desk", "/connexion"];

type Tab = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean; badge?: number };

const I = {
  guichet: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  ),
  fonds: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 17l5-6 4 4 4-7 5 5" />
      <path d="M3 21h18" />
    </svg>
  ),
  moi: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  ),
  apprendre: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" />
      <path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </svg>
  ),
  desk: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 15h4" />
    </svg>
  ),
};

function fallbackFor(path: string): string {
  if (path.startsWith("/offres")) {
    try {
      const last = sessionStorage.getItem(LAST_LIST_KEY);
      if (last) return last;
    } catch {
      // storage unavailable
    }
    return "/";
  }
  if (path.startsWith("/fonds")) return "/fonds";
  if (path.startsWith("/societes") || path.startsWith("/emetteurs")) return "/societes";
  if (path.startsWith("/desk")) return "/desk";
  if (path.startsWith("/moi") || path.startsWith("/ouvrir-un-compte")) return "/moi";
  if (path.startsWith("/info") || path.startsWith("/comparer")) return "/info";
  return "/";
}

export function MobileShell({ signedIn, name, desk, pendingCount = 0 }: { signedIn: boolean; name?: string; desk: boolean; pendingCount?: number }) {
  const path = usePathname();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const isRoot = ROOTS.includes(path) || path === "/societes";

  // The page title comes from <title>, which every page already sets.
  useEffect(() => {
    const read = () => setTitle(document.title.replace(/\s*[·—-]\s*(Guichet|Purpose Capital).*$/i, "").trim());
    read();
    const t = document.querySelector("title");
    if (!t) return;
    const mo = new MutationObserver(read);
    mo.observe(t, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [path]);

  // Did this tab see another of our pages before this one? Then the browser history is ours.
  useEffect(() => {
    try {
      const prev = sessionStorage.getItem("guichet:here");
      if (prev && prev !== path) sessionStorage.setItem("guichet:cameFrom", prev);
      sessionStorage.setItem("guichet:here", path);
    } catch {
      // storage unavailable
    }
  }, [path]);

  const back = () => {
    let ours = false;
    try {
      ours = Boolean(sessionStorage.getItem("guichet:cameFrom"));
    } catch {
      // storage unavailable
    }
    // Our own history: go back (Next restores the list scroll). A link opened from WhatsApp: the remembered list.
    if (ours && window.history.length > 1) router.back();
    else router.push(fallbackFor(path));
  };

  const t = useT();
  const tabs: Tab[] = [
    { href: "/", label: "Guichet", icon: I.guichet, match: (p) => p === "/" || p.startsWith("/offres") || p.startsWith("/societes") || p.startsWith("/emetteurs") },
    { href: "/fonds", label: "Fonds", icon: I.fonds, match: (p) => p.startsWith("/fonds") },
    { href: "/moi", label: "Mon espace", icon: I.moi, match: (p) => p.startsWith("/moi") || p.startsWith("/ouvrir-un-compte") || p.startsWith("/connexion"), badge: pendingCount },
    { href: "/info", label: "Info", icon: I.apprendre, match: (p) => p.startsWith("/info") || p.startsWith("/comparer") },
  ];
  if (desk) tabs.push({ href: "/desk", label: "Desk", icon: I.desk, match: (p) => p.startsWith("/desk") });

  return (
    <>
      <div className={styles.top}>
        {isRoot ? (
          <Link href="/" className={styles.brand}>
            <b>PURPOSE CAPITAL</b>
            <span>Guichet</span>
          </Link>
        ) : (
          <>
            <button type="button" className={styles.back} onClick={back} aria-label={t("Retour")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <div className={styles.title}>{title || "…"}</div>
          </>
        )}
        <div className={styles.right}>
          {signedIn ? (
            <Link href={desk ? "/desk" : "/moi"} className={styles.avatar} aria-label={t("Mon compte")} title={name}>
              {(name ?? "?").trim().charAt(0).toUpperCase()}
            </Link>
          ) : (
            !path.startsWith("/connexion") && (
              <Link href={`/connexion?next=${encodeURIComponent(path)}`} className={styles.signin}>
                {t("Se connecter")}
              </Link>
            )
          )}
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Navigation principale" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} aria-current={tab.match(path) ? "page" : undefined}>
            <span className={styles.icon}>
              {tab.icon}
              {tab.badge ? <em>{tab.badge}</em> : null}
            </span>
            {t(tab.label)}
          </Link>
        ))}
      </nav>
    </>
  );
}
