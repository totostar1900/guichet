"use client";

import { useT } from "@/i18n/client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TermKey } from "@/lib/glossary";
import { getRegistry, lessonForTerm } from "@/lib/registry";
import styles from "./Info.module.css";

/**
 * A small « i » that opens a bubble on click (or Enter); it closes on a click
 * anywhere else or Escape — never on a mouse move, so its link stays reachable. The bubble is
 * rendered at the end of <body> in fixed position, so no scrolling table or
 * sticky header can clip it; it flips under the button when there is no room above.
 */
export function Info({ term, text, label, subtle }: { term?: TermKey; text?: string; label?: string; subtle?: boolean }) {
  const tr = useT();
  const t = term ? getRegistry().glossary[term] : undefined;
  const body = tr(text ?? t?.text ?? "");
  const title = label ? tr(label) : t ? ("long" in t && t.long ? `${tr(t.short)} — ${tr(t.long)}` : tr(t.short)) : "";
  const lesson = term ? lessonForTerm(term) : undefined;
  const btn = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean; arrow: number }>({ top: 0, left: 0, below: false, arrow: 0 });

  useLayoutEffect(() => {
    if (!open || !btn.current || !bubble.current) return;
    const place = () => {
      const b = btn.current!.getBoundingClientRect();
      const w = bubble.current!.offsetWidth;
      const h = bubble.current!.offsetHeight;
      const vw = window.innerWidth;
      const cx = b.left + b.width / 2;
      const left = Math.max(8, Math.min(vw - w - 8, cx - w / 2));
      const below = b.top - h - 10 < 8;
      const top = below ? b.bottom + 10 : b.top - h - 10;
      setPos({ top, left, below, arrow: Math.max(12, Math.min(w - 12, cx - left)) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btn.current && !btn.current.contains(t) && !bubble.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span className={styles.wrap}>
      <button
        ref={btn}
        type="button"
        className={`${styles.btn} ${subtle ? styles.subtle : ""} ${open ? styles.on : ""}`}
        aria-label={`${tr("Explication")} : ${title || tr("ce terme")}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        i
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span ref={bubble} role="tooltip" className={`${styles.bubble} ${pos.below ? styles.below : ""}`} style={{ top: pos.top, left: pos.left, ["--arrow" as string]: `${pos.arrow}px` }}>
            {title && <b>{title}</b>}
            {body}
            {lesson && (
              <a className={styles.more} href={`/info/${lesson.key}`}>
                {tr("En savoir plus")} : {tr(lesson.title)} →
              </a>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}

/** Label followed by its bubble — for table headers, KPI titles, chart titles. */
export function Term({ term, children }: { term: TermKey; children?: React.ReactNode }) {
  return (
    <span className={styles.term}>
      {children ?? getRegistry().glossary[term]?.short}
      <Info term={term} />
    </span>
  );
}
