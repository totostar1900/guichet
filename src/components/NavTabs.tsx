"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavTabs.module.css";

const TABS = [
  { href: "/", label: "Guichet", match: (p: string) => p === "/" || p.startsWith("/offres") },
  { href: "/fonds", label: "Fonds", match: (p: string) => p.startsWith("/fonds") },
  { href: "/societes", label: "Sociétés", match: (p: string) => p.startsWith("/societes") },
  { href: "/apprendre", label: "Apprendre", match: (p: string) => p.startsWith("/apprendre") || p.startsWith("/simulateur") || p.startsWith("/comparer") },
  { href: "/desk", label: "Desk", match: (p: string) => p.startsWith("/desk") },
];

export function NavTabs() {
  const path = usePathname();
  return (
    <nav className={styles.tabs} aria-label="Sections">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={styles.tab} aria-current={t.match(path) ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
