"use client";

import { useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LIST_ORDER_KEY, type ListMemory } from "@/components/ListNav";
import styles from "./SwipePager.module.css";

/**
 * On the phone a fiche is one card in the reader's list: a sideways drag
 * follows the finger, the neighbouring line peeks in, and past a third of the
 * screen (or with a flick) the page snaps to it. The arrows of the list bar
 * stay for those who prefer to tap. Under 760 px only; above, plain children.
 *
 * What the gesture leaves alone: the first 22 px of the left edge (the
 * system's back swipe), anything that scrolls sideways (tables, chip rows),
 * charts and sliders (they own their own drag), form fields, and a drag whose
 * first 10 px go up or down (the page scrolls).
 */
const EDGE = 22;
const SLOP = 10;
const COMMIT = 0.3; // of the width
const FLICK = 0.6; // px / ms
const ENTER_KEY = "guichet:swipeDir";
const HINT_KEY = "guichet:hint:swipe";

function ownsDrag(target: HTMLElement, root: HTMLElement): boolean {
  let el: HTMLElement | null = target;
  while (el && el !== root) {
    if (el.matches("svg, canvas, input, textarea, select, [role=slider], [data-noswipe], [role=dialog]")) return true;
    const cs = getComputedStyle(el);
    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
    el = el.parentElement;
  }
  return false;
}

export function SwipePager({ id, children }: { id: string; children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLDivElement>(null);
  // The reader's list, read once the page is on the client (the raw string is stable, parsing it is cheap).
  const raw = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(LIST_ORDER_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );
  const mem = useMemo(() => {
    try {
      const m = raw ? (JSON.parse(raw) as ListMemory) : null;
      const i = m ? m.ids.indexOf(id) : -1;
      return m && i >= 0 ? { mem: m, i } : null;
    } catch {
      return null;
    }
  }, [raw, id]);
  const [enter, setEnter] = useState<"left" | "right" | null>(null);
  const [hint, setHint] = useState(false);
  const prevId = mem && mem.i > 0 ? mem.mem.ids[mem.i - 1] : null;
  const nextId = mem && mem.i < mem.mem.ids.length - 1 ? mem.mem.ids[mem.i + 1] : null;
  const titleOf = (n: number) => mem?.mem.titles?.[n] ?? "";

  // Arriving from a swipe: slide in from the side the finger pointed to (on the next frame, so the animation starts on its first keyframe).
  useEffect(() => {
    let dir: string | null = null;
    try {
      dir = sessionStorage.getItem(ENTER_KEY);
      if (dir) sessionStorage.removeItem(ENTER_KEY);
    } catch {
      // storage unavailable
    }
    if (!dir) return;
    const raf = requestAnimationFrame(() => setEnter(dir === "1" ? "right" : "left"));
    return () => cancelAnimationFrame(raf);
  }, [id]);

  // The neighbours are fetched ahead so the snap lands on a ready page; the first time, a word about the gesture.
  useEffect(() => {
    if (!mem || !window.matchMedia("(max-width: 760px)").matches) return;
    if (prevId) router.prefetch(`/offres/${prevId}`);
    if (nextId) router.prefetch(`/offres/${nextId}`);
    try {
      if (!localStorage.getItem(HINT_KEY) && (prevId || nextId)) {
        localStorage.setItem(HINT_KEY, "1");
        const a = window.setTimeout(() => setHint(true), 900);
        const b = window.setTimeout(() => setHint(false), 4200);
        return () => {
          clearTimeout(a);
          clearTimeout(b);
        };
      }
    } catch {
      // storage unavailable
    }
  }, [mem, prevId, nextId, router]);

  useEffect(() => {
    const el = root.current;
    const card = cur.current;
    if (!el || !card || !mem) return;
    const peekPrev = el.querySelector<HTMLElement>(`.${styles.prev}`);
    const peekNext = el.querySelector<HTMLElement>(`.${styles.next}`);
    let d: { x0: number; y0: number; dx: number; lock: "h" | "v" | null; lastX: number; lastT: number; vx: number } | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const place = (dx: number, anim: boolean) => {
      const w = el.clientWidth;
      [card, peekPrev, peekNext].forEach((c) => c?.classList.toggle(styles.anim, anim && !reduced));
      card.style.transform = dx ? `translateX(${dx}px)` : "";
      if (peekPrev) peekPrev.style.transform = `translateX(${-w + dx}px)`;
      if (peekNext) peekNext.style.transform = `translateX(${w + dx}px)`;
    };
    const onStart = (e: TouchEvent) => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      const tch = e.touches[0];
      if (tch.clientX < EDGE || ownsDrag(e.target as HTMLElement, el)) return;
      d = { x0: tch.clientX, y0: tch.clientY, dx: 0, lock: null, lastX: tch.clientX, lastT: performance.now(), vx: 0 };
    };
    const onMove = (e: TouchEvent) => {
      if (!d) return;
      const tch = e.touches[0];
      const dx = tch.clientX - d.x0;
      const dy = tch.clientY - d.y0;
      if (!d.lock) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        d.lock = Math.abs(dx) > Math.abs(dy) * 1.5 ? "h" : "v";
        if (d.lock === "h") el.classList.add(styles.dragging);
      }
      if (d.lock !== "h") return;
      if (e.cancelable) e.preventDefault();
      const atEnd = (dx > 0 && !prevId) || (dx < 0 && !nextId);
      d.dx = atEnd ? dx * 0.25 : dx * 0.92; // a rubber band at the ends
      const now = performance.now();
      d.vx = (tch.clientX - d.lastX) / Math.max(1, now - d.lastT);
      d.lastX = tch.clientX;
      d.lastT = now;
      place(d.dx, false);
    };
    const onEnd = () => {
      if (!d) return;
      const done = d;
      d = null;
      if (done.lock !== "h") return;
      const w = el.clientWidth;
      const dir = done.dx < 0 ? 1 : -1;
      const target = dir > 0 ? nextId : prevId;
      const commit = target && (Math.abs(done.dx) > w * COMMIT || Math.abs(done.vx) > FLICK);
      if (commit) {
        place(-dir * w, true);
        try {
          sessionStorage.setItem(ENTER_KEY, String(dir));
          navigator.vibrate?.(8);
        } catch {
          // storage or haptics unavailable
        }
        window.setTimeout(() => router.push(`/offres/${target}`), reduced ? 0 : 200);
      } else {
        place(0, true);
        window.setTimeout(() => el.classList.remove(styles.dragging), 280);
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [mem, prevId, nextId, router]);

  return (
    <div ref={root} className={styles.pager}>
      <div ref={cur} className={`${styles.cur} ${enter === "right" ? styles.fromRight : enter === "left" ? styles.fromLeft : ""}`}>
        {children}
      </div>
      {mem && prevId && (
        <div className={`${styles.peek} ${styles.prev}`} aria-hidden="true">
          <span className={styles.peekPos}>
            {mem.i} / {mem.mem.ids.length}
          </span>
          <b>{titleOf(mem.i - 1)}</b>
        </div>
      )}
      {mem && nextId && (
        <div className={`${styles.peek} ${styles.next}`} aria-hidden="true">
          <span className={styles.peekPos}>
            {mem.i + 2} / {mem.mem.ids.length}
          </span>
          <b>{titleOf(mem.i + 1)}</b>
        </div>
      )}
      <div className={`${styles.hint} ${hint ? styles.hintOn : ""}`} role="status">
        {t(nextId ? "Glissez vers la gauche : la ligne suivante" : "Glissez vers la droite : la ligne précédente")}
      </div>
    </div>
  );
}
