"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TOUR } from "@/data/desk-guide";
import styles from "./mobile/CoachMarks.module.css";

/**
 * The desk's guided tour: the same spotlight as the fiche, but across pages.
 * The current stop lives in sessionStorage; the tour navigates itself to the
 * page of the next stop. Started from /desk/guide (or a « ? » button), never
 * automatically.
 */
const KEY = "guichet:desktour";

export function startDeskTour(router: { push: (href: string) => void }) {
  try {
    sessionStorage.setItem(KEY, "0");
  } catch {
    // storage unavailable
  }
  router.push(TOUR[0].path);
}

export function DeskTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [n, setN] = useState<number | null>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Read the stop from storage on every navigation.
  useEffect(() => {
    let v: string | null = null;
    try {
      v = sessionStorage.getItem(KEY);
    } catch {
      // storage unavailable
    }
    const t = setTimeout(() => setN(v == null ? null : Number(v)), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  const save = (i: number | null) => {
    try {
      if (i == null) sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, String(i));
    } catch {
      // storage unavailable
    }
  };
  const finish = () => {
    save(null);
    setN(null);
    setBox(null);
  };
  const go = (i: number) => {
    if (i >= TOUR.length) return finish();
    save(i);
    if (TOUR[i].path !== pathname) {
      setBox(null);
      router.push(TOUR[i].path);
    } else setN(i);
  };

  useEffect(() => {
    if (n == null) return;
    const stop = TOUR[n];
    if (!stop) {
      const t0 = setTimeout(finish, 0);
      return () => clearTimeout(t0);
    }
    if (stop.path !== pathname) {
      router.push(stop.path);
      return;
    }
    const el = [...document.querySelectorAll<HTMLElement>(`[data-coach="${stop.target}"]`)].find((e) => e.getClientRects().length > 0);
    if (!el) {
      const skip = setTimeout(() => go(n + 1), 0);
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
    const esc = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", esc);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      document.removeEventListener("keydown", esc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, pathname]);

  if (n == null || !TOUR[n] || TOUR[n].path !== pathname) return null;
  const stop = TOUR[n];
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const below = box ? box.y + box.h + 12 : 80;
  const tipTop = box && below + 150 > vh ? Math.max(12, box.y - 160) : below;
  return (
    <div className={styles.layer} role="dialog" aria-modal="true" aria-label="Visite guidée du desk">
      <div className={styles.dim} style={box ? { clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${box.y}px, ${box.x}px ${box.y}px, ${box.x}px ${box.y + box.h}px, ${box.x + box.w}px ${box.y + box.h}px, ${box.x + box.w}px ${box.y}px, 0 ${box.y}px)` } : undefined} onClick={finish} />
      {box && <div className={styles.ring} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
      <div className={styles.tip} style={{ top: tipTop }}>
        <b>{stop.title}</b>
        <span>{stop.text}</span>
        <div className={styles.foot}>
          <small>
            {n + 1} / {TOUR.length}
          </small>
          <span className={styles.btns}>
            <button type="button" className="btn sm ghost" onClick={finish}>
              Quitter
            </button>
            {n > 0 && (
              <button type="button" className="btn sm ghost" onClick={() => go(n - 1)}>
                Précédent
              </button>
            )}
            <button type="button" className="btn sm primary" onClick={() => go(n + 1)}>
              {n < TOUR.length - 1 ? "Suivant" : "Terminer"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/** The button that starts the tour. */
export function StartTour({ label = "Démarrer la visite guidée", className = "btn primary" }: { label?: string; className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => startDeskTour(router)}>
      {label}
    </button>
  );
}
