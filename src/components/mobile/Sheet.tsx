"use client";

import { useT } from "@/i18n/client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./Sheet.module.css";
import { useSheetPresence } from "./useSheetPresence";

/**
 * A sheet over the page: from the bottom on the phone (pulled down or
 * tapped beside to close), a small dialog in the middle on a desk. The page
 * keeps its scroll position underneath; that is the point of it. `tall`
 * fixes the sheet's height on the phone, so that switching tabs never moves
 * its edge; `foot` is a row that stays under the scrolling body.
 */
export function Sheet({ open, onClose, title, sub, children, wide, navy, dock, tabs, tall, foot }: { open: boolean; onClose: () => void; title: string; sub?: string; children: React.ReactNode; wide?: boolean; navy?: boolean; dock?: "top-right"; tabs?: { key: string; label: React.ReactNode; on: boolean; pick: () => void }[]; tall?: boolean; foot?: React.ReactNode }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { shown, visible } = useSheetPresence(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!mounted || !shown) return null;
  const onTouchStart = (e: React.TouchEvent) => {
    // Only a pull that starts on the handle or the title closes: the body may scroll.
    if (!(e.target as HTMLElement).closest(`.${styles.head}`)) return;
    drag.current = { y0: e.touches[0].clientY, dy: 0 };
    box.current?.classList.add(styles.drag);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !box.current) return;
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y0);
    box.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onTouchEnd = () => {
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    box.current?.classList.remove(styles.drag);
    if (box.current) box.current.style.transform = "";
    if (dy > 80) onClose();
  };
  return createPortal(
    <>
      <div className={`${styles.scrim} ${visible ? styles.scrimOpen : ""}`} onClick={onClose} aria-hidden="true" />
      <div ref={box} className={`${styles.sheet} ${wide ? styles.wide : ""} ${navy ? styles.navy : ""} ${dock === "top-right" ? styles.dockTopRight : ""} ${tall ? styles.tall : ""} ${visible ? styles.sheetOpen : ""}`} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className={styles.head}>
          <div className={styles.grab} />
          <div className={styles.titleRow}>
            <b>
              {title}
              {sub && <small className={styles.sub}>{sub}</small>}
            </b>
            <button type="button" className={styles.close} onClick={onClose} aria-label={t("Fermer")}>
              ×
            </button>
          </div>
          {tabs && (
            <div className={styles.tabs} role="tablist">
              {tabs.map((tb) => (
                <button key={tb.key} type="button" role="tab" aria-selected={tb.on} className={tb.on ? styles.tabOn : undefined} onClick={tb.pick}>
                  {tb.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {foot && <div className={styles.foot}>{foot}</div>}
      </div>
    </>,
    document.body,
  );
}
