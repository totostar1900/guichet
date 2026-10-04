"use client";

import { useT } from "@/i18n/client";
import { useEffect, useState, type RefObject } from "react";
import { usePasse } from "@/lib/ui/passe";
import styles from "./BackToTop.module.css";

/**
 * A round chevron in the bottom-right corner of a long page: shows once the
 * reader has scrolled most of a screen down, takes them back to the
 * top in one tap. On the phone it sits above the tab bar; on a desk, in the
 * corner of the window. Pages mount it themselves (lists, the Guide), never
 * the fiche, whose corner belongs to the action bar.
 */
/**
 * « watch » : LA BARRE DONT IL SUIT LE SORT, quand il y en a une.
 *
 * Sur une liste, ce bouton a un jumeau — celui qui ramène aux filtres — et
 * les deux doivent paraître AU MÊME MOMENT, sans quoi le coin de l'écran
 * change deux fois pendant qu'on descend. Avec « watch » les deux posent la
 * même question : la barre d'outils est-elle passée sous l'en-tête ?
 * Sans lui, sur une page qui n'a pas de barre — le Guide, une note de
 * marché —, il garde sa règle à lui : quatre cinquièmes d'écran défilés.
 */
export function BackToTop({ screens = 0.8, lift = false, watch }: { screens?: number; lift?: boolean; watch?: RefObject<HTMLElement | null> }) {
  const t = useT();
  const [on, setOn] = useState(false);
  const vide = { current: null } as RefObject<HTMLElement | null>;
  const passe = usePasse(watch ?? vide);
  useEffect(() => {
    let raf = 0;
    // Hysteresis: shown past the threshold, hidden again only well above it, so a phone's
    // shrinking address bar or a bounce at the edge does not make it flicker.
    const check = () => {
      raf = 0;
      const y = window.scrollY;
      const h = window.innerHeight;
      setOn((prev) => (prev ? y > h * 0.3 : y > h * screens));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [screens]);
  const visible = watch ? passe : on;
  return (
    <button
      type="button"
      className={`${styles.btn} ${visible ? styles.on : ""} ${lift ? styles.lift : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label={t("Revenir en haut")}
      title={t("Revenir en haut")}
      tabIndex={on ? 0 : -1}
      aria-hidden={!on}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 14l6-6 6 6" />
      </svg>
    </button>
  );
}
