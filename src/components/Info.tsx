"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, type TermKey } from "@/lib/glossary";
import styles from "./Info.module.css";

/**
 * A small « i » that opens a bubble on hover, focus or tap. The bubble is
 * rendered at the end of <body> in fixed position, so no scrolling table or
 * sticky header can clip it; it flips under the button when there is no room above.
 */
export function Info({ term, text, label }: { term?: TermKey; text?: string; label?: string }) {
  const t = term ? GLOSSARY[term] : undefined;
  const body = text ?? t?.text ?? "";
  const title = label ?? (t ? ("long" in t && t.long ? `${t.short} — ${t.long}` : t.short) : "");
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
      if (btn.current && !btn.current.contains(e.target as Node)) setOpen(false);
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
        className={`${styles.btn} ${open ? styles.on : ""}`}
        aria-label={`Explication : ${title || "ce terme"}`}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
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
      {children ?? GLOSSARY[term].short}
      <Info term={term} />
    </span>
  );
}
