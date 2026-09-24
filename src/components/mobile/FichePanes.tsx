"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { createContext, useContext, useState } from "react";
import styles from "./FichePanes.module.css";

/**
 * On a phone the fiche is read in four compartments: Essentiel, Chiffres,
 * Documents, Émetteur. Sections carry `data-pane`; this wrapper shows one pane
 * at a time under 760 px and everything above (CSS does the hiding, so the
 * desktop page is untouched and the HTML is the same for both).
 */
export const PANES: [string, string][] = [
  ["essentiel", "Essentiel"], // translated at render
  ["chiffres", "Chiffres"],
  ["docs", "Documents"],
  ["emetteur", "Émetteur"],
];

const PaneCtx = createContext<{ pane: string; setPane: (p: string) => void }>({ pane: "essentiel", setPane: () => undefined });

export function FichePanes({ children, className }: { children: React.ReactNode; className?: string }) {
  const [pane, setPane] = useState("essentiel");
  return (
    <PaneCtx.Provider value={{ pane, setPane }}>
      <div className={`${styles.panes} ${className ?? ""}`} data-show={pane}>
        {children}
      </div>
    </PaneCtx.Provider>
  );
}

/** The segmented control, placed where the page wants it (under the identity block). */
export function FicheSegments() {
  const { pane, setPane } = useContext(PaneCtx);
  const t = useT();
  return (
    <div className={styles.seg} role="tablist" aria-label={t("Sections de la fiche")}>
      {PANES.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={pane === k} className={pane === k ? styles.on : undefined} onClick={() => setPane(k)}>
          {t(label)}
        </button>
      ))}
    </div>
  );
}

/** Phone-only bar above the tab bar: the one action, always a thumb away. It opens the intention on its own page. */
export function StickyAction({ label, href, secondaryHref, secondaryLabel }: { label: string; href: string; secondaryHref?: string; secondaryLabel?: string }) {
  return (
    <div className={styles.cta} data-coach="action">
      {/* Il n'était qu'un « ghost » de petite taille à côté d'une action pleine
          hauteur : il se lisait comme une note de bas de page. Même hauteur et un
          contour franc, l'action gardant le poids. */}
      {secondaryHref && (
        <a className={`btn ${styles.ctaSecond}`} href={secondaryHref}>
          {secondaryLabel}
        </a>
      )}
      <Link className={`btn primary ${styles.ctaMain}`} href={href}>
        {label}
      </Link>
    </div>
  );
}
