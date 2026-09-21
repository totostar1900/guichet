"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavTabs.module.css";
import { useT } from "@/i18n/client";

const TABS = [
  { href: "/", label: "Titres", match: (p: string) => p === "/" || p.startsWith("/offres") },
  { href: "/fonds", label: "Fonds", match: (p: string) => p.startsWith("/fonds") },
  { href: "/societes", label: "Sociétés", match: (p: string) => p.startsWith("/societes") },
  { href: "/actualites", label: "Actualités", match: (p: string) => p.startsWith("/actualites") },
  { href: "/info", label: "Guide", match: (p: string) => p.startsWith("/info") || p.startsWith("/comparer") },
  { href: "/desk", label: "Desk", match: (p: string) => p.startsWith("/desk") },
];

/** `mode`: "client" hides the Desk tab (the desk has its own host), "desk" keeps only it, "all" is the one-host setup. */
export function NavTabs({ counts, mode = "all" }: { counts?: { titres: number; fonds: number }; mode?: "all" | "client" | "desk" }) {
  const path = usePathname();
  const t = useT();
  const tabs = mode === "client" ? TABS.filter((x) => x.href !== "/desk") : mode === "desk" ? TABS.filter((x) => x.href === "/desk") : TABS;
  return (
    <nav className={styles.tabs} aria-label="Sections">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={tab.match(path) ? "page" : undefined}>
          {t(tab.label)}
          {counts && tab.href === "/" && <b className={styles.count}>{counts.titres}</b>}
          {counts && tab.href === "/fonds" && <b className={styles.count}>{counts.fonds}</b>}
        </Link>
      ))}
    </nav>
  );
}
