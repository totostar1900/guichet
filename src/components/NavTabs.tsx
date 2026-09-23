"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./NavTabs.module.css";
import { useT } from "@/i18n/client";
import { MARKET_PAGES } from "@/lib/market/pages";

const TABS = [
  { href: "/", label: "Titres", match: (p: string) => p === "/" || p.startsWith("/offres") },
  { href: "/fonds", label: "Fonds", match: (p: string) => p.startsWith("/fonds") },
  // « Marché » porte l'environnement BVMAC : l'indice, les sociétés, les notes.
  // Les actualités gardent leur onglet : elles couvrent cinq rubriques, dont la BVMAC
  // n'est qu'une, et elles se collectent indépendamment de ce que nous publions.
  //
  // C'est le seul onglet à ouvrir un menu, parce que c'est le seul à porter une
  // famille de pages plutôt qu'une page. La bande « Sur le même sujet » dit la
  // même famille au pied de chaque article : elle sert celui qui vient de lire,
  // le menu sert celui qui cherche, et les deux se lisent dans MARKET_PAGES.
  {
    href: "/marche",
    label: "Marché",
    menu: true,
    match: (p: string) => p.startsWith("/marche") || p.startsWith("/societes") || p.startsWith("/indice") || p.startsWith("/emetteurs"),
  },
  { href: "/actualites", label: "Actualités", match: (p: string) => p.startsWith("/actualites") },
  { href: "/info", label: "Guide", match: (p: string) => p.startsWith("/info") || p.startsWith("/comparer") },
  { href: "/desk", label: "Desk", match: (p: string) => p.startsWith("/desk") },
];

/** `mode`: "client" hides the Desk tab (the desk has its own host), "desk" keeps only it, "all" is the one-host setup. */
export function NavTabs({ counts, mode = "all" }: { counts?: { titres: number; fonds: number }; mode?: "all" | "client" | "desk" }) {
  const path = usePathname();
  const t = useT();
  // Le menu retient la page sur laquelle il s'est ouvert : changer de page le referme
  // de lui-même, sans effet de bord. Sinon il resterait ouvert par-dessus la page
  // qu'il vient d'ouvrir.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const tabs = mode === "client" ? TABS.filter((x) => x.href !== "/desk") : mode === "desk" ? TABS.filter((x) => x.href === "/desk") : TABS;

  return (
    <nav className={styles.tabs} aria-label="Sections">
      {tabs.map((tab) => {
        const link = (
          <Link href={tab.href} className={styles.tab} aria-current={tab.match(path) ? "page" : undefined}>
            {t(tab.label)}
            {counts && tab.href === "/" && <b className={styles.count}>{counts.titres}</b>}
            {counts && tab.href === "/fonds" && <b className={styles.count}>{counts.fonds}</b>}
          </Link>
        );
        if (!tab.menu) return <span key={tab.href}>{link}</span>;
        return (
          <div key={tab.href} className={styles.group} ref={box}>
            {link}
            <button type="button" className={styles.chev} aria-expanded={open} aria-haspopup="true" aria-label={t("Les pages du marché")} onClick={() => setOpen(!open)}>
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M1 3.2 L5 7 L9 3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {open && (
              <div className={styles.menu}>
                {MARKET_PAGES.map((p) => (
                  <Link key={p.key} href={p.href} className={styles.item}>
                    <b>{t(p.label)}</b>
                    <small>{t(p.hint)}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
