"use client";

import { useT } from "@/i18n/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toggleWatch } from "@/app/offres/[id]/actions";
import styles from "./SwipeActions.module.css";

/**
 * A card pulled to the left, as in a mail app: three actions come out from
 * under it, Suivre · Comparer · Plus. The pull stops at their width; a long
 * pull past 70 % of the card fires the first one on its own. Touch only,
 * under 760 px; a desk has the « ··· ». The page keeps its own vertical
 * scroll: the first 8 px decide the direction.
 */
const REVEAL = 216;
const SLOP = 8;

export function SwipeActions({ id, onMore, children }: { id: string; onMore: () => void; children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const openX = useRef(0);
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();

  const follow = () =>
    start(async () => {
      const res = await toggleWatch(id, true);
      if (res.ok) {
        setToast(t("Ligne suivie : vous êtes prévenu à chaque changement"));
        window.setTimeout(() => setToast(""), 1600);
      } else router.push(`/connexion?next=${encodeURIComponent(`/offres/${id}`)}`);
    });

  useEffect(() => {
    const el = wrap.current;
    const c = card.current;
    if (!el || !c) return;
    let d: { x0: number; y0: number; lock: "h" | "v" | null; from: number; cur: number } | null = null;
    const set = (x: number, anim: boolean) => {
      c.classList.toggle(styles.anim, anim);
      c.style.transform = x ? `translateX(${x}px)` : "";
      el.classList.toggle(styles.open, x < 0);
    };
    const close = () => {
      openX.current = 0;
      set(0, true);
    };
    const onStart = (e: TouchEvent) => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      // A control starts no pull, unless the card is already open: then a slide back from anywhere closes it (a tap still acts).
      if (openX.current === 0 && (e.target as HTMLElement).closest("button, a, input, select")) return;
      d = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, lock: null, from: openX.current, cur: openX.current };
      c.classList.remove(styles.anim);
    };
    const onMove = (e: TouchEvent) => {
      if (!d) return;
      const dx = e.touches[0].clientX - d.x0;
      const dy = e.touches[0].clientY - d.y0;
      if (!d.lock) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        d.lock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (d.lock !== "h") {
        // Scrolling away from an open card closes it.
        if (d.from < 0) close();
        return;
      }
      if (e.cancelable) e.preventDefault();
      let x = Math.min(0, d.from + dx);
      if (x < -REVEAL) x = -REVEAL + (x + REVEAL) * 0.35; // a rubber band past the actions
      d.cur = x;
      set(x, false);
    };
    const onEnd = () => {
      if (!d) return;
      const done = d;
      d = null;
      if (done.lock !== "h") return;
      const w = el.clientWidth;
      if (done.cur < -w * 0.7) {
        // A long pull: the first action fires and the card comes back.
        set(-w, true);
        try {
          navigator.vibrate?.(10);
        } catch {
          // no haptics
        }
        window.setTimeout(() => {
          close();
          follow();
        }, 220);
        return;
      }
      // From an open card any slide back of 40 px closes; from a closed one, 40 % of the actions opens.
      openX.current = done.from < 0 ? (done.cur > -REVEAL + 40 ? 0 : -REVEAL) : done.cur < -REVEAL * 0.4 ? -REVEAL : 0;
      set(openX.current, true);
    };
    // A tap anywhere else closes an open card.
    const onDoc = (e: Event) => {
      if (openX.current < 0 && !el.contains(e.target as Node)) close();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("click", onDoc, true);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("click", onDoc, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = (what: "suivre" | "comparer" | "plus") => {
    openX.current = 0;
    if (card.current) {
      card.current.classList.add(styles.anim);
      card.current.style.transform = "";
    }
    wrap.current?.classList.remove(styles.open);
    if (what === "suivre") follow();
    else if (what === "comparer") router.push(`/comparer?a=${id}`);
    else onMore();
  };

  return (
    <div ref={wrap} className={styles.wrap}>
      <div className={styles.under} aria-hidden="true">
        <button type="button" className={styles.b1} onClick={() => act("suivre")} disabled={pending} tabIndex={-1}>
          <svg viewBox="0 0 24 24">
            <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
          </svg>
          {t("Suivre")}
        </button>
        <button type="button" className={styles.b2} onClick={() => act("comparer")} tabIndex={-1}>
          <svg viewBox="0 0 24 24">
            <path d="M4 6h7v12H4z M13 6h7v12h-7z" />
          </svg>
          {t("Comparer")}
        </button>
        <button type="button" className={styles.b3} onClick={() => act("plus")} tabIndex={-1}>
          <svg viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
          {t("Plus")}
        </button>
      </div>
      <div ref={card} className={styles.card}>
        {children}
      </div>
      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
