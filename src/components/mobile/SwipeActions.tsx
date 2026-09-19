"use client";

import { useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import styles from "./SwipeActions.module.css";

/**
 * A card under a finger, on the phone (under 760 px, touch only):
 *
 * · pulled to the left, two actions come out from under it, the two the
 *   « ··· » leaves out on purpose: « Déclarer » (the intention form of the
 *   fiche) and « Me rappeler » (a reminder before the closing, the same
 *   form with « rappel » chosen); a long pull past 70 % fires « Déclarer »;
 * · pulled to the right, the card turns over (a 3D turn): its light back
 *   (`back`) shows what the front keeps quiet, the four figures of the
 *   list and the ISIN.
 *
 * Leaving the actions is easy: slide back from anywhere (40 px is enough),
 * tap the « ‹ » handle, tap elsewhere, or scroll away. A turned card stays
 * turned: it comes back on its own flip icon (the same corner as the front), on a deliberate pull
 * to the left (half a turn), when another card is turned (one back at a
 * time), or once it scrolls out of sight; tapping around it leaves it be,
 * since the reader is reading it. The first 8 px decide between the page's scroll and the
 * card's pull.
 */
// One turned card at a time: turning another one puts the previous back on its front.
let turnedNow: (() => void) | null = null;
const REVEAL = 180;
const SLOP = 8;

export function SwipeActions({ id, back, backHead, onTurn, turnRef, children }: { id: string; back?: React.ReactNode; backHead?: React.ReactNode; onTurn?: (turned: boolean) => void; turnRef?: React.MutableRefObject<(() => void) | null>; children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const flip = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const backEl = useRef<HTMLDivElement>(null);
  const state = useRef<{ x: number; angle: number }>({ x: 0, angle: 0 }); // x < 0: actions open; angle 180: turned over
  const href = `/offres/${id}`;

  useEffect(() => {
    const el = wrap.current;
    const f = flip.current;
    if (!el || !f) return;
    const st = state.current;
    let d: { x0: number; y0: number; lock: "h" | "v" | null; mode: "actions" | "flip" | null; fromX: number; fromAngle: number; x: number; angle: number } | null = null;
    let sleepTimer = 0;
    // Live while a finger or an animation moves the card; plain again 300 ms after it rests.
    const wake = () => {
      window.clearTimeout(sleepTimer);
      el.classList.add(styles.live);
    };
    const rest = () => {
      window.clearTimeout(sleepTimer);
      sleepTimer = window.setTimeout(() => {
        if (st.x === 0 && st.angle === 0) el.classList.remove(styles.live);
      }, 300);
    };
    const paint = (anim: boolean) => {
      if (st.x === 0 && st.angle === 0) rest();
      f.classList.toggle(styles.anim, anim);
      f.style.transform = `${st.x ? `translateX(${st.x}px)` : ""} ${st.angle ? `rotateY(${st.angle}deg)` : ""}`.trim();
      el.classList.toggle(styles.open, st.x < 0);
      const turned = st.angle > 90;
      // The face that shows is chosen here, not left to backface-visibility (Safari drops it under overflow).
      if (front.current) front.current.style.visibility = turned ? "hidden" : "";
      if (backEl.current) backEl.current.style.visibility = turned ? "" : "hidden";
      if (el.classList.contains(styles.turned) !== turned) {
        el.classList.toggle(styles.turned, turned);
        onTurn?.(turned);
        // The wrapper and the turning box take the height of the face that shows, so the list flows around it
        // and the back (absolute in the turning box) is never clipped to the front. Measured on a change only.
        fit(turned);
      }
    };
    const fit = (turned: boolean) => {
      const h = turned ? backEl.current?.scrollHeight : front.current?.offsetHeight;
      el.style.height = h ? `${h}px` : "";
      f.style.height = turned && h ? `${h}px` : "";
    };
    // The back may grow once its curve arrives: the boxes follow.
    const ro = backEl.current ? new ResizeObserver(() => { if (st.angle > 90) fit(true); }) : null;
    if (backEl.current) for (const child of Array.from(backEl.current.children)) ro?.observe(child);
    // A turned card that scrolls out of view (under the header, below the tab bar) turns back by itself:
    // out of sight, back to its front. A card taller than the screen keeps a fair share before that.
    let watcher: IntersectionObserver | null = null;
    const watch = () => {
      watcher?.disconnect();
      const room = window.innerHeight - 60 - 56;
      const h = el.getBoundingClientRect().height || 1;
      const threshold = Math.min(0.6, (room / h) * 0.8);
      watcher = new IntersectionObserver(([e]) => { if (st.angle > 90 && (!e.isIntersecting || e.intersectionRatio < threshold)) close(); }, { rootMargin: "-60px 0px -56px 0px", threshold: [threshold] });
      watcher.observe(el);
    };
    const close = () => {
      st.x = 0;
      st.angle = 0;
      if (turnedNow === close) turnedNow = null;
      watcher?.disconnect();
      watcher = null;
      paint(true);
    };
    const turnByButton = () => {
      if (st.angle > 0) return;
      wake();
      st.x = 0;
      st.angle = 180;
      if (turnedNow && turnedNow !== close) turnedNow();
      turnedNow = close;
      window.setTimeout(watch, 500);
      paint(true);
    };
    if (turnRef) turnRef.current = turnByButton;
    const onStart = (e: TouchEvent) => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      const idle = st.x === 0 && st.angle === 0;
      // A control starts no pull while the card is at rest; once open or turned, a slide from anywhere brings it back (a tap still acts).
      if (idle && (e.target as HTMLElement).closest("button, a, input, select")) return;
      d = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, lock: null, mode: null, fromX: st.x, fromAngle: st.angle, x: st.x, angle: st.angle };
      wake();
      f.classList.remove(styles.anim);
    };
    const onMove = (e: TouchEvent) => {
      if (!d) return;
      const dx = e.touches[0].clientX - d.x0;
      const dy = e.touches[0].clientY - d.y0;
      if (!d.lock) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        d.lock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (d.lock === "h") d.mode = d.fromAngle > 0 ? "flip" : d.fromX < 0 ? "actions" : dx < 0 ? "actions" : back ? "flip" : null;
      }
      if (d.lock !== "h") {
        if (d.fromX < 0) close(); // scrolling away closes the actions; a turned card is being read, it stays
        d = null;
        return;
      }
      if (!d.mode) return;
      if (e.cancelable) e.preventDefault();
      const w = el.clientWidth;
      if (d.mode === "actions") {
        let x = Math.min(0, d.fromX + dx);
        if (x < -REVEAL) x = -REVEAL + (x + REVEAL) * 0.35; // a rubber band past the actions
        d.x = x;
        st.x = x;
      } else {
        // The turn follows the finger: a full width of pull is half a turn.
        d.angle = Math.max(0, Math.min(180, d.fromAngle + (dx / w) * 180));
        st.angle = d.angle;
      }
      paint(false);
    };
    const onEnd = () => {
      if (!d) return;
      const done = d;
      d = null;
      if (done.lock !== "h" || !done.mode) return;
      const w = el.clientWidth;
      if (done.mode === "actions") {
        if (done.x < -w * 0.7) {
          // A long pull: « Déclarer » fires and the card comes back.
          st.x = -w;
          paint(true);
          try {
            navigator.vibrate?.(10);
          } catch {
            // no haptics
          }
          window.setTimeout(() => {
            close();
            router.push(`${href}#intention`);
          }, 220);
          return;
        }
        // From an open card a slide back of 40 px closes; from a closed one, 40 % of the actions opens.
        st.x = done.fromX < 0 ? (done.x > -REVEAL + 40 ? 0 : -REVEAL) : done.x < -REVEAL * 0.4 ? -REVEAL : 0;
        st.angle = 0;
        paint(true);
        return;
      }
      // The turn: from the front, a quarter turn is enough; from the back, a deliberate half turn back.
      st.angle = done.fromAngle > 0 ? (done.angle < 90 ? 0 : 180) : done.angle > 90 ? 180 : 0;
      st.x = 0;
      if (st.angle === 180) {
        if (turnedNow && turnedNow !== close) turnedNow();
        turnedNow = close;
        window.setTimeout(watch, 350); // once the box has taken the back's height
      }
      paint(true);
    };
    // A tap elsewhere closes the actions, never the back (the reader is reading it).
    const onDoc = (e: Event) => {
      if (st.x < 0 && !el.contains(e.target as Node)) close();
    };
    const onBackTap = (e: Event) => {
      if (st.angle > 0 && (e.target as HTMLElement).closest("[data-recto]")) close();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    backEl.current?.addEventListener("click", onBackTap);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("click", onDoc, true);
    const backNode = backEl.current;
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      backNode?.removeEventListener("click", onBackTap);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("click", onDoc, true);
      ro?.disconnect();
      window.clearTimeout(sleepTimer);
      watcher?.disconnect();
      if (turnedNow === close) turnedNow = null;
      if (turnRef) turnRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, Boolean(back)]);

  const closeThen = (fn?: () => void) => {
    state.current.x = 0;
    state.current.angle = 0;
    if (flip.current) {
      flip.current.classList.add(styles.anim);
      flip.current.style.transform = "";
    }
    if (wrap.current) {
      if (wrap.current.classList.contains(styles.turned)) onTurn?.(false);
      wrap.current.classList.remove(styles.open, styles.turned);
      wrap.current.style.height = "";
    }
    if (flip.current) flip.current.style.height = "";
    fn?.();
  };

  return (
    <div ref={wrap} className={styles.wrap}>
      <div className={styles.under} aria-hidden="true">
        <button type="button" className={styles.handle} onClick={() => closeThen()} tabIndex={-1} aria-label={t("Fermer")}>
          ‹
        </button>
        <button type="button" className={styles.b1} onClick={() => closeThen(() => router.push(`${href}#intention`))} tabIndex={-1}>
          <svg viewBox="0 0 24 24">
            <path d="M4 5h16v14H4z M8 10h8 M8 14h5" />
          </svg>
          {t("Déclarer")}
        </button>
        <button type="button" className={styles.b2} onClick={() => closeThen(() => router.push(`${href}?intent=rappel#intention`))} tabIndex={-1}>
          <svg viewBox="0 0 24 24">
            <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20h4" />
          </svg>
          {t("Me rappeler")}
        </button>
      </div>
      <div ref={flip} className={styles.flip}>
        <div ref={front} className={styles.front}>
          {children}
        </div>
        {back && (
          <div ref={backEl} className={styles.back} aria-hidden="true" style={{ visibility: "hidden" }}>
            {backHead && <div className={styles.backHead}>{backHead}</div>}
            {back}
          </div>
        )}
      </div>
    </div>
  );
}
