"use client";

import { useT } from "@/i18n/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./FilterFab.module.css";

/**
 * The floating filter button of a list: a round icon, bottom-left, shown
 * once the list's own toolbar has scrolled under the site header. It opens
 * the same controls in a sheet over the list, so the page keeps its place.
 * Lives on the body: the list may be sliding under a finger, the button must not.
 */
export function FilterFab({ watch, onClick, count, open }: { watch: React.RefObject<HTMLElement | null>; onClick: () => void; count: number; open: boolean }) {
  const t = useT();
  const [gone, setGone] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    // The site header covers the top 60 px: the toolbar counts as gone once it is under it.
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.bottom < 60), { rootMargin: "-60px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  if (!mounted) return null;
  const on = gone && !open;
  const label = count > 0 ? `${t("Filtrer et trier")} · ${count}` : t("Filtrer et trier");
  return createPortal(
    <button type="button" className={`${styles.fab} ${on ? styles.on : ""}`} onClick={onClick} aria-haspopup="dialog" aria-hidden={!on} tabIndex={on ? 0 : -1} aria-label={label} title={label}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      {count > 0 && <span className={styles.badge}>{count}</span>}
    </button>,
    document.body,
  );
}
