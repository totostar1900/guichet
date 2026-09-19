"use client";

import { useT } from "@/i18n/client";
import { useEffect, useState } from "react";
import styles from "./BackToTop.module.css";

/**
 * A round chevron in the bottom-right corner of a long page: shows once the
 * reader has scrolled more than a screen and a half, takes them back to the
 * top in one tap. On the phone it sits above the tab bar; on a desk, in the
 * corner of the window. Pages mount it themselves (lists, the Guide), never
 * the fiche, whose corner belongs to the action bar.
 */
export function BackToTop({ screens = 1.5 }: { screens?: number }) {
  const t = useT();
  const [on, setOn] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setOn(window.scrollY > window.innerHeight * screens);
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
  return (
    <button
      type="button"
      className={`${styles.btn} ${on ? styles.on : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label={t("Revenir en haut")}
      title={t("Revenir en haut")}
      tabIndex={on ? 0 : -1}
      aria-hidden={!on}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 14l6-6 6 6" />
      </svg>
    </button>
  );
}
