"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import styles from "./FichePanes.module.css";

/**
 * On a phone the fiche is read in four compartments: Essentiel, Chiffres,
 * Documents, Risques. Sections carry `data-pane`; this wrapper shows one pane
 * at a time under 760 px and everything above (CSS does the hiding, so the
 * desktop page is untouched and the HTML is the same for both).
 */
export const PANES: [string, string][] = [
  ["essentiel", "Essentiel"],
  ["chiffres", "Chiffres"],
  ["docs", "Documents"],
  ["risques", "Risques"],
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
  return (
    <div className={styles.seg} role="tablist" aria-label="Sections de la fiche">
      {PANES.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={pane === k} className={pane === k ? styles.on : undefined} onClick={() => setPane(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Phone-only bar above the tab bar: the one action, always a thumb away; hides while the form itself is on screen. */
export function StickyAction({ label, targetId, secondaryHref, secondaryLabel }: { label: string; targetId: string; secondaryHref?: string; secondaryLabel?: string }) {
  const [hidden, setHidden] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.15 });
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);
  const go = () => {
    const t = document.getElementById(targetId);
    t?.scrollIntoView({ behavior: "smooth", block: "start" });
    const first = t?.querySelector<HTMLElement>("input, select, button");
    setTimeout(() => first?.focus({ preventScroll: true }), 400);
  };
  return (
    <div ref={ref} className={`${styles.cta} ${hidden ? styles.ctaHidden : ""}`} data-coach="action">
      {secondaryHref && (
        <a className="btn sm ghost" href={secondaryHref}>
          {secondaryLabel}
        </a>
      )}
      <button type="button" className={`btn primary ${styles.ctaMain}`} onClick={go}>
        {label}
      </button>
    </div>
  );
}
