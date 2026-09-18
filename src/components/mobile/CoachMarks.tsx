"use client";

import { useT } from "@/i18n/client";
import { useCallback, useEffect, useState } from "react";
import styles from "./CoachMarks.module.css";

/**
 * A spotlight walk-through: a few stops, each pointing at an element of the
 * page (`data-coach="…"`) with two sentences about *this* line. Shown once per
 * device per walk-through (localStorage), replayable from a button.
 */
export interface CoachStop {
  target: string; // data-coach value
  title: string;
  text: string;
}

const seenKey = (id: string) => `guichet:coach:${id}`;

export function CoachMarks({ id, stops, auto = true, replayLabel }: { id: string; stops: CoachStop[]; auto?: boolean; replayLabel?: string }) {
  const [n, setN] = useState<number | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const t = useT();

  const start = useCallback(() => setN(0), []);
  useEffect(() => {
    if (!auto) return;
    try {
      if (!localStorage.getItem(seenKey(id))) {
        const t = setTimeout(start, 700);
        return () => clearTimeout(t);
      }
    } catch {
      // storage unavailable
    }
  }, [auto, id, start]);

  const finish = () => {
    try {
      localStorage.setItem(seenKey(id), "1");
    } catch {
      // storage unavailable
    }
    setN(null);
    setBox(null);
  };

  // Measure the current target (after scrolling it into view) and follow it on resize / scroll.
  useEffect(() => {
    if (n == null) return;
    const stop = stops[n];
    if (!stop) return;
    const all = [...document.querySelectorAll<HTMLElement>(`[data-coach="${stop.target}"]`)];
    const visible = (e: HTMLElement) => getComputedStyle(e).display !== "none" && e.getClientRects().length > 0;
    const el = all.find((e) => getComputedStyle(e).position === "fixed" && visible(e)) ?? all.find(visible);
    if (!el) {
      // Nothing to point at on this layout: skip the stop.
      const skip = setTimeout(() => (n < stops.length - 1 ? setN(n + 1) : finish()), 0);
      return () => clearTimeout(skip);
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
    };
    const t = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, stops]);

  useEffect(() => {
    if (n == null) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  if (n == null) {
    return replayLabel ? (
      <button type="button" className={`btn sm ghost ${styles.replay}`} onClick={start}>
        {replayLabel}
      </button>
    ) : null;
  }
  const stop = stops[n];
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const below = box ? box.y + box.h + 12 : 80;
  const tipTop = box && below + 150 > vh ? Math.max(12, box.y - 160) : below;
  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label={t("Repères")}>
      <div className={styles.dim} style={box ? { clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${box.y}px, ${box.x}px ${box.y}px, ${box.x}px ${box.y + box.h}px, ${box.x + box.w}px ${box.y + box.h}px, ${box.x + box.w}px ${box.y}px, 0 ${box.y}px)` } : undefined} onClick={finish} />
      {box && <div className={styles.ring} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
      <div className={styles.tip} style={{ top: tipTop }}>
        <b>{stop.title}</b>
        <span>{stop.text}</span>
        <div className={styles.foot}>
          <small>
            {n + 1} / {stops.length}
          </small>
          <span className={styles.btns}>
            <button type="button" className="btn sm ghost" onClick={finish}>
              {t("Fermer")}
            </button>
            <button type="button" className="btn sm primary" onClick={() => (n < stops.length - 1 ? setN(n + 1) : finish())}>
              {t(n < stops.length - 1 ? "Suivant" : "Compris")}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
