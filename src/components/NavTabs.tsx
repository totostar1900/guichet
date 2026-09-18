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

export function NavTabs({ counts }: { counts?: { titres: number; fonds: number } }) {
  const path = usePathname();
  const t = useT();
  return (
    <nav className={styles.tabs} aria-label="Sections">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={tab.match(path) ? "page" : undefined}>
          {t(tab.label)}
          {counts && tab.href === "/" && <b className={styles.count}>{counts.titres}</b>}
          {counts && tab.href === "/fonds" && <b className={styles.count}>{counts.fonds}</b>}
        </Link>
      ))}
    </nav>
  );
}
