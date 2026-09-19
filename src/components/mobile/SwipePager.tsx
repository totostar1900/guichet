"use client";

import { useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LIST_ORDER_KEY, rememberedListUrl, type ListMemory } from "@/components/ListNav";
import styles from "./SwipePager.module.css";

/**
 * On the phone a page has neighbours: a fiche is one card in the reader's
 * list (the next and previous lines), the Titres list has the Fonds list at
 * its side. A sideways drag follows the finger, the neighbour peeks in, and
 * past a third of the screen (or with a flick) the page snaps to it. Taps
 * (the arrows of the list bar, the tabs) stay for those who prefer them.
 * Under 760 px only; above, plain children. The first time, the page steps
 * aside on its own for a moment so the neighbour shows on the edge.
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

export interface Neighbour {
  href: string;
  title: string;
  pos: string; // "3 / 12", "Fonds · 6"
}

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

export function SwipePager({ id, prev: prevProp, next: nextProp, hintKey, hints, children }: { id?: string; prev?: Neighbour; next?: Neighbour; hintKey: string; hints: { next: string; prev: string }; children: React.ReactNode }) {
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
    if (!id) return null;
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
  const [nudge, setNudge] = useState(false);
  // The neighbours: from the list memory for a fiche, from the page otherwise.
  const prev: Neighbour | null = id ? (mem && mem.i > 0 ? { href: `/offres/${mem.mem.ids[mem.i - 1]}`, title: mem.mem.titles?.[mem.i - 1] ?? "", pos: `${mem.i} / ${mem.mem.ids.length}` } : null) : (prevProp ?? null);
  const next: Neighbour | null = id ? (mem && mem.i < mem.mem.ids.length - 1 ? { href: `/offres/${mem.mem.ids[mem.i + 1]}`, title: mem.mem.titles?.[mem.i + 1] ?? "", pos: `${mem.i + 2} / ${mem.mem.ids.length}` } : null) : (nextProp ?? null);
  // A list neighbour opens as it was last shown: same filters, same sort, and its own scroll comes back with it.
  const resolve = (n: Neighbour | null) => (n ? (id ? n.href : (rememberedListUrl(n.href) ?? n.href)) : null);
  const prevHref = resolve(prev);
  const nextHref = resolve(next);
  const ready = id ? Boolean(mem) : true;

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

  // The neighbours are fetched ahead so the snap lands on a ready page; the first time, the page steps aside and a word says why.
  useEffect(() => {
    if (!ready || !window.matchMedia("(max-width: 760px)").matches) return;
    if (prevHref) router.prefetch(prevHref);
    if (nextHref) router.prefetch(nextHref);
    try {
      const key = `guichet:hint:swipe:${hintKey}`;
      if (!localStorage.getItem(key) && (prevHref || nextHref)) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // The key is written when the word shows, not before: a cancelled run (a re-render, StrictMode) leaves a second chance.
        const timers = [
          window.setTimeout(() => {
            localStorage.setItem(key, "1");
            setHint(true);
          }, 900),
          window.setTimeout(() => setHint(false), 4200),
        ];
        if (!reduced) timers.push(window.setTimeout(() => setNudge(true), 800), window.setTimeout(() => setNudge(false), 1900));
        return () => timers.forEach(clearTimeout);
      }
    } catch {
      // storage unavailable
    }
  }, [ready, prevHref, nextHref, hintKey, router]);

  useEffect(() => {
    const el = root.current;
    const card = cur.current;
    if (!el || !card || !ready) return;
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
      const atEnd = (dx > 0 && !prevHref) || (dx < 0 && !nextHref);
      d.dx = atEnd ? dx * 0.25 : dx * 0.92; // a rubber band at the ends
      // Past the commit point the neighbour says so: let go and it opens.
      const w0 = el.clientWidth;
      peekNext?.classList.toggle(styles.ready, dx < 0 && Math.abs(d.dx) > w0 * COMMIT);
      peekPrev?.classList.toggle(styles.ready, dx > 0 && Math.abs(d.dx) > w0 * COMMIT);
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
      peekNext?.classList.remove(styles.ready);
      peekPrev?.classList.remove(styles.ready);
      const w = el.clientWidth;
      const dir = done.dx < 0 ? 1 : -1;
      const target = dir > 0 ? nextHref : prevHref;
      const commit = target && (Math.abs(done.dx) > w * COMMIT || Math.abs(done.vx) > FLICK);
      if (commit) {
        place(-dir * w, true);
        try {
          sessionStorage.setItem(ENTER_KEY, String(dir));
          navigator.vibrate?.(8);
        } catch {
          // storage or haptics unavailable
        }
        window.setTimeout(() => router.push(target), reduced ? 0 : 200);
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
  }, [ready, prevHref, nextHref, router]);

  // The step aside goes towards the next neighbour, or the previous one when there is no next.
  const nudgeDir = nudge ? (nextHref ? "next" : prevHref ? "prev" : null) : null;
  return (
    <div ref={root} className={styles.pager}>
      <div ref={cur} className={`${styles.cur} ${enter === "right" ? styles.fromRight : enter === "left" ? styles.fromLeft : ""} ${nudgeDir === "next" ? styles.nudgeNext : nudgeDir === "prev" ? styles.nudgePrev : ""}`}>
        {children}
      </div>
      {ready && prev && (
        <div className={`${styles.peek} ${styles.prev} ${nudgeDir === "prev" ? styles.nudgePrevIn : ""}`} aria-hidden="true">
          <span className={styles.peekPos}>← {prev.pos}</span>
          <b>{prev.title}</b>
          <span className={styles.peekGo}>{t("Relâchez pour ouvrir")}</span>
        </div>
      )}
      {ready && next && (
        <div className={`${styles.peek} ${styles.next} ${nudgeDir === "next" ? styles.nudgeNextIn : ""}`} aria-hidden="true">
          <span className={styles.peekPos}>{next.pos} →</span>
          <b>{next.title}</b>
          <span className={styles.peekGo}>{t("Relâchez pour ouvrir")}</span>
        </div>
      )}
      <div className={`${styles.hint} ${hint ? styles.hintOn : ""}`} role="status">
        {t(nextHref ? hints.next : hints.prev)}
      </div>
    </div>
  );
}
