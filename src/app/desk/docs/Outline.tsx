"use client";

import { useEffect, useRef, useState } from "react";
import { SectionLine, type SectionItem } from "@/components/SectionLine";
import styles from "./docs.module.css";

/**
 * « Sur cette page » : the open page's chapters, the one in view marked as
 * you scroll; the same list drives the chapter links of the left navigation.
 */
export function Outline({ chapters, label, meta, side = "right" }: { chapters: { id: string; title: string }[]; label: string; meta: React.ReactNode; side?: "left" | "right" }) {
  const active = useActiveChapter(chapters.map((c) => c.id));
  return (
    <nav className={side === "left" ? styles.outlineLeft : styles.outline} aria-label={label} data-coach="docs-outline">
      <span className={styles.label}>{label}</span>
      {chapters.map((c) => (
        <a key={c.id} href={`#${c.id}`} aria-current={c.id === active ? "true" : undefined}>
          {c.title}
        </a>
      ))}
      <div className={styles.meta}>{meta}</div>
    </nav>
  );
}

/** The chapter chips of the left column on a desk; on the phone, the « Sur cette page » line (SectionLine) instead. */
export function ChapterLinks({ chapters, label, pageTitle, line = true }: { chapters: SectionItem[]; label?: string; pageTitle?: string; line?: boolean }) {
  const active = useActiveChapter(chapters.map((c) => c.id));
  const row = useRef<HTMLDivElement>(null);
  // On the phone the chapters are one scrolling row: the chip being read slides into view as the page scrolls.
  useEffect(() => {
    const box = row.current;
    if (!box || !active || box.scrollWidth <= box.clientWidth) return;
    const el = box.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!el) return;
    const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);
  return (
    <>
      <div className={styles.chapters} ref={row}>
        {chapters.map((c) => (
          <a key={c.id} href={`#${c.id}`} aria-current={c.id === active ? "true" : undefined}>
            {c.title}
          </a>
        ))}
      </div>
      {line && <SectionLine chapters={chapters} active={active} label={label} pageTitle={pageTitle} />}
    </>
  );
}

function useActiveChapter(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    if (els.length === 0) return;
    const pick = () => {
      const line = Math.max(120, window.innerHeight * 0.3); // the chapter whose heading crossed the upper third is the one being read
      let cur = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      setActive(cur);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [ids]);
  return active;
}
