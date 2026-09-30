"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./NavTabs.module.css";
import { useT } from "@/i18n/client";
import { MARKET_PAGES } from "@/lib/market/pages";
import { isEspaceSection, isFundsSection, isTitresSection, TITRES } from "@/lib/nav-section";

/**
 * Deux axes, et le second manquait.
 *
 * « Titres, Fonds, Marché » range par INSTRUMENT : c est le bon axe pour
 * choisir. Apres son premier achat un client pense par INTENTION, et rien ne
 * portait cet axe. « Mon espace » est le seul onglet qui le porte, et il passe
 * donc en tete pour qui est connecte : on ne revient pas parcourir un
 * catalogue, on revient agir.
 *
 * Il ne parait pas a qui ne l est pas : un visiteur n a pas d espace.
 */
const TABS = [
  { href: "/", label: "Mon espace", match: isEspaceSection, connecte: true },
  { href: "/moi/services", label: "Services", match: (p: string) => p.startsWith("/moi/services"), connecte: true },
  { href: TITRES, label: "Titres", match: isTitresSection, connecte: true },
  { href: "/fonds", label: "Fonds", match: isFundsSection, connecte: true },
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
    connecte: true,
    match: (p: string) => p.startsWith("/marche") || p.startsWith("/societes") || p.startsWith("/indice") || p.startsWith("/emetteurs") || p.startsWith("/calendrier"),
  },
  { href: "/actualites", label: "Actualités", match: (p: string) => p.startsWith("/actualites"), connecte: true },
  { href: "/info", label: "Guide", match: (p: string) => (p.startsWith("/info") && !p.startsWith("/info/risques")) || p.startsWith("/comparer") },
  /* Les deux adresses qu'un visiteur peut lire en plus du guide. Elles ne
     paraissent qu'à lui : connecté, les publications vivent dans le menu
     « Marché » et les risques au pied de page. */
  { href: "/indice/notes", label: "Publications", match: (p: string) => p.startsWith("/indice/note"), visiteur: true },
  { href: "/info/risques", label: "Risques et limites", match: (p: string) => p.startsWith("/info/risques"), visiteur: true },
  { href: "/desk", label: "Desk", match: (p: string) => p.startsWith("/desk"), connecte: true },
];

/** `mode`: "client" hides the Desk tab (the desk has its own host), "desk" keeps only it, "all" is the one-host setup. */
export function NavTabs({ counts, mode = "all", connecte = false }: { counts?: { titres: number; fonds: number }; mode?: "all" | "client" | "desk"; connecte?: boolean }) {
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

  /* La bande dit ce que le lecteur peut ouvrir, et rien d'autre. Tout est
     derrière la porte sauf le guide, les publications et les risques : montrer
     « Titres » à un visiteur serait l'envoyer sur un mur de connexion. */
  const ouverts = TABS.filter((x) => (connecte ? !x.visiteur : !x.connecte));
  const tabs = mode === "client" ? ouverts.filter((x) => x.href !== "/desk") : mode === "desk" ? ouverts.filter((x) => x.href === "/desk") : ouverts;

  return (
    <nav className={styles.tabs} aria-label="Sections">
      {tabs.map((tab) => {
        const link = (
          <Link key={tab.href} href={tab.href} className={styles.tab} aria-current={tab.match(path) ? "page" : undefined}>
            {t(tab.label)}
            {counts && tab.href === TITRES && <b className={styles.count}>{counts.titres}</b>}
            {counts && tab.href === "/fonds" && <b className={styles.count}>{counts.fonds}</b>}
          </Link>
        );
        if (!tab.menu) return link;
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
